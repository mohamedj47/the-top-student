import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { markKeyAsFailed, getAvailableKeys } from "../utils/apiKeyManager";
import { getCurriculumStringForAI } from "../data/curriculum";

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

/**
 * دالة لتنظيف النص من علامات الماركدوان قبل النطق الصوتي
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/#{1,6}\s?/g, '') // remove markdown headers
    .replace(/\*\*/g, '')      // remove bold
    .replace(/\*/g, '')        // remove italic
    .replace(/__/g, '')        // remove underline
    .replace(/`/g, '')         // remove code
    .replace(/\$/g, '')        // remove math symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links, keep text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')    // remove images
    .replace(/- /g, ' ')       // remove list bullets
    .replace(/\n/g, ' ')       // replace newlines with spaces
    .trim();
}

/**
 * البحث في البنك الثابت للأسئلة المجهزة مسبقاً
 */
export function searchInStaticBank(query: string): StaticQuestion | null {
  const normalized = query.toLowerCase().trim();
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
  sampleRate: number,
  numChannels: number,
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
 * دالة توليد البودكاست - نسخة "عدم التوقف"
 * تحاول استخدام جميع المفاتيح المتاحة بالتتابع في حال حدوث خطأ 429
 */
export async function generatePodcastAudio(topic: string, content: string): Promise<string | null> {
  const availableKeys = getAvailableKeys();
  
  for (const apiKey of availableKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const safeContent = content.substring(0, 800);
      const prompt = `Create a short educational podcast dialogue in Egyptian Arabic about: ${topic}.
        Context: ${safeContent}
        Format:
        Kareem: [Excited teacher explaining a key tip]
        Noha: [Student summarizing the tip]
        Requirements:
        - Total text under 100 words.
        - Output MUST be audio.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Kareem', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                { speaker: 'Noha', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
              ]
            }
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (audioPart?.inlineData?.data) return audioPart.inlineData.data;
    } catch (e: any) {
      if (e?.message?.includes('429')) {
        markKeyAsFailed(apiKey);
        continue;
      }
    }
  }
  return null;
}

export async function generateGeminiSpeech(text: string): Promise<string | null> {
  const availableKeys = getAvailableKeys();
  for (const apiKey of availableKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text.substring(0, 500) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) return audioData;
    } catch (e: any) {
      if (e?.message?.includes('429')) markKeyAsFailed(apiKey);
    }
  }
  return null;
}

export async function generateStreamResponse(
  userMessage: string, grade: GradeLevel, subject: Subject, history: Message[],
  onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions, deviceId?: string
): Promise<string> {
  const studyLang = options?.language || StudyLanguage.ARABIC;
  const curriculumStr = getCurriculumStringForAI(grade, subject);
  
  const availableKeys = getAvailableKeys();
  
  for (const apiKey of availableKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [{ text: userMessage }];
      if (attachment?.data) {
        parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
      }
      const contents = history.slice(-5).map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: "user", parts });
      let languageContext = studyLang === StudyLanguage.ENGLISH ? "Explain in ENGLISH." : "اشرح بالعربية.";
      let sysInstr = `أنت معلم مادة ${subject}. ${languageContext} منهج ${grade}: ${curriculumStr}`;

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction: sysInstr, temperature: 0.7 }
      });

      let fullText = "";
      for await (const chunk of streamResponse) {
        fullText += (chunk.text || "");
        onChunk(cleanMathNotation(fullText));
      }
      
      if (fullText.length > 50) {
        DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local');
      }
      
      return fullText;
    } catch (error: any) {
      if (error?.message?.includes('429')) {
        markKeyAsFailed(apiKey);
        continue;
      }
    }
  }
  
  const dynamicMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (dynamicMatch) {
    const text = "### [رد من الذاكرة الاحتياطية] 💾\n\n" + dynamicMatch.answer;
    onChunk(text);
    return text;
  }

  return "عذراً يا بطل، جميع المحركات مجهدة حالياً. حاول مجدداً بعد ثوانٍ.";
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) return onComplete?.();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  utterance.lang = 'ar-EG';
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
}

export async function generateAiSpeech(text: string, onComplete?: () => void): Promise<void> {
  return streamSpeech(text, onComplete);
}

export const generateNeuralPart = generateGeminiSpeech;

export async function generatePodcastData(topic: string, content: string): Promise<{ audio: string | null }> {
  const audio = await generatePodcastAudio(topic, content);
  return { audio };
}

export function splitIntoChunks(text: string, maxLength: number = 200): string[] {
  const chunks: string[] = [];
  let current = text;
  while (current.length > 0) {
    if (current.length <= maxLength) {
      chunks.push(current);
      break;
    }
    let splitIdx = current.lastIndexOf(' ', maxLength);
    if (splitIdx === -1) splitIdx = maxLength;
    chunks.push(current.substring(0, splitIdx));
    current = current.substring(splitIdx).trim();
  }
  return chunks;
}

export async function generateFinalMemo(subject: Subject, grade: GradeLevel): Promise<string> {
  const availableKeys = getAvailableKeys();
  for (const apiKey of availableKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const curriculumStr = getCurriculumStringForAI(grade, subject);
      const prompt = `أنت خبير تعليمي. قم بإعداد "عصارة ليلة الامتحان" لمادة ${subject} للصف ${grade}.
        المنهج: ${curriculumStr}
        المحتوى المطلوب:
        1. أهم 20 نقطه لا يخرج عنها الامتحان.
        2. ملخص القوانين أو المفاهيم الأساسية.
        3. خريطة ذهنية سريعة (بالنص).
        4. نصيحة أخيرة للمتفوقين.
        اجعل التنسيق جميلاً باستخدام Markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      return response.text || "عذراً، تعذر توليد المذكرة حالياً.";
    } catch (e: any) {
      if (e?.message?.includes('429')) markKeyAsFailed(apiKey);
    }
  }
  return "عذراً، جميع المحركات مجهدة حالياً. حاول مرة أخرى في وقت لاحق.";
}
