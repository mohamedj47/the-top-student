
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, ensureApiKey } from "../utils/apiKeyManager";

/**
 * تنظيف النص من رموز LaTeX والماركداون والرموز الرياضية المعقدة للصوت
 * التزاماً بالمطالبة: يتجاهل LaTeX والرموز الرياضية تماماً
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    // إزالة كتل LaTeX الرياضية $$...$$ و $...$ ورموز الماركس داون
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^\$]+\$/g, ' ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' ')
    .replace(/\\\(.*?\\\)/g, ' ')
    .replace(/\\text\{.*?\}/g, ' ')
    .replace(/\\frac\{.*?\}\{.*?\}/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/#+/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/\|/g, ' . ')
    .replace(/-{3,}/g, ' ')
    // إزالة الرموز الرياضية
    .replace(/[><=\^\/\{\}\[\]]/g, ' ')
    // تحويل القوائم إلى فواصل
    .replace(/^\s*[\d•.-]+\s+/gm, ' . ')
    .replace(/[\n\r]/g, ' . ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

/**
 * محرك الصوت المحلي: Web Speech API فقط (يعمل أوفلاين 100%)
 */
export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) {
    onComplete?.();
    return;
  }
  
  window.speechSynthesis.cancel();
  const cleanText = sanitizeForSpeech(text);
  if (!cleanText) {
    onComplete?.();
    return;
  }

  const sentences = cleanText.split(/[.،]/).filter(s => s.trim().length > 1);
  let currentIdx = 0;

  const speakSentence = () => {
    if (currentIdx >= sentences.length) {
      onComplete?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[currentIdx]);
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.includes('ar-EG')) || 
                        voices.find(v => v.lang.includes('ar-SA')) || 
                        voices[0];

    utterance.voice = arabicVoice;
    utterance.lang = 'ar-SA';
    utterance.pitch = 1.0; 
    utterance.rate = 0.85; // سرعة هادئة

    utterance.onend = () => {
      currentIdx++;
      setTimeout(speakSentence, 100);
    };

    utterance.onerror = () => {
      currentIdx++;
      speakSentence();
    };

    window.speechSynthesis.speak(utterance);
  };

  if (sentences.length > 0) speakSentence();
  else onComplete?.();
}

/**
 * منع استخدام أي API خارجي للصوت
 */
export async function generateAiSpeech(text: string): Promise<null> {
  return null; 
}

/**
 * محرك توليد الإجابات: Local-First Data Resolution
 * تم التحديث لاستخدام gemini-3-pro-preview للمهام المعقدة والمواد العلمية
 */
export async function generateStreamResponse(
  userMessage: string,
  grade: GradeLevel,
  subject: Subject,
  history: Message[],
  onChunk: (text: string) => void,
  attachment?: Attachment,
  options?: GenerationOptions,
  deviceId?: string
): Promise<string> {
  
  // 1. فحص المحتوى المحلي أولاً (Static + Dynamic)
  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) {
    onChunk(staticMatch.answer);
    return staticMatch.answer;
  }

  const cachedMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (cachedMatch) {
    onChunk(cachedMatch.answer);
    return cachedMatch.answer;
  }

  // 2. معالجة حالة الأوفلاين
  if (!navigator.onLine) {
    const partialMatch = await DynamicQuestionBank.searchPartial(userMessage, subject);
    if (partialMatch) {
      const response = `(أوفلاين) - تم استرجاع شرح مشابه من ذاكرة جهازك:\n\n${partialMatch.answer}`;
      onChunk(response);
      return response;
    }
    const noConn = "أنت الآن في وضع الأوفلاين. يرجى الاتصال بالإنترنت لسؤال المعلم عن مواضيع جديدة، أو تصفح سجل دروسك الحالي.";
    onChunk(noConn);
    return noConn;
  }

  // 3. الاتصال بالـ API باستخدام gemini-3-pro-preview للمحتوى التعليمي المعقد
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const contents = history.slice(-5).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: "user", parts: [{ text: userMessage }] });

    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents,
      config: { 
        systemInstruction: `أنت المعلم الذكي المتخصص لطلاب مصر في مادة ${subject}. رد دائماً بجداول Markdown منظمة. ابدأ دائماً بكلمة تمام لتأكيد استيعابك للسؤال.`,
        temperature: 0.7 
      }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      fullText += (chunk.text || "");
      onChunk(cleanMathNotation(fullText));
    }

    // 4. التخزين الهجومي
    if (fullText.length > 10) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local_user');
    }

    return fullText;
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found.")) {
       if (typeof window !== 'undefined' && (window as any).aistudio) {
          (window as any).aistudio.openSelectKey();
       }
    }
    const partial = await DynamicQuestionBank.searchPartial(userMessage, subject);
    return partial ? partial.answer : "حدث خطأ في الاتصال، يرجى المحاولة لاحقاً.";
  }
}

export function searchInStaticBank(query: string) {
  if (!query) return null;
  const normalizedQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * فك تشفير Base64 (مطلوب لـ MessageBubble)
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * فك تشفير PCM Audio (مطلوب لـ MessageBubble)
 */
export async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * تقييم مستوى الطالب بناءً على المحادثة
 */
export async function evaluateStudentLevel(history: Message[], subject: Subject): Promise<PerformanceMetrics | null> {
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const context = history.map(msg => `${msg.sender === Sender.USER ? 'الطالب' : 'المعلم'}: ${msg.text}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `قم بتحليل مستوى الطالب في مادة ${subject} بناءً على المحادثة التالية واستخرج إحصائيات دقيقة في صيغة JSON:\n\n${context}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accuracy: { type: Type.NUMBER },
            comprehension: { type: Type.NUMBER },
            analyticalSkills: { type: Type.NUMBER },
            consistency: { type: Type.NUMBER },
            overallLevel: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            weakPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            strongPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["accuracy", "comprehension", "analyticalSkills", "consistency", "overallLevel", "recommendations", "weakPoints", "strongPoints"],
        }
      }
    });

    const result = response.text;
    return result ? JSON.parse(result) : null;
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found.")) {
       if (typeof window !== 'undefined' && (window as any).aistudio) {
          (window as any).aistudio.openSelectKey();
       }
    }
    console.error("Evaluation error:", error);
    return null;
  }
}
