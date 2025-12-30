
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { questionsBank, StaticQuestion } from "../lib/questionsBank";

// دالة لجلب أفضل مفتاح متاح حالياً
function getActiveApiKey(): string {
  const keys = [
    process.env.API_KEY,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5
  ].filter(k => k && k.length > 10);
  
  return keys[0] || '';
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
  
  if (!navigator.onLine) {
    const offlineMsg = "أنت الآن في وضع الأوفلاين. يرجى الاتصال بالإنترنت للحصول على شرح جديد.";
    onChunk(offlineMsg);
    return offlineMsg;
  }

  const apiKey = getActiveApiKey();
  if (!apiKey) {
    const noKeyMsg = "عذراً، لم يتم العثور على مفتاح تشغيل للذكاء الاصطناعي. يرجى التحقق من الإعدادات.";
    onChunk(noKeyMsg);
    return noKeyMsg;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `أنت "المعلم الذكي" لطلاب الثانوية بمصر. مادة ${subject} للصف ${grade}.
    اشرح بلهجة مصرية تعليمية مشجعة واستخدم جداول Markdown للمقارنات والقوانين. ابدأ دائماً بكلمة "تمام".
    اجعل شرحك مركزاً على نواتج التعلم وفنيات الامتحان.`;

    const chatHistory = history.slice(-6).map(m => ({
      role: m.sender === Sender.USER ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const result = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [...chatHistory, { role: "user", parts: [{ text: userMessage }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      }
    });

    let fullText = "";
    for await (const chunk of result) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        onChunk(fullText);
      }
    }

    return fullText;

  } catch (error: any) {
    console.error("Gemini Direct Error:", error);
    const errorMsg = "حدث خطأ في الاتصال المباشر. يرجى إعادة المحاولة بعد قليل.";
    onChunk(errorMsg);
    return errorMsg;
  }
}

export function searchInStaticBank(query: string): StaticQuestion | null {
  if (!query) return null;
  const normalizedQuery = query.trim().toLowerCase();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  ) || null;
}

export async function evaluateStudentLevel(history: Message[], subject: Subject): Promise<PerformanceMetrics | null> {
  const apiKey = getActiveApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `بناءً على المحادثة التالية في مادة ${subject}، قم بتقييم مستوى الطالب.
      المحادثة:
      ${history.map(m => `${m.sender === Sender.USER ? 'الطالب' : 'المعلم'}: ${m.text}`).join('\n')}
      
      يجب أن يكون الرد بتنسيق JSON حصراً.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accuracy: { type: Type.NUMBER },
            comprehension: { type: Type.NUMBER },
            analyticalSkills: { type: Type.NUMBER },
            consistency: { type: Type.NUMBER },
            overallLevel: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            weakPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            strongPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["accuracy", "comprehension", "analyticalSkills", "consistency", "overallLevel", "recommendations", "weakPoints", "strongPoints"]
        }
      }
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    return null;
  }
}

export function cleanMathNotation(text: string): string {
  return text ? text.replace(/\$/g, '') : "";
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, '').trim());
  utterance.lang = 'ar-EG';
  utterance.rate = 0.9;
  utterance.onend = onComplete || null;
  window.speechSynthesis.speak(utterance);
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodePcmAudio(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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

export async function generateAiSpeech(text: string): Promise<any> { return null; }
export function sanitizeForSpeech(text: string): string { return text; }
