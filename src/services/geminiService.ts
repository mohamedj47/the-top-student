import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, rotateApiKey, ensureApiKey } from "../utils/apiKeyManager";

/**
 * وظيفة تنظيف النصوص من علامات الرياضات المعقدة
 * تم وضعها في البداية لضمان تصديرها بشكل صحيح لملف MessageBubble
 */
export function cleanMathNotation(text: string): string {
  if (!text) return "";
  // حذف علامات الدولار التي تسبب مشاكل في العرض
  return text.replace(/\$/g, '');
}

export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '').replace(/\|/g, ' ').replace(/\*/g, '').replace(/#/g, '').replace(/-+/g, ' ').replace(/\n+/g, ' . ').trim();
}

const SYSTEM_INSTRUCTION = `
أنت "المعلم الذكي"، الخبير الأول في منهج الثانوية العامة المصرية.
مهمتك تقديم "حل جذري" لتبسيط المعلومة بصرياً وذهنياً.

- القاعدة الذهبية (إجبارية في كل رد):
  1. **الشرح النصي**: في جداول Markdown منظمة.
  2. **الوصف البصري**: تشبيه حياتي إبداعي.
  3. **الرسم البياني (Mermaid)**: كود 'graph TD' بسيط.

يمنع استخدام علامات ($).
ابدأ بكلمة "تمام".
`;

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try { return await fn(); } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export async function generateAiSpeech(text: string): Promise<{data: string, source: 'gemini' | 'elevenlabs'} | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await executeWithRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: sanitizeForSpeech(text) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
    });
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (data) return { data, source: 'gemini' };
  } catch (err) { console.error("Gemini TTS Error:", err); }
  return null;
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  utterance.lang = 'ar-SA';
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
}

export function searchInStaticBank(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const match = questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  );
  if (match) return { ...match, answer: cleanMathNotation(match.answer) };
  return null;
}

let requestQueue: Promise<any> = Promise.resolve();

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
  
  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) {
    onChunk(staticMatch.answer);
    return staticMatch.answer;
  }

  const task = () => executeWithRetry(async () => {
    await ensureApiKey();
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
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
      model: 'gemini-3-flash-preview',
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
    rotateApiKey();
    const errorMsg = "عذراً، المحرك مشغول حالياً، جاري التبديل لمفتاح بديل. أعد المحاولة ثانية.";
    onChunk(errorMsg);
    return errorMsg;
  });

  requestQueue = requestQueue.then(() => task());
  return requestQueue;
}
