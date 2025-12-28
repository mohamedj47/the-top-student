import {
  Message,
  GradeLevel,
  Subject,
  Attachment,
  GenerationOptions,
  Sender,
  PerformanceMetrics
} from "../types";

import { GoogleGenAI, Type } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank"; // النسخة الذكية القديمة
import { getApiKey, ensureApiKey } from "../utils/apiKeyManager";

/* =========================================================
   Utilities
========================================================= */

export function cleanMathNotation(text: string): string {
  return text ? text.replace(/\$/g, "") : "";
}

export function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate = 24000,
  channels = 1
): Promise<AudioBuffer> {
  const pcm = new Int16Array(data.buffer);
  const frameCount = pcm.length / channels;
  const buffer = ctx.createBuffer(channels, frameCount, sampleRate);

  for (let ch = 0; ch < channels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = pcm[i * channels + ch] / 32768;
    }
  }
  return buffer;
}

/* =========================================================
   Speech (Offline – Web Speech API)
========================================================= */

export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\\[|\\\]|\\\(|\\\)/g, " ")
    .replace(/\$+/g, " ")
    .replace(/\*+/g, " ")
    .replace(/#+/g, " ")
    .replace(/_+/g, " ")
    .replace(/\|/g, " . ")
    .replace(/-{3,}/g, " ")
    .replace(/[><=\^\/\{\}\[\]]/g, " ")
    .replace(/^\s*[\d•.-]+\s+/gm, " . ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function streamSpeech(
  text: string,
  onComplete?: () => void
): Promise<void> {
  if (!window.speechSynthesis) {
    onComplete?.();
    return;
  }

  window.speechSynthesis.cancel();
  const clean = sanitizeForSpeech(text);
  const sentences = clean.split(/[.،]/).filter(s => s.trim().length > 2);

  let idx = 0;

  const speakNext = () => {
    if (idx >= sentences.length) {
      onComplete?.();
      return;
    }

    const u = new SpeechSynthesisUtterance(sentences[idx]);
    const voices = window.speechSynthesis.getVoices();
    u.voice =
      voices.find(v => v.lang.includes("ar-EG")) ||
      voices.find(v => v.lang.includes("ar-SA")) ||
      voices[0];

    u.lang = "ar-SA";
    u.rate = 0.9;
    u.pitch = 1;

    u.onend = () => {
      idx++;
      setTimeout(speakNext, 150);
    };
    u.onerror = () => {
      idx++;
      speakNext();
    };

    window.speechSynthesis.speak(u);
  };

  if (sentences.length) speakNext();
  else onComplete?.();
}

/* =========================================================
   Static Bank
========================================================= */

export function searchInStaticBank(query: string) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  return questionsBank.find(
    x =>
      q.includes(x.question.toLowerCase()) ||
      x.question.toLowerCase().includes(q)
  );
}

/* =========================================================
   AI Core
========================================================= */

const SYSTEM_INSTRUCTION = `
أنت معلم ذكي لطلاب الثانوية العامة في مصر.
اشرح ببساطة وبلهجة مصرية تعليمية.
استخدم جداول Markdown.
ابدأ دائمًا بكلمة "تمام".
`;

export async function generateStreamResponse(
  userMessage: string,
  grade: GradeLevel,
  subject: Subject,
  history: Message[],
  onChunk: (text: string) => void,
  attachment?: Attachment,
  options?: GenerationOptions,
  deviceId = "local_user"
): Promise<string> {

  /* 1️⃣ Static */
  const staticHit = searchInStaticBank(userMessage);
  if (staticHit) {
    onChunk(staticHit.answer);
    return staticHit.answer;
  }

  /* 2️⃣ Dynamic (Exact / Smart) */
  const cached = await DynamicQuestionBank.search(userMessage, subject);
  if (cached) {
    onChunk(cached.answer);
    return cached.answer;
  }

  /* 3️⃣ Offline */
  if (!navigator.onLine) {
    const partial = await DynamicQuestionBank.searchPartial(userMessage, subject);
    if (partial) {
      const txt = `(أوفلاين) شرح قريب من سؤالك:\n\n${partial.answer}`;
      onChunk(txt);
      return txt;
    }

    const msg = "أنت حالياً أوفلاين. افتح الإنترنت لسؤال جديد.";
    onChunk(msg);
    return msg;
  }

  /* 4️⃣ Gemini */
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const contents = history.slice(-4).map(m => ({
      role: m.sender === Sender.USER ? "user" : "model",
      parts: [{ text: m.text }]
    }));
    contents.push({ role: "user", parts: [{ text: userMessage }] });

    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    });

    let full = "";
    for await (const chunk of stream) {
      full += chunk.text || "";
      onChunk(cleanMathNotation(full));
    }

    if (full.length > 10) {
      DynamicQuestionBank.add(
        userMessage,
        full,
        subject,
        grade,
        deviceId
      );
    }

    return full;

  } catch (e) {
    const fallback = await DynamicQuestionBank.searchPartial(userMessage, subject);
    const msg =
      fallback?.answer ||
      "حصلت مشكلة مؤقتة. حاول تاني بعد شوية.";
    onChunk(msg);
    return msg;
  }
}

/* =========================================================
   Student Evaluation
========================================================= */

export async function evaluateStudentLevel(
  history: Message[],
  subject: Subject
): Promise<PerformanceMetrics | null> {
  if (!navigator.onLine) return null;

  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const log = history
      .map(m => `${m.sender === Sender.USER ? "الطالب" : "المعلم"}: ${m.text}`)
      .join("\n");

    const res = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `قيم مستوى الطالب في ${subject} من الحوار التالي وأرجع JSON:\n${log}`,
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
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["accuracy", "overallLevel", "recommendations"]
        }
      }
    });

    return JSON.parse(res.text || "null");
  } catch {
    return null;
  }
}
