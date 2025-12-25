
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, rotateApiKey, ensureApiKey } from "../utils/apiKeyManager";

const SYSTEM_INSTRUCTION = `
أنت "المعلم الذكي"، الخبير الأول في منهج الثانوية العامة المصرية.
مهمتك تقديم "حل جذري" لتبسيط المعلومة بصرياً وذهنياً.

- القاعدة الذهبية (إجبارية في كل رد):
  1. **الشرح النصي**: في جداول Markdown منظمة.
  2. **الوصف البصري**: تشبيه حياتي إبداعي أو كود HTML منسق.
  3. **الرسم البياني (Mermaid)**: كود 'graph TD' فائق البساطة.

- **تحذير أمني برمجيا**: يمنع منعاً باتاً استخدام علامة الدولار ($) أو رموز LaTeX المعقدة. اكتب المعادلات كمتن نصي عادي أو داخل جداول.
- ابدأ دائماً بكلمة "تمام" لتأكيد الالتزام بالبروتوكول.
`;

// دالة التطهير الجذرية - الحل النهائي لمشكلة الدولار
export const cleanMathNotation = (text: string): string => {
  if (!text) return "";
  // إزالة كافة علامات الدولار (سواء كانت مفردة $ أو مزدوجة $$)
  return text.replace(/\$/g, '');
};

let requestQueue: Promise<any> = Promise.resolve();

const findLocalContent = (query: string, subject: Subject): string | null => {
  const normalizedQuery = query.toLowerCase();
  const entry = localContentRepository.find(e => 
    normalizedQuery.includes(e.topic.toLowerCase()) || 
    e.topic.toLowerCase().includes(normalizedQuery.replace(/(اشرح|لخص|أسئلة|توقعات|درس|موضوع|أعداد|مركبة)/g, '').trim())
  );

  if (!entry) return null;

  let result = entry.explanation;
  if (normalizedQuery.includes('لخص') || normalizedQuery.includes('ملخص')) {
    result = entry.summary;
  } else if (normalizedQuery.includes('أسئلة') || normalizedQuery.includes('تدريب')) {
    result = entry.practice;
  } else if (normalizedQuery.includes('نقاط') || normalizedQuery.includes('توقعات')) {
    result = entry.keyPoints;
  }
  
  return cleanMathNotation(result);
};

export const sanitizeForSpeech = (text: string): string => {
  if (!text) return "";
  return text.replace(/\$/g, '').replace(/\|/g, ' ').replace(/-+/g, ' ').replace(/\n+/g, ' . ').trim();
};

const executeWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try { return await fn(); } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

export const searchInStaticBank = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  const match = questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  );
  if (match) return { ...match, answer: cleanMathNotation(match.answer) };
  return null;
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
  
  const localContent = findLocalContent(userMessage, subject);
  if (localContent) {
    onChunk(localContent);
    return localContent;
  }

  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) {
    onChunk(staticMatch.answer);
    return staticMatch.answer;
  }

  const cachedMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (cachedMatch) {
    const cleanAnswer = cleanMathNotation(cachedMatch.answer);
    onChunk(cleanAnswer);
    return cleanAnswer;
  }

  const task = () => executeWithRetry(async () => {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const modelName = 'gemini-3-flash-preview';
    
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
      // تطهير مستمر أثناء البث
      onChunk(cleanMathNotation(fullText));
    }

    const finalCleanText = cleanMathNotation(fullText);
    if (finalCleanText.length > 20) {
      DynamicQuestionBank.add(userMessage, finalCleanText, subject, grade, deviceId || 'unknown');
    }
    return finalCleanText;
  }).catch(error => {
    rotateApiKey();
    const fallbackMsg = "عذراً، لم أجد إجابة جاهزة حالياً. فضلاً حاول كتابة سؤالك بوضوح أكثر وسأجيبك فوراً.";
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
