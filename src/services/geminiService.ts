
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

// إضافة وظيفة البحث في البنك الثابت لإصلاح خطأ الاستيراد في app/page.tsx
export function searchInStaticBank(query: string): StaticQuestion | null {
  if (!query) return null;
  const normalized = query.trim().toLowerCase();
  return questionsBank.find(q => 
    normalized.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalized)
  ) || null;
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
    console.error("Gemini TTS Failed:", e);
    return null;
  }
}

export async function generateElevenLabsSpeech(text: string): Promise<string | null> {
  try {
    // نستخدم API داخلي لتجنب تسريب المفتاح في الكلاينت
    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: sanitizeForSpeech(text),
        voiceId: "SAz9YHcvj6GT2YYXd8vo" // معرف صوت عربي احترافي يشبه Kore
      })
    });
    
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("ElevenLabs TTS Failed:", e);
    return null;
  }
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  
  // التأكد من اختيار صوت عربي حصراً لمنع الصوت الإنجليزي
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(v => v.lang.startsWith('ar')) || voices.find(v => v.name.includes('Arabic'));
  
  if (arabicVoice) {
    utterance.voice = arabicVoice;
  }
  
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
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [{ text: userMessage }];
    if (attachment && attachment.type === 'image') {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
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
    
    if (userMessage.includes("ليلة الامتحان") || userMessage.includes("مراجعة")) {
      systemInstruction = `أنت مدرس خبير في مادة ${subject} للصف ${grade} – المنهج المصري. مراجعة ليلة الامتحان شاملة وسريعة.`;
    }
    
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
    
    if (fullText.length > 30) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local_user');
    }
    
    return fullText;
  } catch (error) {
    return "حدث خطأ في الاتصال. حاول مرة أخرى.";
  }
}
