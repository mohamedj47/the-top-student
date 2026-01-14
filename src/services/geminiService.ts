import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { markKeyAsFailed, getAvailableKeys } from "../utils/apiKeyManager";
import { getCurriculumStringForAI } from "../components/data/curriculum";

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/#{1,6}\s?/g, '') 
    .replace(/\*\*/g, '')      
    .replace(/\*/g, '')        
    .replace(/__/g, '')        
    .replace(/`/g, '')         
    .replace(/\$/g, '')        
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') 
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')    
    .replace(/- /g, ' ')       
    .replace(/\n/g, ' ')       
    .trim();
}

/**
 * توليد نص حوار البودكاست عبر AI لضمان جودة تربوية عالية
 */
export async function generateDialogueTranscript(subject: string, content: string): Promise<string | null> {
  const availableKeys = getAvailableKeys();
  for (const apiKey of availableKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Convert this educational content into a line-by-line Egyptian Arabic Teacher-Student dialogue. 
        The Teacher explains every single detail, and the Student summarizes or asks for clarification. 
        DO NOT SKIP ANY INFORMATION. Cover from start to end.
        Format:
        Teacher: [Text]
        Student: [Text]
        Content: ${content.substring(0, 3000)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      return response.text || null;
    } catch (e: any) {
      if (e?.message?.includes('429')) markKeyAsFailed(apiKey);
    }
  }
  return null;
}

/**
 * توليد صوت البودكاست بناءً على حوار نصي جاهز
 */
export async function generatePodcastAudio(transcript: string): Promise<string | null> {
  const availableKeys = getAvailableKeys();
  if (availableKeys.length === 0) return null;

  for (const apiKey of availableKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: transcript.substring(0, 2000) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Teacher', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                { speaker: 'Student', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
              ]
            }
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      return audioPart?.inlineData?.data || null;
    } catch (e: any) {
      if (e?.message?.includes('429')) {
        markKeyAsFailed(apiKey);
        continue;
      }
    }
  }
  return null;
}

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
