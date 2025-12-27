
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, ensureApiKey } from "../utils/apiKeyManager";

/**
 * تنظيف النص من رموز LaTeX والماركداون والرموز الرياضية المعقدة للصوت
 * التزاماً بالمطالبة: لا يقرأ رموز أو علامات، يتجاهل LaTeX والرموز الرياضية
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    // إزالة كتل LaTeX الرياضية $$...$$ و $...$
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^\$]+\$/g, ' ')
    // إزالة رموز LaTeX والماركداون الشائعة
    .replace(/\\\[|\\\]|\\\(|\\\)/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/#+/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/\|/g, ' . ')
    .replace(/-{3,}/g, ' ')
    // إزالة الرموز الرياضية التي قد تربك القارئ الآلي
    .replace(/[><=\^\/\{\}\[\]]/g, ' ')
    // تحويل القوائم إلى فواصل منطقية
    .replace(/^\s*[\d•.-]+\s+/gm, ' . ')
    // استبدال الرموز بمسافات
    .replace(/[\n\r]/g, ' . ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

/**
 * محرك الصوت المحلي: يعتمد حصرياً على Web Speech API
 * يعمل أوفلاين 100% وبصيغة تعليمية هادئة
 */
export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) {
    onComplete?.();
    return;
  }
  
  // إلغاء أي صوت حالي
  window.speechSynthesis.cancel();
  
  const cleanText = sanitizeForSpeech(text);
  if (!cleanText) {
    onComplete?.();
    return;
  }

  // تقسيم النص لجمل صغيرة لضمان استقرار المتصفح
  const sentences = cleanText.split(/[.،]/).filter(s => s.trim().length > 1);
  let currentIdx = 0;

  const speakSentence = () => {
    if (currentIdx >= sentences.length) {
      onComplete?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[currentIdx]);
    const voices = window.speechSynthesis.getVoices();
    
    // محاولة اختيار أفضل صوت عربي متاح على الجهاز
    const arabicVoice = voices.find(v => v.lang.includes('ar-EG')) || 
                        voices.find(v => v.lang.includes('ar-SA')) || 
                        voices.find(v => v.lang.startsWith('ar')) || 
                        voices[0];

    utterance.voice = arabicVoice;
    utterance.lang = 'ar-SA';
    utterance.pitch = 1.0; 
    utterance.rate = 0.85; // سرعة هادئة وتعليمية

    utterance.onend = () => {
      currentIdx++;
      setTimeout(speakSentence, 150);
    };

    utterance.onerror = () => {
      currentIdx++;
      speakSentence();
    };

    window.speechSynthesis.speak(utterance);
  };

  if (sentences.length > 0) {
    speakSentence();
  } else {
    onComplete?.();
  }
}

/**
 * تعطيل استخدام API خارجي للصوت التزاماً بالقيود الصارمة
 * يتم الاعتماد كلياً على Web Speech API المحلي
 */
export async function generateAiSpeech(text: string): Promise<{ data: string } | null> {
  return null; 
}

const SYSTEM_INSTRUCTION = `أنت "المعلم الذكي" لطلاب الثانوية العامة بمصر. تحدث بلهجة مصرية تعليمية هادئة. ردك دائماً في جداول Markdown. ابدأ بكلمة "تمام".`;

/**
 * محرك توليد الإجابات: Local-First Data Resolution & Aggressive Caching
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
  
  // 1. فحص البنك الثابت أولاً (Local-First Priority)
  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) {
    onChunk(staticMatch.answer);
    return staticMatch.answer;
  }

  // 2. فحص البنك الديناميكي المخزن محلياً (Local-First Priority)
  // يمنع إرسال أي Request إذا كانت البيانات متاحة محلياً
  const cachedMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (cachedMatch) {
    onChunk(cachedMatch.answer);
    return cachedMatch.answer;
  }

  // 3. التعامل مع وضع الأوفلاين (Offline Graceful Mode)
  if (!navigator.onLine) {
    // محاولة البحث عن أقرب إجابة مخزنة (Partial Match) لضمان بقاء التطبيق Usable
    const partialMatch = await DynamicQuestionBank.searchPartial(userMessage, subject);
    if (partialMatch) {
      const response = `(أنت تعمل أوفلاين - تم استرجاع شرح مشابه من ذاكرة جهازك):\n\n${partialMatch.answer}`;
      onChunk(response);
      return response;
    }
    const noConnectionMsg = "عذراً يا بطل، أنت أوفلاين الآن ولم أجد هذا السؤال في ذاكرتي المحلية. بمجرد عودة الإنترنت سأحفظ لك الإجابة فوراً.";
    onChunk(noConnectionMsg);
    return noConnectionMsg;
  }

  // 4. الانتقال للـ API فقط عند الضرورة وتوفر الإنترنت
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
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

    // 5. التخزين الهجومي التلقائي (Aggressive Caching)
    // يتم تخزين النتيجة محلياً تلقائياً بنفس المفتاح والسؤال
    if (fullText.length > 10) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local_user');
    }

    return fullText;
  } catch (error) {
    // Offline Graceful Mode: إذا فشل الطلب لا تظهر أخطاء تقنية، ابحث محلياً
    const partial = await DynamicQuestionBank.searchPartial(userMessage, subject);
    if (partial) {
      onChunk(`(تم استرجاع شرح مشابه من سجل مذاكرتك المحلي):\n\n${partial.answer}`);
      return partial.answer;
    }
    const errorMsg = "جاري محاولة استرجاع المعلومات من الذاكرة المحلية، يرجى إعادة المحاولة أو التحقق من الإنترنت.";
    onChunk(errorMsg);
    return errorMsg;
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

export async function evaluateStudentLevel(history: Message[], subject: Subject): Promise<PerformanceMetrics | null> {
  if (!navigator.onLine) return null;
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const chatLog = history.map(m => `${m.sender === Sender.USER ? 'الطالب' : 'المعلم'}: ${m.text}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ parts: [{ text: `حلل مستوى الطالب في مادة ${subject}: ${chatLog}` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "null");
  } catch (error) { return null; }
}

/**
 * تحويل base64 إلى Uint8Array مع معالجة الأخطاء
 */
export function decodeBase64(base64: string): Uint8Array {
  if (!base64) return new Uint8Array(0);
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("decodeBase64 failed", e);
    return new Uint8Array(0);
  }
}

export async function decodePcmAudio(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
  if (!data || data.length === 0) throw new Error("Empty audio data");
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
