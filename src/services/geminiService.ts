
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { markKeyAsFailed, getApiKey } from "../utils/apiKeyManager";
import { getCurriculumStringForAI } from "../data/curriculum";
import { localContentRepository, questionsBank } from "../lib/questionsBank";

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\$/g, '')
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

export async function streamSpeech(text: string, onEnd?: () => void): Promise<void> {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-EG';
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

// Fix: Updated generateStreamResponse to accept deviceId as the 8th argument
export async function generateStreamResponse(
  userMessage: string, grade: GradeLevel, subject: Subject, history: Message[],
  onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions,
  deviceId?: string
): Promise<string> {
  const curriculumStr = getCurriculumStringForAI(grade, subject);
  
  // نظام المحاولة المتكررة عبر الـ 11 مفتاح
  let lastError = null;
  for (let i = 0; i < 3; i++) {
    const apiKey = getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [{ text: userMessage }];
      
      if (attachment?.data) {
        parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
      }

      const contents = history.slice(-10).map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: "user", parts });

      const sysInstr = `أنت "المعلم الخارق" الخبير لمادة ${subject} منهج ${grade}. 
      أجب بأسلوب شيق، تعليمي، وفخم جداً بلهجة مصرية محببة. 
      المنهج المعتمد: ${curriculumStr}.
      إذا طلبت رسومات بيانية، استخدم ASCII Art أو جداول منظمة.
      دائماً شجع الطالب في نهاية الرد.`;

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
      
      // تخزين أوفلاين فوري
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'student-global');
      
      return fullText;
    } catch (error: any) {
      lastError = error;
      if (error?.message?.includes('429')) {
        markKeyAsFailed(apiKey);
        continue;
      }
      break;
    }
  }

  // Fallback للأوفلاين إذا فشلت كل المفاتيح
  const cached = await DynamicQuestionBank.search(userMessage, subject);
  if (cached) {
    const text = `### [رد من الذاكرة الاحتياطية 💾]\n\n${cached.answer}`;
    onChunk(text);
    return text;
  }

  throw lastError || new Error("Connection failed after multiple attempts");
}

export async function generateGeminiSpeech(text: string): Promise<string | null> {
  const apiKey = getApiKey();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text.substring(0, 500) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
}

// Fix: Implemented missing searchInStaticBank function to look up pre-defined educational content
export function searchInStaticBank(query: string) {
  const normalizedQuery = query.toLowerCase().trim();
  
  const questionMatch = questionsBank.find(q => 
    q.question.toLowerCase().includes(normalizedQuery) || 
    normalizedQuery.includes(q.question.toLowerCase())
  );
  if (questionMatch) return questionMatch;

  const contentMatch = localContentRepository.find(c => 
    c.topic.toLowerCase().includes(normalizedQuery) || 
    normalizedQuery.includes(c.topic.toLowerCase())
  );
  return contentMatch || null;
}

// Fix: Implemented generatePodcastData using the Gemini TTS model
export async function generatePodcastData(subject: string, text: string): Promise<{ audio: string; script: string }> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `حول النص التالي إلى بودكاست تعليمي ممتع بين شخصيتين (كريم ونهى) بلهجة مصرية.
  الموضوع: ${subject}
  النص: ${text}
  
  قم بتوليد النص الصوتي (TTS) للحوار بالكامل.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  return { audio, script: "تم توليد البودكاست بنجاح." };
}

// Fix: Implemented generateFinalMemo to generate exam revision markdown
export async function generateFinalMemo(subject: Subject, grade: GradeLevel): Promise<string> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const curriculumStr = getCurriculumStringForAI(grade, subject);

  const prompt = `أنت خبير تعليمي. قم بكتابة "عصارة ليلة الامتحان" لمادة ${subject} لطلاب ${grade}.
  المنهج: ${curriculumStr}
  اجعل المذكرة مركزة جداً على أهم النقاط المتوقعة في الامتحان، بأسلوب منظم جداً (Markdown).
  استخدم جداول وخرائط ذهنية نصية.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: prompt }] }],
  });

  return response.text || "عذراً، لم نتمكن من توليد المذكرة حالياً.";
}
