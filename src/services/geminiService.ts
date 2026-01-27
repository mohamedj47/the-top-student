
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { questionsBank } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, markKeyAsFailed } from "../utils/apiKeyManager";
import { AudioCache } from "../lib/audioCache";
import { StudentMemory } from "../lib/studentMemory";

let nextStartTime = 0;
let isGlobalSpeaking = false;

/**
 * محرك التنفيذ الذكي: يقوم بالتبديل الفوري بين 12 مفتاح متاح
 */
async function executeGeminiWithRetry(params: any, type: 'generateContent' | 'generateContentStream' = 'generateContent', maxRetries = 12) {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    const currentKey = getApiKey();
    if (currentKey === "BLOCKED") throw new Error("Subscription Required");
    if (!currentKey) continue;

    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      if (type === 'generateContentStream') {
        const stream = await ai.models.generateContentStream(params);
        if (!stream) throw new Error("Stream failed to initialize");
        return stream;
      }
      
      const result = await ai.models.generateContent(params);
      if (!result || !result.candidates) throw new Error("Invalid response");
      return result;
    } catch (e: any) {
      const errorText = e?.message?.toLowerCase() || "";
      console.error(`Attempt ${i+1} failed with key ${currentKey.substring(0, 6)}:`, errorText);
      
      // إذا كان الخطأ متعلق بالـ Quota أو مفتاح غير صالح، نقوم بحظره فوراً وتجربة التالي
      if (errorText.includes("429") || errorText.includes("quota") || errorText.includes("api key") || errorText.includes("not found")) {
        markKeyAsFailed(currentKey);
      }
      
      lastError = e;
      // انتظار بسيط جداً قبل المحاولة التالية بمفتاح جديد
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error(lastError?.message || "جميع محركات البحث مشغولة حالياً، يرجى المحاولة بعد ثوانٍ.");
}

export function searchInStaticBank(query: string) {
  if (!query) return null;
  const normalizedQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  ) || null;
}

export async function generateTeacherPrep(grade: GradeLevel, subject: Subject, lesson: string): Promise<string> {
  try {
    const response: any = await executeGeminiWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `أنت خبير تربوي وموجه مادة ${subject}. قم بإعداد تحضير درس احترافي وشامل بعنوان "${lesson}" لطلاب ${grade}. استخدم تنسيق Markdown.` }] }],
    });
    return response.text || "حدث خطأ في استلام البيانات.";
  } catch (e: any) {
    throw e;
  }
}

export function cleanMathNotation(text: string): string {
  if (!text) return "";
  const dollarChar = String.fromCharCode(36);
  let cleaned = text.split(dollarChar).join('');
  cleaned = cleaned.replace(/\\\(/g, '').replace(/\\\)/g, '').replace(/\\\[/g, '').replace(/\\\]/g, '');
  cleaned = cleaned.replace(/[*_#`~]/g, '');
  return cleaned.trim();
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

export async function decodePcmAudio(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
  }
  return buffer;
}

export async function generatePodcastData(subject: string, content: string): Promise<{ audio?: string; script: string }> {
  const scriptRes: any = await executeGeminiWithRetry({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: `حول هذا الشرح لسيناريو بودكاست مصري: "${content}"` }] }],
  });
  const script = scriptRes.text || "";
  
  try {
    const ttsRes: any = await executeGeminiWithRetry({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: { 
        responseModalities: [Modality.AUDIO], 
        speechConfig: { 
          multiSpeakerVoiceConfig: { 
            speakerVoiceConfigs: [
              { speaker: 'Noha', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
              { speaker: 'Karim', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
            ] 
          } 
        } 
      }
    });
    return { audio: ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data, script };
  } catch (e) { 
    return { script };
  }
}

export async function generateStreamResponse(userMessage: string, grade: GradeLevel, subject: Subject, history: Message[], onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions, deviceId?: string): Promise<string> {
    const contents: any[] = history.slice(-6).map(msg => ({ role: msg.sender === Sender.USER ? 'user' : 'model', parts: [{ text: msg.text }] }));
    const currentParts: any[] = [{ text: userMessage }];
    if (attachment?.data && attachment.type === 'image') { currentParts.push({ inlineData: { mimeType: attachment.mimeType || "image/jpeg", data: attachment.data } }); }
    contents.push({ role: 'user', parts: currentParts });
    
    const responseStream: any = await executeGeminiWithRetry({
      model: 'gemini-3-flash-preview',
      contents,
      config: { systemInstruction: `أنت "المعلمة الذكية" لطلاب الثانوية في مصر.` },
    }, 'generateContentStream');
    
    let fullText = "";
    for await (const chunk of responseStream) {
      if (chunk.text) { fullText += chunk.text; onChunk(cleanMathNotation(fullText)); }
    }
    return fullText;
}

export async function generateTheaterData(prompt: string, subject: Subject) {
    const planResponse: any = await executeGeminiWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `حول هذا الشرح لمشاهد بصرية مصرية: "${prompt}"` }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        imagePrompt: { type: Type.STRING },
                        narration: { type: Type.STRING }
                    },
                    required: ["imagePrompt", "narration"]
                }
            }
        }
    });
    return JSON.parse(planResponse.text || "[]");
}

export async function generateFinalMemo(subject: Subject, grade: GradeLevel): Promise<string> {
    const response: any = await executeGeminiWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `اكتب عصارة امتحان مادة ${subject} لصف ${grade}` }] }],
    });
    return response.text || "";
}

export async function speakLongTextGemini(text: string, voiceName: string = 'Puck', onStart?: () => void, onEnd?: () => void): Promise<void> {
  if (isGlobalSpeaking) { window.speechSynthesis?.cancel(); isGlobalSpeaking = false; }
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass({ sampleRate: 24000 });
  nextStartTime = ctx.currentTime;
  isGlobalSpeaking = true;
  onStart?.();

  const chunks = text.split(/[.،؟!?\n]+/).filter(c => c.trim().length > 2);
  for (const chunk of chunks) {
    if (!isGlobalSpeaking) break;
    try {
      const response: any = await executeGeminiWithRetry({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: chunk.trim() }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
      });
      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        const buffer = await decodePcmAudio(decodeBase64(audioBase64), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const start = Math.max(ctx.currentTime, nextStartTime - 0.15); 
        source.start(start);
        nextStartTime = start + buffer.duration;
        const waitTime = (nextStartTime - ctx.currentTime) * 1000;
        if (waitTime > 100) await new Promise(r => setTimeout(r, waitTime - 100));
      }
    } catch (e) { console.error("Segment Audio Failure"); }
  }
  isGlobalSpeaking = false;
  onEnd?.();
}
