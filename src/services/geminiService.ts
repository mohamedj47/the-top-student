
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
 * دالة ذكية للبحث في المستودع المحلي (Offline-First)
 */
const findLocalContent = (query: string, subject: Subject): string | null => {
  const normalizedQuery = query.toLowerCase().trim();
  
  // كلمات دلالية للتجاهل لتحسين البحث
  const stopWords = ["اشرح", "لخص", "أريد", "عن", "موضوع", "درس", "ممكن", "أهم", "نقاط", "أسئلة", "توقعات"];
  let cleanQuery = normalizedQuery;
  stopWords.forEach(word => {
    cleanQuery = cleanQuery.replace(new RegExp(`^${word}\\s+|\\s+${word}\\s+|\\s+${word}$`, 'g'), ' ').trim();
  });

  const entry = localContentRepository.find(e => 
    normalizedQuery.includes(e.topic.toLowerCase()) || 
    e.topic.toLowerCase().includes(cleanQuery) ||
    (cleanQuery.length > 3 && e.topic.toLowerCase().includes(cleanQuery))
  );

  if (!entry) return null;

  if (normalizedQuery.includes('لخص') || normalizedQuery.includes('ملخص') || normalizedQuery.includes('نقاط')) {
    return entry.summary + "\n\n" + entry.keyPoints;
  }
  if (normalizedQuery.includes('أسئلة') || normalizedQuery.includes('تدريب')) {
    return entry.practice;
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

/**
 * تنفيذ الطلب مع محاولة استخدام كل المفاتيح المتاحة بالتتابع
 */
const executeWithFullKeyRotation = async <T>(fn: (apiKey: string) => Promise<T>): Promise<T> => {
  const totalKeys = getAvailableKeysCount();
  let lastError: any = null;

  for (let i = 0; i < totalKeys; i++) {
    try {
      const currentKey = getApiKey();
      return await fn(currentKey);
    } catch (error: any) {
      lastError = error;
      // إذا كان الخطأ متعلق بالحصة (429) أو مشكلة في المفتاح، ننتقل للمفتاح التالي فوراً
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('API_KEY_INVALID')) {
        console.warn(`Key ${i+1} exhausted or invalid, rotating...`);
        rotateApiKey();
        // انتظار بسيط قبل المحاولة بالمفتاح التالي
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // إذا كان خطأ آخر غير متعلق بالمفتاح، نتوقف
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
  
  // 1. محاولة البحث المحلي أولاً (لتوفير الـ API لأوقات الزحام)
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

  // 2. استخدام الـ API مع نظام التدوير الشامل
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
    // إظهار رسالة ذكية في حالة فشل كل المفاتيح الـ 5
    const hour = new Date().getHours();
    const isPeakTime = hour >= 17 || hour <= 1; // من 5 مساءاً لـ 1 صباحاً وقت ذروة
    
    let fallbackMsg = "";
    if (isPeakTime) {
      fallbackMsg = "⚠️ **يا بطل، الخوادم المجانية وصلت لحد الاستخدام الأقصى الآن (وقت الذروة).**\n\nبما أننا نخدم آلاف الطلاب حالياً، نعتذر عن هذا التوقف المؤقت.\n\n💡 **حلول سريعة لك الآن:**\n1. اضغط على **فهرس الدروس** بالأسفل لمشاهدة شرح فيديو أو قراءة ملخص جاهز.\n2. جرب اختيار مادة أخرى أو حاول مجدداً بعد 15 دقيقة.\n3. تأكد أنك كتبت اسم الدرس بشكل صحيح لنعرض لك الشرح المخزن مسبقاً.";
    } else {
      fallbackMsg = "عذراً، يبدو أن هناك ضغطاً كبيراً على النظام حالياً. يمكنك استخدام **فهرس الدروس** للوصول للمحتوى الجاهز فوراً دون الحاجة للانتظار.";
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
