
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

export const searchInStaticBank = (query: string, subject?: Subject, grade?: GradeLevel) => {
  const normalizedQuery = query.trim().toLowerCase();
  return questionsBank.find(q => 
    (!subject || q.subject === subject) &&
    (!grade || q.grade === grade) &&
    (normalizedQuery.includes(q.question.toLowerCase()) || q.question.toLowerCase().includes(normalizedQuery))
  );
};

export const sanitizeForTTS = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, ' ') 
    .replace(/[*#`_~]/g, ' ') 
    .replace(/[-+*/=]{2,}/g, ' ')
    .replace(/[^\u0600-\u06FF\s0-9a-zA-Z.,?!؟:]/g, ' ') 
    .replace(/\s+/g, ' ')
    .trim();
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
  
  const staticResult = searchInStaticBank(userMessage, subject, grade);
  if (staticResult && !attachment) {
    let current = "";
    const words = staticResult.answer.split(" ");
    for (let i = 0; i < words.length; i++) {
        current += words[i] + " ";
        onChunk(current);
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 20));
    }
    return staticResult.answer;
  }

  const cachedEntry = DynamicQuestionBank.getAll().find(item => 
    item.subject === subject && 
    item.grade === grade &&
    (userMessage.toLowerCase().includes(item.question.toLowerCase()) || item.question.toLowerCase().includes(userMessage.toLowerCase()))
  );
  const cachedAnswer = cachedEntry?.answer;

  if (cachedAnswer && !attachment) {
    let current = "";
    const words = cachedAnswer.split(" ");
    for (let i = 0; i < words.length; i++) {
        current += words[i] + " ";
        onChunk(current);
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 20));
    }
    return cachedAnswer;
  }

  try {
    // حل جذري: التأكد من وجود مفتاح قبل بناء الـ Client
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
        ...(options?.useThinking ? { 
          thinkingConfig: { thinkingBudget: 16000 },
          maxOutputTokens: 24000 
        } : {
          maxOutputTokens: 8192
        }),
        ...(options?.useSearch ? { tools: [{ googleSearch: {} }] } : {})
      }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      const text = chunk.text || "";
      fullText += text;
      onChunk(fullText);
    }

    if (fullText && !attachment) {
        await DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'anonymous');
    }

    return fullText || "عذراً، لم أتمكن من استنتاج الإجابة.";

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // إذا كان الخطأ بسبب فقدان المفتاح أو صلاحيته، نفتح نافذة الاختيار للطالب
    if (error?.message?.includes("API key") || error?.message?.includes("not found")) {
        if (typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
        }
    }
    throw error;
  }
};

export const streamSpeech = async (text: string, onAudioChunk: (base64: string) => void): Promise<void> => {
  const cleanText = sanitizeForTTS(text);
  if (!cleanText || cleanText.length < 2) return;

  const chunks = cleanText.match(/[^.!?؟\n]{1,250}(?=[.!?؟\n]|$)[.!?؟\n]?/g) || [cleanText];

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length < 2) continue;
    
    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      try {
        await ensureApiKey();
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: trimmedChunk }] }],
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
        if (audioData) {
          onAudioChunk(audioData);
          success = true;
        }
      } catch (error: any) {
        attempts++;
        const errorMessage = error?.message || "";
        
        if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
          rotateApiKey();
          await new Promise(resolve => setTimeout(resolve, 500));
        } else if (errorMessage.includes("API key")) {
          if (typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
            break; 
          }
        } else {
          break;
        }
      }
    }
  }
};
