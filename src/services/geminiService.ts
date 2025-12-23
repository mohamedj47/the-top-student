
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, rotateApiKey, ensureApiKey, getAvailableKeysCount } from "../utils/apiKeyManager";

const SYSTEM_INSTRUCTION = `
أنت "المعلم الذكي"، خبير تعليمي متخصص في منهج الثانوية العامة المصرية.
- هدفك: تبسيط المعلومة للطالب.
- القاعدة الذهبية: استخدم جداول Markdown دائماً للمقارنات والتعريفات والقوانين لمنع تداخل النصوص.
- التنسيق: أي معلومة تتبع نمط (العنصر) و (شرحه) يجب أن تظهر في جدول.
- ممنوع استخدام علامة الدولار ($).
`;

let requestQueue: Promise<any> = Promise.resolve();

/**
 * دالة البحث المحلي الذكية (Smart Offline Matcher)
 * الحل الجذري لمنع رسائل "النظام مشغول"
 */
const findLocalContent = (query: string, subject: Subject): string | null => {
  const normalizedQuery = query.toLowerCase().trim();
  
  // تنظيف السؤال من الكلمات الزائدة للوصول لجوهر الدرس
  const junkWords = ["اشرح", "لي", "درس", "بالتفصيل", "والأمثلة", "أريد", "عن", "موضوع", "ممكن", "أهم", "نقاط", "توقعات", "الوحدة الأولى", "الوحدة الثانية", "الوحدة الثالثة"];
  let coreTopic = normalizedQuery;
  junkWords.forEach(word => {
    coreTopic = coreTopic.split(word).join(' ').trim();
  });
  // إزالة الأقواس والرموز
  coreTopic = coreTopic.replace(/[()""'']/g, ' ').replace(/\s+/g, ' ').trim();

  // البحث عن أقرب درس في المستودع المحلي
  const entry = localContentRepository.find(e => 
    normalizedQuery.includes(e.topic.toLowerCase()) || 
    e.topic.toLowerCase().includes(coreTopic) ||
    (coreTopic.length > 4 && e.topic.toLowerCase().includes(coreTopic)) ||
    (coreTopic.length > 4 && coreTopic.includes(e.topic.toLowerCase()))
  );

  if (!entry) return null;

  // توجيه المحتوى حسب نوع الطلب
  if (normalizedQuery.includes('لخص') || normalizedQuery.includes('ملخص') || normalizedQuery.includes('نقاط')) {
    return entry.summary + "\n\n" + entry.keyPoints;
  }
  if (normalizedQuery.includes('أسئلة') || normalizedQuery.includes('تدريب')) {
    return entry.practice;
  }
  
  // في حالة الطلب العام أو الشرح
  return entry.explanation + "\n\n" + entry.keyPoints + "\n\n" + entry.practice;
};

export const sanitizeForSpeech = (text: string): string => {
  if (!text) return "";
  return text.replace(/\$/g, '').replace(/\|/g, ' ').replace(/-+/g, ' ').replace(/\n+/g, ' . ').trim();
};

const cleanMathNotation = (text: string): string => {
  return text.replace(/\$/g, '');
};

const executeWithFullKeyRotation = async <T>(fn: (apiKey: string) => Promise<T>): Promise<T> => {
  const totalKeys = getAvailableKeysCount();
  let lastError: any = null;

  for (let i = 0; i < totalKeys; i++) {
    try {
      const currentKey = getApiKey();
      return await fn(currentKey);
    } catch (error: any) {
      lastError = error;
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('API_KEY_INVALID')) {
        rotateApiKey();
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        throw error;
      }
    }
  }
  throw lastError || new Error("All keys exhausted");
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
  
  // 1. الأولوية القصوى للمستودع المحلي (يعمل فوراً وبدقة 100% وبدون API)
  const localContent = findLocalContent(userMessage, subject);
  if (localContent) {
    onChunk(localContent);
    return localContent;
  }

  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) {
    const cleanAnswer = cleanMathNotation(staticMatch.answer);
    onChunk(cleanAnswer);
    return cleanAnswer;
  }

  const cachedMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (cachedMatch) {
    const cleanAnswer = cleanMathNotation(cachedMatch.answer);
    onChunk(cleanAnswer);
    return cleanAnswer;
  }

  // 2. استخدام الـ API كحل أخير للأسئلة الفريدة جداً
  const task = () => executeWithFullKeyRotation(async (apiKey) => {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const modelName = options?.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const contents = history.slice(-6).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model' as any,
      parts: [{ text: msg.text }]
    }));

    const currentParts: any[] = [{ text: userMessage }];
    if (attachment) {
      currentParts.unshift({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    }
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
      fullText += (chunk.text || "");
      onChunk(cleanMathNotation(fullText));
    }

    const finalCleanText = cleanMathNotation(fullText);
    if (finalCleanText.length > 20) {
      DynamicQuestionBank.add(userMessage, finalCleanText, subject, grade, deviceId || 'unknown');
    }
    return finalCleanText;
  }).catch(error => {
    const hour = new Date().getHours();
    const isPeakTime = hour >= 17 || hour <= 1;
    
    let fallbackMsg = "";
    if (isPeakTime) {
      fallbackMsg = "⚠️ **النظام مشغول جداً حالياً بآلاف الطلاب..**\n\nلكي لا تتعطل مذاكرتك، قمنا بتوفير **فهرس الدروس** أسفل رسالتي.\n\n💡 **الحل الفوري:**\n1. اختر الدرس من الفهرس لمشاهدة شرح فيديو.\n2. اكتب اسم الدرس بوضوح (مثلاً: حاتم الطائي) ليعرض لك التطبيق الشرح المخزن محلياً.\n3. حاول مرة أخرى في وقت لاحق للأسئلة المتقدمة.";
    } else {
      fallbackMsg = "عذراً، يوجد ضغط مؤقت. جرب استخدام الفهرس أو ابحث عن اسم الدرس مباشرة.";
    }
    
    onChunk(fallbackMsg);
    return fallbackMsg;
  });

  requestQueue = requestQueue.then(() => task());
  return requestQueue;
};

export const generateAiSpeech = async (text: string): Promise<string | null> => {
  try {
    return await executeWithFullKeyRotation(async (apiKey) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: sanitizeForSpeech(text) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    });
  } catch { return null; }
};

export const streamSpeech = async (text: string, onComplete?: () => void): Promise<void> => {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  utterance.lang = 'ar-SA';
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
};
