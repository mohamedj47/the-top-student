
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { localContentRepository, questionsBank } from "../lib/questionsBank";
import { getApiKey, rotateApiKey, getAvailableKeysCount } from "../utils/apiKeyManager";

const SYSTEM_INSTRUCTION = `
أنت "المعلم الذكي"، خبير في منهج الثانوية العامة المصرية. 
- استخدم جداول Markdown للمقارنات.
- بسط المعلومة كأنك في حصة مراجعة نهائية.
- ممنوع استخدام رموز العملات ($).
`;

/**
 * دالة التنفيذ مع التدوير التلقائي الفوري
 * إذا فشل مفتاح، يتم تجربة المفتاح التالي فوراً في نفس الطلب
 */
const executeWithRetry = async <T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> => {
  const maxAttempts = Math.max(getAvailableKeysCount(), 1);
  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("لم يتم العثور على مفاتيح API");
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      
      if (isRateLimit && attempt < maxAttempts - 1) {
        console.warn(`Key ${attempt + 1} limited, rotating...`);
        rotateApiKey();
        continue; // جرب المفتاح التالي فوراً
      }
      throw error;
    }
  }
  throw lastError;
};

/**
 * دالة للبحث في البنك الثابت
 */
// Fix: Added searchInStaticBank to handle local search requests
export const searchInStaticBank = (query: string) => {
  const normalized = query.toLowerCase();
  return questionsBank.find(q => normalized.includes(q.question.toLowerCase()) || q.question.toLowerCase().includes(normalized));
};

/**
 * دالة مساعدة لتحويل النص لحديث باستخدام المحرك المحلي كبديل
 */
// Fix: Added streamSpeech as a fallback for audio generation using window.speechSynthesis
export const streamSpeech = async (text: string, onEnd: () => void) => {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
};

export const generateStreamResponse = async (
  userMessage: string,
  grade: GradeLevel,
  subject: Subject,
  history: Message[],
  onChunk: (text: string) => void,
  attachment?: Attachment,
  options?: GenerationOptions
): Promise<string> => {
  
  // 1. البحث في البنك المحلي أولاً (سرعة 24/7 مضمونة)
  const normalized = userMessage.toLowerCase();
  const local = localContentRepository.find(e => normalized.includes(e.topic.toLowerCase()));
  if (local && !attachment) {
    onChunk(local.explanation);
    return local.explanation;
  }

  // 2. الاستعانة بالذكاء الاصطناعي مع نظام التدوير
  try {
    return await executeWithRetry(async (ai) => {
      const model = options?.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      
      const contents = history.slice(-4).map(m => ({
        role: m.sender === Sender.USER ? 'user' : 'model' as any,
        parts: [{ text: m.text }]
      }));

      const currentParts: any[] = [{ text: userMessage }];
      if (attachment) {
        currentParts.unshift({ 
          inlineData: { mimeType: attachment.mimeType, data: attachment.data } 
        });
      }
      contents.push({ role: "user", parts: currentParts });

      const result = await ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 }
      });

      let fullText = "";
      for await (const chunk of result) {
        fullText += (chunk.text || "");
        onChunk(fullText);
      }
      return fullText;
    });
  } catch (error) {
    const fallback = "⚠️ المعلم مشغول حالياً بضغط كبير من الطلاب. يرجى تجربة الدروس المسجلة في الفهرس أو المحاولة بعد دقائق.";
    onChunk(fallback);
    return fallback;
  }
};

export const generateAiSpeech = async (text: string): Promise<string | null> => {
  try {
    return await executeWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text.substring(0, 500) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    });
  } catch { return null; }
};
