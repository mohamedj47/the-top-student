
import {
  Message,
  GradeLevel,
  Subject,
  Attachment,
  GenerationOptions,
  Sender,
  StudyLanguage
} from "../types";

import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { markKeyAsFailed, getAvailableKeys } from "../utils/apiKeyManager";

/* ================== أدوات مساعدة ================== */

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, "");
}

export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\$/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/- /g, " ")
    .replace(/\n/g, " ")
    .trim();
}

/* ================== توليد حوار ================== */

export async function generateDialogueTranscript(
  subject: string,
  content: string
): Promise<string | null> {
  const keys = getAvailableKeys();

  for (const apiKey of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
حوّل المحتوى التالي إلى حوار تعليمي باللهجة المصرية بين معلم وطالب.
المعلم يشرح كل نقطة بالتفصيل والطالب يلخص أو يسأل.
لا تحذف أي معلومة.

Teacher:
Student:

المحتوى:
${content.substring(0, 3000)}
      `;

      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      return res.text || null;
    } catch (e: any) {
      if (e?.message?.includes("429")) markKeyAsFailed(apiKey);
    }
  }

  return null;
}

/* ================== توليد صوت ================== */

export async function generatePodcastAudio(
  transcript: string
): Promise<string | null> {
  const keys = getAvailableKeys();
  if (!keys.length) return null;

  for (const apiKey of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: transcript.substring(0, 2000) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: "Teacher", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
                { speaker: "Student", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
              ]
            }
          }
        }
      });

      const audio = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      return audio?.inlineData?.data || null;
    } catch (e: any) {
      if (e?.message?.includes("429")) markKeyAsFailed(apiKey);
    }
  }

  return null;
}

/* ================== بنك الأسئلة ================== */

export function searchInStaticBank(query: string): StaticQuestion | null {
  const q = query.toLowerCase().trim();
  return (
    questionsBank.find(
      item =>
        q.includes(item.question.toLowerCase()) ||
        item.question.toLowerCase().includes(q)
    ) || null
  );
}

/* ================== تحويل الصوت ================== */

export function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  channels: number
): Promise<AudioBuffer> {
  const pcm = new Int16Array(data.buffer);
  const frames = pcm.length / channels;
  const buffer = ctx.createBuffer(channels, frames, sampleRate);

  for (let ch = 0; ch < channels; ch++) {
    const out = buffer.getChannelData(ch);
    for (let i = 0; i < frames; i++) {
      out[i] = pcm[i * channels + ch] / 32768;
    }
  }

  return buffer;
}

/* ================== Gemini Speech ================== */

export async function generateGeminiSpeech(
  text: string
): Promise<string | null> {
  const keys = getAvailableKeys();

  for (const apiKey of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text.substring(0, 500) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
          }
        }
      });

      const audio = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audio) return audio;
    } catch (e: any) {
      if (e?.message?.includes("429")) markKeyAsFailed(apiKey);
    }
  }

  return null;
}

/* ================== الرد المتدفق ================== */

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
  const language =
    options?.language === StudyLanguage.ENGLISH
      ? "Explain in English."
      : "اشرح بالعربية.";

  const keys = getAvailableKeys();

  for (const apiKey of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const contents = history.slice(-5).map(m => ({
        role: m.sender === Sender.USER ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      const parts: any[] = [{ text: userMessage }];
      if (attachment?.data) {
        parts.push({
          inlineData: { mimeType: attachment.mimeType, data: attachment.data }
        });
      }

      contents.push({ role: "user", parts });

      const stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: `أنت معلم مادة ${subject}. ${language}`,
          temperature: 0.7
        }
      });

      let full = "";
      for await (const chunk of stream) {
        full += chunk.text || "";
        onChunk(cleanMathNotation(full));
      }

      if (full.length > 50) {
        DynamicQuestionBank.add(
          userMessage,
          full,
          subject,
          grade,
          deviceId || "local"
        );
      }

      return full;
    } catch (e: any) {
      if (e?.message?.includes("429")) markKeyAsFailed(apiKey);
    }
  }

  const cached = await DynamicQuestionBank.search(userMessage, subject);
  if (cached) {
    const txt = "### [رد من الذاكرة الاحتياطية] 💾\n\n" + cached.answer;
    onChunk(txt);
    return txt;
  }

  return "عذراً، النظام مشغول حالياً. حاول بعد قليل.";
}

/* ================== TTS محلي ================== */

export async function streamSpeech(
  text: string,
  onComplete?: () => void
): Promise<void> {
  if (!window.speechSynthesis) return onComplete?.();

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  u.lang = "ar-EG";
  u.onend = () => onComplete?.();
  window.speechSynthesis.speak(u);
}
