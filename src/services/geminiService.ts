
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { ensureApiKey } from "../utils/apiKeyManager";
import { getCurriculumFor } from "../data/curriculum";

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

export function searchInStaticBank(query: string): StaticQuestion | null {
  if (!query) return null;
  const normalized = query.trim().toLowerCase();
  return questionsBank.find(q => 
    normalized.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalized)
  ) || null;
}

async function smartHybridOfflineSearch(query: string, subject: Subject, grade: GradeLevel): Promise<string | null> {
  const normQuery = query.toLowerCase().trim();

  // 1. البحث في الأسئلة التي تم تخزينها ديناميكياً (الإجابات السابقة للـ AI)
  const dynamicMatch = await DynamicQuestionBank.search(query, subject);
  if (dynamicMatch) {
    return `### [تم استرجاع الإجابة من الذاكرة المحلية] 💾\n\n${dynamicMatch.answer}\n\n*ملاحظة: هذه الإجابة تم حفظها سابقاً أثناء اتصالك بالإنترنت.*`;
  }

  // 2. البحث في المستودع المحلي الثابت (الموسوعة التعليمية)
  const repoMatch = localContentRepository.find(item => 
    item.subject === subject && 
    (normQuery.includes(item.topic.toLowerCase()) || item.topic.toLowerCase().includes(normQuery))
  );
  if (repoMatch) {
    return `### [محتوى أوفلاين متاح] 📚\n\n${repoMatch.explanation}\n\n**الخلاصة:** ${repoMatch.summary}`;
  }

  // 3. البحث في بنك الأسئلة
  const bankMatch = searchInStaticBank(query);
  if (bankMatch) return bankMatch.answer;

  return null;
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

export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\\[|\\\]|\\\(|\\\)/g, ' ')
    .replace(/\$+/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/#+/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/\|/g, ' . ')
    .replace(/-{3,}/g, ' ')
    .replace(/[><=\^\/\{\}\[\]]/g, ' ')
    .replace(/^\s*[\d•.-]+\s+/gm, ' . ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateGeminiSpeech(text: string): Promise<string | null> {
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `بأسلوب معلم محترف، انطق النص التالي بالعربية الواضحة: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
}

export async function generateElevenLabsSpeech(text: string): Promise<string | null> {
  try {
    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: sanitizeForSpeech(text),
        voiceId: "SAz9YHcvj6GT2YYXd8vo" 
      })
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  } catch (e) {
    return null;
  }
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(v => v.lang.startsWith('ar')) || voices.find(v => v.name.includes('Arabic'));
  if (arabicVoice) utterance.voice = arabicVoice;
  utterance.onend = () => onComplete?.();
  utterance.onerror = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
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
  
  // 1. فحص حالة الاتصال بالإنترنت فوراً
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline) {
    const offlineResult = await smartHybridOfflineSearch(userMessage, subject, grade);
    if (offlineResult) {
      onChunk(offlineResult);
      return offlineResult;
    }
    const msg = "عذراً، أنت في وضع الأوفلاين حالياً ولم أجد هذا السؤال في ذاكرتي المحلية. سيتم شرحه لك تلقائياً بمجرد عودة الاتصال وحفظه للمستقبل.";
    onChunk(msg);
    return msg;
  }

  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [{ text: userMessage }];
    if (attachment && attachment.type === 'image') {
      parts.push({
        inlineData: { mimeType: attachment.mimeType, data: attachment.data }
      });
    }

    const contents = history.slice(-5).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: msg.attachment && msg.sender === Sender.USER 
        ? [{ text: msg.text }, { inlineData: { mimeType: msg.attachment.mimeType, data: msg.attachment.data } }]
        : [{ text: msg.text }]
    }));

    contents.push({ role: "user", parts });

    let systemInstruction = `أنت "المعلم الذكي" لطلاب الثانوية بمصر لصف ${grade} مادة ${subject}. رد بلهجة مصرية تعليمية محفزة.`;
    
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      fullText += (chunk.text || "");
      onChunk(cleanMathNotation(fullText));
    }
    
    // 2. تخزين الإجابة في البنك الديناميكي لاستخدامها أوفلاين لاحقاً
    if (fullText.length > 20) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local_user');
    }
    
    return fullText;
  } catch (error) {
    // 3. محاولة أخيرة للبحث المحلي إذا فشل الطلب لأي سبب تقني
    const fallback = await smartHybridOfflineSearch(userMessage, subject, grade);
    if (fallback) {
      onChunk(fallback);
      return fallback;
    }
    return "حدث خطأ في الاتصال بالمعلم الذكي. تأكد من جودة الإنترنت.";
  }
}
لا
