
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { questionsBank, StaticQuestion } from "../lib/questionsBank";

/**
 * البحث في البنك المحلي لتقليل الضغط على الـ AI
 */
export function searchInStaticBank(query: string): StaticQuestion | null {
  if (!query) return null;
  const normalizedQuery = query.trim().toLowerCase();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  ) || null;
}

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

/**
 * دالة التوليد الرئيسية - تتواصل مع Vercel Backend فقط
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
  
  if (!navigator.onLine) {
    onChunk("أنت تعمل حالياً بدون إنترنت. جاري جلب المعلومات من الذاكرة المحلية...");
    return "Offline";
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: history.slice(-5).map(m => ({ role: m.sender === Sender.USER ? 'user' : 'model', parts: [{ text: m.text }] })),
        grade,
        subject,
        deviceId: deviceId || 'anonymous'
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Request failed');
    }

    const fullText = await response.text();
    
    // محاكاة الـ Streaming لتحسين تجربة المستخدم (Typing Effect)
    let current = "";
    const words = fullText.split(' ');
    for (let i = 0; i < words.length; i++) {
      current += words[i] + ' ';
      onChunk(cleanMathNotation(current));
      if (i % 2 === 0) await new Promise(r => setTimeout(r, 10)); 
    }

    return fullText;
  } catch (error: any) {
    const msg = error.message || "حدث خطأ في الاتصال بالخادم.";
    onChunk(msg);
    return msg;
  }
}

export async function evaluateStudentLevel(history: Message[], subject: Subject): Promise<PerformanceMetrics | null> {
  // التحليل يتم عبر الـ Backend لضمان الأمان
  return null; 
}

export async function generateAiSpeech(text: string): Promise<any> {
  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return response.ok ? { data: await response.blob() } : null;
}

export function sanitizeForSpeech(text: string): string {
  return text.replace(/[#*`]/g, '').trim();
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

/**
 * فك تشفير البيانات الصوتية بصيغة PCM باتباع إرشادات Gemini API
 * Fix: Added sampleRate and numChannels parameters to match usage in MessageBubble.tsx
 */
export async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
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

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  utterance.lang = 'ar-EG';
  utterance.onend = onComplete || null;
  window.speechSynthesis.speak(utterance);
}
