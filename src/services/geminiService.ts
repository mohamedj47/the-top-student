
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { ensureApiKey, getApiKey, markKeyAsFailed } from "../utils/apiKeyManager";
import { getCurriculumStringForAI } from "../data/curriculum";

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
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
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
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    return null;
  }
}

export function searchInStaticBank(query: string): StaticQuestion | undefined {
  const normalizedQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  );
}

async function smartHybridOfflineSearch(query: string, subject: Subject, grade: GradeLevel, lang: StudyLanguage): Promise<string | null> {
  const normalizedQuery = query.toLowerCase().trim();
  
  const dynamicMatch = await DynamicQuestionBank.search(query, subject);
  if (dynamicMatch) {
    let prefix = "### [مسترجع من الذاكرة المحلية] 💾\n\n";
    if (dynamicMatch.category === 'exam') prefix = "### [نموذج امتحان مخزن] 📝\n\n";
    if (dynamicMatch.category === 'summary') prefix = "### [ملخص ليلة الامتحان المخزن] ✨\n\n";
    return prefix + dynamicMatch.answer;
  }
  
  const repoMatch = localContentRepository.find(item => 
    item.subject === subject && item.language === lang &&
    (normalizedQuery.includes(item.topic.toLowerCase()) || item.topic.toLowerCase().includes(normalizedQuery))
  );
  
  if (repoMatch) {
    return `### [محتوى مخزن] 📚\n\n${repoMatch.explanation}\n\n**الخلاصة:** ${repoMatch.summary}`;
  }
  return null;
}

export function sanitizeForSpeech(text: string): string {
  return text.replace(/[*#$_\-\\|]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function generateStreamResponse(
  userMessage: string, grade: GradeLevel, subject: Subject, history: Message[],
  onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions, deviceId?: string
): Promise<string> {
  
  const studyLang = options?.language || StudyLanguage.ARABIC;
  const offlineResult = await smartHybridOfflineSearch(userMessage, subject, grade, studyLang);
  const curriculumStr = getCurriculumStringForAI(grade, subject);

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const currentKey = getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const parts: any[] = [{ text: userMessage }];
      if (attachment?.data) {
        parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
      }

      const contents = history.slice(-5).map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: "user", parts });

      let sysInstr = `أنت "دكتور مادة ${subject}" للمرحلة الثانوية المصرية 2026.
تذكر أن اللغة الألمانية واللغة الفرنسية هما لغتان أجنبيتان ثانيتان اختياريتان، ويجب شرح القواعد والمفردات والمواقف بدقة متناهية.
- المنهج الحالي لـ ${grade} في هذه المادة هو:
${curriculumStr}
التزم بأسلوب "عصارة ليلة الامتحان" المختصر والذكي جداً لضمان تفوق الطالب.`;

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
        await DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local');
      }

      return fullText;

    } catch (error: any) {
      if (error?.message?.includes('429')) markKeyAsFailed(currentKey);
      attempts++;
      if (attempts >= maxAttempts) {
        if (offlineResult) { onChunk(offlineResult); return offlineResult; }
        return "عذراً يا بطل، يبدو أن هناك ضغطاً على السيرفر. جرب مرة أخرى.";
      }
    }
  }
  return "...";
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
