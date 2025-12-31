
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

export function searchInStaticBank(query: string): StaticQuestion | null {
  const normQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normQuery.includes(q.question.toLowerCase()) || q.question.toLowerCase().includes(normQuery)
  ) || null;
}

async function smartHybridOfflineSearch(query: string, subject: Subject, grade: GradeLevel): Promise<string | null> {
  const normQuery = query.toLowerCase().trim();
  const repoMatch = localContentRepository.find(item => 
    item.subject === subject && 
    (normQuery.includes(item.topic.toLowerCase()) || item.topic.toLowerCase().includes(normQuery))
  );
  if (repoMatch) return `### [محتوى من الذاكرة المحلية] 📚\n\n${repoMatch.explanation}\n\n**💡 الخلاصة:** ${repoMatch.summary}`;
  const dynamicMatch = await DynamicQuestionBank.search(query, subject);
  if (dynamicMatch) return `### [إجابة محفوظة سابقاً] ✅\n\n${dynamicMatch.answer}`;
  const bankMatch = searchInStaticBank(query);
  if (bankMatch) return bankMatch.answer;
  const curriculum = getCurriculumFor(grade, subject);
  const allLessons = [...curriculum.term1, ...curriculum.term2];
  const lessonMatch = allLessons.find(l => normQuery.includes(l.toLowerCase()) || l.toLowerCase().includes(normQuery));
  if (lessonMatch) {
    return `### درس: ${lessonMatch} 📖\n\nهذا الدرس موجود في منهجك. حالياً أنت أوفلاين، سأقوم بشرحه بالتفصيل فور توفر الإنترنت وحفظه لك.`;
  }
  return null;
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
  
  if (!navigator.onLine && !attachment) {
    const offlineResult = await smartHybridOfflineSearch(userMessage, subject, grade);
    if (offlineResult) { onChunk(offlineResult); return offlineResult; }
    onChunk("يا بطل، أنت أوفلاين حالياً. سأحاول المساعدة بما لدي في الذاكرة.");
  }

  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // إعداد الأجزاء (Parts) لدعم الصور
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
    
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents,
      config: { 
        systemInstruction: `أنت "المعلم الذكي" لطلاب الثانوية بمصر لصف ${grade} مادة ${subject}.
        - حلل أي صورة مرفوعة واشرح ما فيها بدقة (سواء كانت مسألة، رسم بياني، أو خريطة).
        - رد بلهجة مصرية تعليمية محفزة.
        - استخدم جداول Markdown.`, 
        temperature: 0.7 
      }
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

export async function generateGeminiSpeech(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `بأسلوب معلم محترف: ${text}` }] }],
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

export async function generateElevenLabsSpeech(text: string): Promise<Blob | null> {
  try {
    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: "EXAVITQu4vr4xnSDxMaL" })
    });
    if (!response.ok) return null;
    return await response.blob();
  } catch (e) {
    return null;
  }
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.lang.includes('ar')) || voices[0];
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
}
