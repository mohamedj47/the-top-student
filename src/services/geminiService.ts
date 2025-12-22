
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, rotateApiKey, ensureApiKey } from "../utils/apiKeyManager";

const SYSTEM_INSTRUCTION = `
أنت "المعلم الذكي"، خبير تعليمي متخصص في منهج الثانوية العامة المصرية.
- هدفك: تبسيط المعلومة للطالب المتفوق للوصول للدرجة النهائية.
- أسلوبك: ودود، محفز، ومحترف.
- القواعد:
  1. استخدم جداول Markdown للمقارنات دائماً.
  2. اجعل الرد منظماً باستخدام النقاط (Bullet points).
  3. ركز على "نواتج التعلم" وأفكار الامتحانات الوزارية.
  4. لغة الحوار: عربية فصحى بسيطة بلمسة مصرية محفزة.
`;

/**
 * تنظيف النص المتقدم للقراءة الصوتية
 * يزيل الرموز التي طلبها المستخدم (الشرطات، علامات الاستفهام، إلخ)
 */
export const sanitizeForSpeech = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, ' ') // إزالة الأكواد البرمجية
    .replace(/`.*?`/g, ' ')
    .replace(/\[.*?\]\(.*?\)/g, ' ') // إزالة الروابط
    .replace(/[*#_~]/g, ' ') // إزالة علامات التنسيق
    .replace(/[-—]/g, ' ') // إزالة الشرطات (طلب المستخدم)
    .replace(/[?؟!]/g, ' ') // إزالة علامات الاستفهام والتعجب (طلب المستخدم)
    .replace(/\(/g, ' ، ') // استبدال الأقواس بوقفة قصيرة
    .replace(/\)/g, ' ، ')
    .replace(/\n+/g, ' . ') // استبدال السطور بنقطة نهاية جملة
    .replace(/\s+/g, ' ') // توحيد المسافات
    .trim();
};

/**
 * توليد صوت عالي الجودة باستخدام Gemini TTS (صوت Kore)
 */
export const generateAiSpeech = async (text: string): Promise<string | null> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const cleanText = sanitizeForSpeech(text);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `اقرأ النص التالي بأسلوب تعليمي مشجع: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData || null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};

export const searchInStaticBank = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  );
};

export const generateStreamResponse = async (
  userMessage: string,
  grade: GradeLevel,
  subject: Subject,
  history: Message[],
  onChunk: (text: string) => void,
  attachment?: Attachment,
  options?: GenerationOptions,
  deviceId?: string
): Promise<string> => {
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

  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const modelName = options?.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const contents = history.slice(-6).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model' as any,
      parts: [{ text: msg.text }]
    }));

    const currentParts: any[] = [];
    if (attachment) {
      currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    }
    currentParts.push({ text: userMessage });
    contents.push({ role: "user", parts: currentParts });

    const streamResponse = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      const text = chunk.text || "";
      fullText += text;
      onChunk(fullText);
    }

    if (fullText.length > 20) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'unknown');
    }

    return fullText;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    rotateApiKey();
    const fallbackMsg = "عذراً، المعلم الذكي مشغول قليلاً حالياً. يمكنك تجربة سؤال آخر من بنك الأسئلة المتاح في القائمة الجانبية.";
    onChunk(fallbackMsg);
    return fallbackMsg;
  }
};

/**
 * المحرك الصوتي المحلي (Fallback)
 */
export const streamSpeech = async (
  text: string, 
  onComplete?: () => void
): Promise<void> => {
  if (!window.speechSynthesis) {
    onComplete?.();
    return;
  }

  window.speechSynthesis.cancel();
  const cleanText = sanitizeForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  utterance.lang = 'ar-SA';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const arVoice = voices.find(v => v.lang.includes('ar-EG')) || voices.find(v => v.lang.includes('ar'));
  if (arVoice) utterance.voice = arVoice;

  utterance.onend = () => onComplete?.();
  utterance.onerror = () => onComplete?.();

  window.speechSynthesis.speak(utterance);
};
