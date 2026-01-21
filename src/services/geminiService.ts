
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

// Search for a matching static question in the pre-defined bank
export function searchInStaticBank(query: string): StaticQuestion | null {
  if (!query) return null;
  const normalizedQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  ) || null;
}

/**
 * بودكاست المعلم ونهى - النسخة الكاملة
 * المعلم: أسلوب أسامة منير (Fenrir)
 * نهى: طالبة ذكية (Puck)
 */
export async function generatePodcastAudio(topic: string, content: string): Promise<string | null> {
  const availableKeys = getAvailableKeys();
  if (availableKeys.length === 0) return null;

  for (const apiKey of availableKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      // برومبت مكثف لضمان التفاعل بين الصوتين وتغطية كامل النص
      const prompt = `أنت صانع بودكاست إذاعي محترف. حول كامل محتوى درس "${topic}" إلى حوار بودكاست مصري "كامل وشامل" لا يترك أي تفصيلة.
        الحوار يجب أن يكون بين شخصيتين فقط:
        1. "المعلم": رجل ذو صوت هادئ، عميق، وقور، وأجش قوي (مثل أسلوب أسامة منير في الإذاعة)، يشرح بتمكن وهدوء.
        2. "نهى": فتاة طالبة ذكية، صوتها رقيق ومتحمس، تسأل عن التفاصيل وتلخص ما فهمته بذكاء.
        يجب أن يتناوب الصوتين (المعلم ونهى) في شرح كل نقطة وكل سطر في المحتوى التالي حتى النهاية:
        ${content}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Teacher', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                { speaker: 'Student', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
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
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
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
  return "عذراً يا بطل، جرب المحاولة مرة أخرى.";
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  const audioData = await generateGeminiSpeech(text);
  if (!audioData) {
    onComplete?.();
    return;
  }

  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new AudioContextClass({ sampleRate: 24000 });
    const buffer = await decodePcmAudio(decodeBase64(audioData), ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      onComplete?.();
      ctx.close();
    };
    source.start();
  } catch (error) {
    onComplete?.();
  }
}
