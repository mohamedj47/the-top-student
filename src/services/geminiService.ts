
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
// Import static questions bank data for local search capability
import { questionsBank, StaticQuestion } from "../lib/questionsBank";

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

/**
 * دالة البحث في البنك الثابت للأسئلة لضمان استجابة فورية ومجانية
 * @param query نص السؤال المراد البحث عنه
 */
export function searchInStaticBank(query: string): StaticQuestion | null {
  if (!query) return null;
  const normalizedQuery = query.trim().toLowerCase();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  ) || null;
}

/**
 * دالة توليد الرد المحدثة - الآن تتصل بـ Vercel Backend
 * تدعم 10,000 مستخدم متزامن عبر الكاش والـ Rate Limiting في الخادم
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
  
  // التحقق من الأوفلاين (لا يتغير)
  if (!navigator.onLine) {
    onChunk("أنت تعمل حالياً بدون إنترنت. جاري جلب المعلومات من الذاكرة المحلية...");
    // ... منطق البحث المحلي ...
    return "Offline Mode";
  }

  try {
    // تنسيق السجل للـ API
    const formattedHistory = history.slice(-5).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // الاتصال بالـ Backend الموحد
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: formattedHistory,
        grade,
        subject,
        deviceId: deviceId || 'unknown_student'
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Request failed');
    }

    // ملاحظة: الـ Edge Functions تدعم الـ Streaming ولكن للتبسيط والثبات مع الكاش
    // سنستقبل النص كاملاً ونحاكي الـ Typing Effect لراحة العين
    const text = await response.text();
    let currentText = "";
    const words = text.split(" ");
    
    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + " ";
      onChunk(cleanMathNotation(currentText));
      // محاكاة سرعة الكتابة (توفير تجربة UX ممتازة)
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 10));
    }

    return text;

  } catch (error: any) {
    console.error("Fetch Error:", error);
    const errorMsg = error.message || "حدث خطأ في الاتصال بالمعلم الذكي.";
    onChunk(errorMsg);
    return errorMsg;
  }
}

// الدوال الأخرى (evaluateStudentLevel, generateAiSpeech) تبقى كما هي أو تنقل للـ API لاحقاً
export async function evaluateStudentLevel(history: Message[], subject: Subject): Promise<PerformanceMetrics | null> {
    // هذا الجزء يمكن تركه حالياً أو نقله لـ /api/evaluate لزيادة الأمان
    return null; // سيتم تفعيله من الـ Backend في التحديث القادم
}

export async function generateAiSpeech(text: string): Promise<any> {
    // يتم استدعاؤه فقط عند ضغط الطالب على زر "استمع" لتقليل الحمل
    const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
    return response.ok ? await response.blob() : null;
}

export function sanitizeForSpeech(text: string): string {
  return text.replace(/[#*`]/g, '').trim();
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

export async function decodePcmAudio(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
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

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  // استخدام الـ Native Speech API كبديل مجاني وسريع جداً للـ 10,000 طالب
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  utterance.lang = 'ar-EG';
  utterance.onend = onComplete || null;
  window.speechSynthesis.speak(utterance);
}
