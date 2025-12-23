
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
 * دالة ذكية للبحث في المستودع المحلي المجدول (تقليل الـ API بنسبة 99%)
 */
const findLocalContent = (query: string, subject: Subject): string | null => {
  const normalizedQuery = query.toLowerCase();
  
  // استخراج اسم الدرس من الطلب
  const entry = localContentRepository.find(e => 
    normalizedQuery.includes(e.topic.toLowerCase()) || 
    e.topic.toLowerCase().includes(normalizedQuery.replace(/(اشرح|لخص|أسئلة|توقعات|درس|موضوع|أعداد|مركبة|عن|ممكن)/g, '').trim())
  );

  if (!entry) return null;

  if (normalizedQuery.includes('لخص') || normalizedQuery.includes('ملخص')) {
    return entry.summary;
  }
  if (normalizedQuery.includes('أسئلة') || normalizedQuery.includes('تدريب')) {
    return entry.practice;
  }
  if (normalizedQuery.includes('نقاط') || normalizedQuery.includes('توقعات')) {
    return entry.keyPoints;
  }
  
  return entry.explanation;
};

export const sanitizeForSpeech = (text: string): string => {
  if (!text) return "";
  return text.replace(/\$/g, '').replace(/\|/g, ' ').replace(/-+/g, ' ').replace(/\n+/g, ' . ').trim();
};

const cleanMathNotation = (text: string): string => {
  return text.replace(/\$/g, '');
};

const executeWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> => {
  try { return await fn(); } catch (error: any) {
    if (retries > 0) {
      // إذا كان الخطأ متعلق بالـ Quota (429)، نقوم بتدوير المفتاح فوراً
      if (error?.status === 429 || error?.message?.includes('429')) {
        rotateApiKey();
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
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
  
  // 1. الأولوية للمحتوى المحلي (سريع ومجاني)
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

  // 2. الـ API للحالات الفريدة فقط
  const task = () => executeWithRetry(async () => {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
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
    // في حالة فشل كل المحاولات والـ API Keys
    const isPeakHour = new Date().getHours() >= 18 && new Date().getHours() <= 23;
    let fallbackMsg = "";
    
    if (isPeakHour) {
      fallbackMsg = "⚠️ **نعتذر منك يا بطل.. النظام مشغول حالياً بسبب ضغط المذاكرة في أوقات الذروة.**\n\nبما أننا نستخدم النسخة المجانية، فقد وصلنا للحد الأقصى من الأسئلة لهذا الموعد.\n\n💡 **ماذا يمكنك أن تفعل الآن؟**\n1. تصفح **فهرس الدروس** من القائمة بالأعلى (يعمل دائماً).\n2. جرب سؤالاً آخر من الأسئلة المقترحة.\n3. حاول مرة أخرى بعد قليل.";
    } else {
      fallbackMsg = "عذراً، يبدو أن هناك مشكلة مؤقتة في الاتصال بخوادم الذكاء الاصطناعي. جرب كتابة سؤالك بوضوح أو اختر درساً من الفهرس لنعرض لك شرحه الجاهز.";
    }
    
    onChunk(fallbackMsg);
    return fallbackMsg;
  });

  requestQueue = requestQueue.then(() => task());
  return requestQueue;
};

export const generateAiSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    return await executeWithRetry(async () => {
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
