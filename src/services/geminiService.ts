import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { ensureApiKey, getApiKey, markKeyAsFailed } from "../utils/apiKeyManager";

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
  const dynamicMatch = await DynamicQuestionBank.search(query, subject);
  if (dynamicMatch) return `### [تم استرجاع الإجابة من الذاكرة المحلية] 💾\n\n${dynamicMatch.answer}`;
  
  const repoMatch = localContentRepository.find(item => 
    item.subject === subject && query.toLowerCase().includes(item.topic.toLowerCase())
  );
  if (repoMatch) return `### [محتوى أوفلاين متاح] 📚\n\n${repoMatch.explanation}`;

  const bankMatch = searchInStaticBank(query);
  if (bankMatch) return bankMatch.answer;

  return null;
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

// Fixed decodePcmAudio to correctly handle buffer offsets and frame count
export async function decodePcmAudio(data: Uint8Array, ctx: AudioContext, sampleRate = 24000, numChannels = 1): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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
  return text.replace(/[*#$_\-\\|]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Generate speech using Gemini's native text-to-speech model.
 */
export async function generateGeminiSpeech(text: string): Promise<string | null> {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    const currentKey = getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `بأسلوب معلم، انطق بوضوح: ${text}` }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e: any) {
      if (e?.message?.includes('429')) markKeyAsFailed(currentKey);
      attempts++;
    }
  }
  return null;
}

// Added the missing generateElevenLabsSpeech function required by MessageBubble.tsx
export async function generateElevenLabsSpeech(text: string): Promise<string | null> {
  try {
    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("ElevenLabs error:", error);
    return null;
  }
}

export async function generateStreamResponse(
  userMessage: string, grade: GradeLevel, subject: Subject, history: Message[],
  onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions, deviceId?: string
): Promise<string> {
  
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (isOffline) {
    const res = await smartHybridOfflineSearch(userMessage, subject, grade);
    if (res) { onChunk(res); return res; }
    return "أنت أوفلاين حالياً.";
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const currentKey = getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const parts: any[] = [{ text: userMessage }];
      if (attachment?.type === 'image') parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });

      const contents = history.slice(-3).map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: "user", parts });

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction: `أنت معلم مصري لصف ${grade} مادة ${subject}.`, temperature: 0.7 }
      });

      let fullText = "";
      for await (const chunk of streamResponse) {
        fullText += (chunk.text || "");
        onChunk(cleanMathNotation(fullText));
      }
      
      if (fullText.length > 20) DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local');
      return fullText;

    } catch (error: any) {
      console.error(`Attempt ${attempts + 1} failed with key ${currentKey.substring(0, 8)}`);
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        markKeyAsFailed(currentKey);
      }
      attempts++;
      if (attempts >= maxAttempts) {
        const fallback = await smartHybridOfflineSearch(userMessage, subject, grade);
        if (fallback) { onChunk(fallback); return fallback; }
        return "عذراً، النظام مضغوط جداً حالياً. حاول ثانية بعد دقيقة.";
      }
    }
  }
  return "خطأ غير متوقع.";
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) return onComplete?.();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.lang.startsWith('ar')) || null;
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
}
