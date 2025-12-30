
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { questionsBank, StaticQuestion } from "../lib/questionsBank";

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
    onChunk("أنت الآن في وضع الأوفلاين. سأبحث لك في الذاكرة المحلية...");
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

    // محاولة قراءة النص أولاً ثم تحويله لـ JSON
    const rawText = await response.text();
    let fullText = "";

    try {
      const data = JSON.parse(rawText);
      fullText = data.text || data.error || "";
    } catch (e) {
      // إذا لم يكن JSON، فمن المحتمل أنه نص خام
      fullText = rawText;
    }
    
    if (!response.ok) {
      onChunk(fullText || 'خطأ في الاتصال بالخادم');
      throw new Error(fullText);
    }

    if (!fullText) {
        onChunk("عذراً، لم أستطع العثور على إجابة، يرجى إعادة المحاولة.");
        return "";
    }

    // تأثير الكتابة التدريجي
    let current = "";
    const words = fullText.split(' ');
    for (let i = 0; i < words.length; i++) {
      current += words[i] + ' ';
      onChunk(cleanMathNotation(current));
      // سرعة متغيرة حسب طول الإجابة
      const delay = words.length > 100 ? 2 : 10;
      if (i % 3 === 0) await new Promise(r => setTimeout(r, delay)); 
    }

    return fullText;
  } catch (error: any) {
    const msg = error.message || "حدث خطأ غير متوقع. جرب مرة أخرى.";
    onChunk(msg);
    return msg;
  }
}

export async function evaluateStudentLevel(history: Message[], subject: Subject): Promise<PerformanceMetrics | null> {
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
