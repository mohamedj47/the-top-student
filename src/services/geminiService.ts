
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { AudioCache } from "../lib/audioCache";
import { getApiKey, ensureApiKey } from "../utils/apiKeyManager";

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
 * تنظيف النص للصوت: إزالة LaTeX والرموز الرياضية والماركداون تماماً
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    // إزالة رموز LaTeX والماركداون الشائعة
    .replace(/\\\[|\\\]|\\\(|\\\)/g, ' ')
    .replace(/\$+/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/#+/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/\|/g, ' . ')
    .replace(/-{3,}/g, ' ')
    // إزالة الرموز الرياضية التي قد تربك القارئ الآلي
    .replace(/[><=\^\/\{\}\[\]]/g, ' ')
    // تحويل القوائم إلى فواصل منطقية
    .replace(/^\s*[\d•.-]+\s+/gm, ' . ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SYSTEM_INSTRUCTION = `
أنت "المعلم الذكي" لطلاب الثانوية العامة بمصر.
تحدث بلهجة مصرية تعليمية هادئة واحترافية.
ردك يجب أن يكون منظماً في جداول Markdown دائماً لسهولة الفهم.
ابدأ بكلمة "تمام" دائماً.
`;

export async function evaluateStudentLevel(
  history: Message[],
  subject: Subject
): Promise<PerformanceMetrics | null> {
  if (!navigator.onLine) return null;
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const chatLog = history.map(m => `${m.sender === Sender.USER ? 'الطالب' : 'المعلم'}: ${m.text}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{
        parts: [{
          text: `حلل سجل الحوار التالي لمادة ${subject} وقيم مستوى الطالب بتنسيق JSON: ${chatLog}`
        }]
      }],
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
          required: ["accuracy", "overallLevel", "recommendations"]
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) { return null; }
}

/**
 * استخدام Web Speech API المحلي حصراً لضمان العمل أوفلاين
 */
export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const cleanText = sanitizeForSpeech(text);
  const sentences = cleanText.split(/[.،]/).filter(s => s.trim().length > 2);
  let currentSentence = 0;
  
  const speakNext = () => {
    if (currentSentence >= sentences.length) { onComplete?.(); return; }
    const utterance = new SpeechSynthesisUtterance(sentences[currentSentence]);
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.includes('ar-EG')) || voices.find(v => v.lang.includes('ar-SA')) || voices[0];
    utterance.voice = arabicVoice;
    utterance.lang = 'ar-SA';
    utterance.pitch = 1.0; 
    utterance.rate = 0.9; // سرعة تعليمية هادئة
    utterance.onend = () => { currentSentence++; setTimeout(speakNext, 200); };
    utterance.onerror = () => { currentSentence++; speakNext(); };
    window.speechSynthesis.speak(utterance);
  };

  if (sentences.length > 0) speakNext();
  else onComplete?.();
}

/**
 * تعطيل Voice API الخارجي لضمان الخصوصية والعمل أوفلاين
 */
export async function generateAiSpeech(text: string): Promise<{ data: string; source: 'gemini' | 'cache' } | null> {
  return null; // Force fallback to streamSpeech (Web Speech API)
}

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
  // 1. فحص البنك الثابت أولاً (Local Priority)
  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) { 
    onChunk(staticMatch.answer); 
    return staticMatch.answer; 
  }

  // 2. فحص البنك الديناميكي المخزن محلياً (Cache Priority)
  const cachedMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (cachedMatch) { 
    onChunk(cachedMatch.answer); 
    return cachedMatch.answer; 
  }

  // 3. التحقق من الإنترنت قبل طلب الـ API
  if (!navigator.onLine) {
    const offlineMsg = "عذراً يا بطل، أنت الآن في وضع الأوفلاين. جاري البحث في ذاكرتي المحلية عن أقرب إجابة لموضوع سؤالك...";
    onChunk(offlineMsg);
    // محاولة البحث عن جزء من السؤال في الكاش
    const partialMatch = await DynamicQuestionBank.searchPartial(userMessage, subject);
    if (partialMatch) {
        onChunk(`(تم العثور على شرح مشابه من سجل مذاكرتك):\n\n${partialMatch.answer}`);
        return partialMatch.answer;
    }
    return offlineMsg;
  }

  try {
    await ensureApiKey();
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const contents = history.slice(-3).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: "user", parts: [{ text: userMessage }] });
    
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      fullText += (chunk.text || "");
      onChunk(cleanMathNotation(fullText));
    }

    // حفظ هجومي للنتيجة لضمان توفرها أوفلاين في المرة القادمة
    if (fullText.length > 10) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local_user');
    }
    return fullText;
  } catch (error) {
    const errorFallback = "جاري محاولة استرجاع الشرح من الذاكرة المحلية بسبب ضغط على الخادم أو مشكلة في الاتصال...";
    onChunk(errorFallback);
    const partial = await DynamicQuestionBank.searchPartial(userMessage, subject);
    return partial ? partial.answer : errorFallback;
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
