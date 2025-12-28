
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
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
 * استخدام Web Speech API المحلي حصراً لضمان العمل أوفلاين كحل أخير
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
    utterance.rate = 0.9;
    utterance.onend = () => { currentSentence++; setTimeout(speakNext, 200); };
    utterance.onerror = () => { currentSentence++; speakNext(); };
    window.speechSynthesis.speak(utterance);
  };

  if (sentences.length > 0) speakNext();
  else onComplete?.();
}

/**
 * ElevenLabs Fallback Logic (Arabic Female Teacher)
 */
async function generateElevenLabsSpeech(text: string): Promise<{ data: string; source: 'elevenlabs' } | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  // Stable Arabic Female Voice ID (e.g., "Bella" or a custom one)
  // Using a common high-quality female voice ID
  const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Example: Rachel/Bella style

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: sanitizeForSpeech(text),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.85,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) throw new Error('ElevenLabs API failed');

    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return { data: base64, source: 'elevenlabs' };
  } catch (e) {
    console.error("ElevenLabs Fallback Failed:", e);
    return null;
  }
}

/**
 * الإجراء الرئيسي لتوليد الصوت بالذكاء الاصطناعي
 * 1. محاولة استخدام Gemini TTS (صوت Kore)
 * 2. الفشل يحول إلى ElevenLabs (صوت معلمة)
 * 3. الفشل النهائي يعود لـ null ليقوم المكون باستخدام Web Speech API
 */
export async function generateAiSpeech(text: string): Promise<{ data: string; source: 'gemini' | 'elevenlabs' | 'cache' } | null> {
  if (typeof window === 'undefined') return null; // Safe for Vercel SSR

  try {
    // 1. محاولة Gemini 2.5 Flash TTS (Primary)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say cheerfully and clearly: ${sanitizeForSpeech(text)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return { data: base64Audio, source: 'gemini' };
    }

    // 2. إذا لم يتوفر Gemini، ننتقل لـ ElevenLabs
    const elevenLabsResult = await generateElevenLabsSpeech(text);
    if (elevenLabsResult) return { data: elevenLabsResult.data, source: 'elevenlabs' };

    return null;
  } catch (error) {
    console.warn("AI Speech Generation failed, checking fallbacks...", error);
    // محاولة ElevenLabs عند أي خطأ في Gemini
    return await generateElevenLabsSpeech(text);
  }
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
  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) { 
    onChunk(staticMatch.answer); 
    return staticMatch.answer; 
  }

  const cachedMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (cachedMatch) { 
    onChunk(cachedMatch.answer); 
    return cachedMatch.answer; 
  }

  if (!navigator.onLine) {
    const offlineMsg = "عذراً يا بطل، أنت الآن في وضع الأوفلاين. جاري البحث في ذاكرتي المحلية عن أقرب إجابة لموضوع سؤالك...";
    onChunk(offlineMsg);
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
