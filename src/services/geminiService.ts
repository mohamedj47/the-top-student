
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { ensureApiKey, getApiKey, markKeyAsFailed } from "../utils/apiKeyManager";
import { getCurriculumFor } from "../data/curriculum";

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

/**
 * البحث الهجين الذكي (Offline/Hybrid Search)
 * يبحث في الذاكرة الديناميكية والمستودع الثابت مع مراعاة اللغة
 */
async function smartHybridOfflineSearch(query: string, subject: Subject, grade: GradeLevel, lang: StudyLanguage): Promise<string | null> {
  const normalizedQuery = query.toLowerCase().trim();
  
  // 1. البحث في الذاكرة الديناميكية (الأسئلة السابقة)
  const dynamicMatch = await DynamicQuestionBank.search(query, subject);
  if (dynamicMatch) return `### [Memory Recall] 💾\n\n${dynamicMatch.answer}`;
  
  // 2. البحث في المستودع الثابت (مع فلترة باللغة المختارة)
  const repoMatch = localContentRepository.find(item => 
    item.subject === subject && 
    item.language === lang &&
    (normalizedQuery.includes(item.topic.toLowerCase()) || item.topic.toLowerCase().includes(normalizedQuery))
  );
  
  if (repoMatch) {
    return `### [Local Content - ${lang.toUpperCase()}] 📚\n\n${repoMatch.explanation}\n\n**Summary:** ${repoMatch.summary}\n\n**Key Points:** ${repoMatch.keyPoints}`;
  }

  // 3. البحث في فهرس المنهج
  const curriculum = getCurriculumFor(grade, subject);
  const allLessons = [...curriculum.term1, ...curriculum.term2];
  const lessonMatch = allLessons.find(lesson => normalizedQuery.includes(lesson.toLowerCase().split(':')[0]));
  
  if (lessonMatch) {
    const msg = lang === StudyLanguage.ARABIC 
      ? `هذا الدرس موجود في منهجك. يرجى الاتصال بالإنترنت للحصول على الشرح الكامل.` 
      : `This lesson is part of your curriculum. Please connect to the internet for a full AI explanation in ${lang.toUpperCase()}.`;
    return `### [Curriculum Info] 📖\n\n**${lessonMatch}**\n\n${msg}`;
  }

  return null;
}

export function searchInStaticBank(query: string): StaticQuestion | null {
  const normalizedQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  ) || null;
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

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

export async function generateGeminiSpeech(text: string): Promise<string | null> {
  let attempts = 0;
  const maxAttempts = 2;
  while (attempts < maxAttempts) {
    const currentKey = getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
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

/**
 * إضافة دالة توليد الصوت باستخدام ElevenLabs كخيار احترافي بديل
 * يتم استدعاؤها عبر الـ API الداخلي للتعامل مع المفاتيح بسرية
 */
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
    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  } catch (e) {
    console.error("ElevenLabs Proxy Error:", e);
    return null;
  }
}

export async function generateStreamResponse(
  userMessage: string, grade: GradeLevel, subject: Subject, history: Message[],
  onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions, deviceId?: string
): Promise<string> {
  
  const studyLang = options?.language || StudyLanguage.ARABIC;
  const offlineResult = await smartHybridOfflineSearch(userMessage, subject, grade, studyLang);

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const currentKey = getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const parts: any[] = [{ text: userMessage }];
      if (attachment?.type === 'image') parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });

      const contents = history.slice(-5).map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: "user", parts });

      // تعليمات صارمة للغة الدراسة
      let sysInstr = `أنت معلم مصري تشرح المنهج باللغة العربية.`;
      if (studyLang === StudyLanguage.ENGLISH) sysInstr = `You are an Egyptian teacher for a Language School. Explaining Grade ${grade} - ${subject}. ALWAYS use English scientific terms and explain in English. Be professional and supportive. If a test is requested, provide 10 MCQs in English.`;
      if (studyLang === StudyLanguage.FRENCH) sysInstr = `Tu es un professeur égyptien pour écoles de langues. Explique ${subject} en Français. Utilise les termes scientifiques français. Crée des QCM si demandé.`;
      if (studyLang === StudyLanguage.GERMAN) sysInstr = `Du bist ein Lehrer für Sprachschulen in Ägypten. Erkläre ${subject} auf Deutsch. Nutze deutsche Fachbegriffe. Erstelle MC-Fragen bei Bedarf.`;

      const isExam = userMessage.toLowerCase().includes('test') || userMessage.toLowerCase().includes('exam') || userMessage.includes('امتحان');
      const modifier = isExam ? " (Format: Mock MCQ Exam with answers at the end)" : " (Format: Clear explanation with tables/bullet points)";

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction: `${sysInstr} ${modifier}` }
      });

      let fullText = "";
      for await (const chunk of streamResponse) {
        fullText += (chunk.text || "");
        onChunk(cleanMathNotation(fullText));
      }
      
      if (fullText.length > 20) DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local');
      return fullText;

    } catch (error: any) {
      if (error?.message?.includes('429')) markKeyAsFailed(currentKey);
      attempts++;
      if (attempts >= maxAttempts) {
        if (offlineResult) { onChunk(offlineResult); return offlineResult; }
        return studyLang === StudyLanguage.ARABIC ? "عذراً، النظام مضغوط. حاول ثانية." : "System busy. Please try again in a minute.";
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
  // تحديد الصوت بناءً على النص (محاولة بسيطة)
  if (text.match(/[a-zA-Z]/)) {
     utterance.voice = voices.find(v => v.lang.startsWith('en')) || null;
  } else {
     utterance.voice = voices.find(v => v.lang.startsWith('ar')) || null;
  }
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
}
