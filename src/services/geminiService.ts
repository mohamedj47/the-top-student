
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, PerformanceMetrics } from "../types";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { AudioCache } from "../lib/audioCache";
import { getApiKey, ensureApiKey } from "../utils/apiKeyManager"; 

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  return text.replace(/\$/g, '');
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
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

export function sanitizeForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/\|/g, ' . ')
    .replace(/-{3,}/g, ' ')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/^\s*[\d•.-]+\s+/gm, ' ومن النقاط الهامة أيضاً ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SYSTEM_INSTRUCTION = `
أنت "المعلم الذكي" لطلاب الثانوية العامة بمصر.
تحدث بلهجة مصرية تعليمية هادئة واحترافية.
ردك يجب أن يكون منظماً في جداول Markdown دائماً لسهولة الفهم.
ابدأ بكلمة "تمام" دائماً.
`;

export async function evaluateStudentLevel(
  history: Message[],
  subject: Subject
): Promise<PerformanceMetrics | null> {
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const chatLog = history.map(m => `${m.sender === Sender.USER ? 'الطالب' : 'المعلم'}: ${m.text}`).join('\n');

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{
        parts: [{
          text: `بصفتك خبير تقييم أكاديمي لنظام الثانوية العامة المصري، حلل سجل الحوار التالي لمادة ${subject} وقيم مستوى الطالب بدقة.
          
          سجل الحوار:
          ${chatLog}

          يجب أن تكون النتيجة بتنسيق JSON حصراً يحتوي على الحقول التالية:
          - accuracy: درجة الدقة العلمية للطالب (0-100)
          - comprehension: درجة الفهم العام (0-100)
          - analyticalSkills: مهارات التحليل والاستنتاج (0-100)
          - consistency: مدي استمرار وتفاعل الطالب (0-100)
          - overallLevel: وصف مختصر للمستوى (مثلاً: "متميز مع حاجة للتدريب على المسائل المركبة")
          - recommendations: مصفوفة من 3 نصائح تعليمية مخصصة
          - weakPoints: مصفوفة بنقاط الضعف التي ظهرت
          - strongPoints: مصفوفة بنقاط القوة التي ظهرت`
        }]
      }],
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
          required: ["accuracy", "comprehension", "analyticalSkills", "overallLevel", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Evaluation error:", error);
    return null;
  }
}

export async function streamSpeech(text: string, onComplete?: () => void): Promise<void> {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const cleanText = sanitizeForSpeech(text);
  const sentences = cleanText.split(/[.،]/).filter(s => s.trim().length > 2);
  let currentSentence = 0;
  const speakNext = () => {
    if (currentSentence >= sentences.length) { onComplete?.(); return; }
    const utterance = new SpeechSynthesisUtterance(sentences[currentSentence]);
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.includes('ar-EG')) || voices.find(v => v.lang.includes('ar-SA')) || voices[0];
    utterance.voice = arabicVoice;
    utterance.lang = 'ar-SA';
    utterance.pitch = 1.0; 
    utterance.rate = 0.85;
    utterance.onend = () => { currentSentence++; setTimeout(speakNext, 300); };
    utterance.onerror = () => { currentSentence++; speakNext(); };
    window.speechSynthesis.speak(utterance);
  };
  if (sentences.length > 0) speakNext();
  else onComplete?.();
}

export async function generateAiSpeech(text: string): Promise<{ data: string; source: 'gemini' | 'cache' } | null> {
  const cacheKey = AudioCache.generateKey(text);
  const cachedAudio = await AudioCache.get(cacheKey);
  if (cachedAudio) return { data: cachedAudio, source: 'cache' };
  if (!navigator.onLine) return null;
  try {
    await ensureApiKey();
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const sanitizedText = sanitizeForSpeech(text);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `اشرحي هذا النص للطالب بأسلوب مدرسة مصرية هادئة جداً، لا تنطقي أي رموز: ${sanitizedText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      await AudioCache.save(cacheKey, base64Audio);
      return { data: base64Audio, source: 'gemini' };
    }
    return null;
  } catch (error) { return null; }
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
  const staticMatch = searchInStaticBank(userMessage);
  if (staticMatch) { onChunk(staticMatch.answer); return staticMatch.answer; }
  const cachedMatch = await DynamicQuestionBank.search(userMessage, subject);
  if (cachedMatch) { onChunk(cachedMatch.answer); return cachedMatch.answer; }
  if (!navigator.onLine) {
    const fallback = "أنت الآن في وضع الأوفلاين. جاري عرض أقرب شرح محفوظ لهذه المادة من الذاكرة المحلية...";
    onChunk(fallback);
    return fallback;
  }
  try {
    await ensureApiKey();
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const contents = history.slice(-3).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: "user", parts: [{ text: userMessage }] });
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 }
    });
    let fullText = "";
    for await (const chunk of streamResponse) {
      fullText += (chunk.text || "");
      onChunk(cleanMathNotation(fullText));
    }
    if (fullText.length > 5) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId || 'local_user');
    }
    return fullText;
  } catch (error) {
    return "جاري محاولة استرجاع الشرح من الذاكرة المحلية بسبب ضغط على الخادم...";
  }
}

export function searchInStaticBank(query: string) {
  if (!query) return null;
  const normalizedQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  );
}
