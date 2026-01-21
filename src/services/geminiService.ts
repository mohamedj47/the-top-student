
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository, StaticQuestion, StaticContent } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, markKeyAsFailed } from "../utils/apiKeyManager";
import { AudioCache } from "../lib/audioCache";
import { StudentMemory } from "../lib/studentMemory";

let nextStartTime = 0;
let isGlobalSpeaking = false;

/**
 * تنظيف النصوص من علامات الدولار ورموز الرياضيات الزائدة لضمان عرض ونطق نظيف
 * تم تحويل التعبير المنتظم لصيغة سلسلة نصية لتجنب أخطاء المتصفح (Invalid or unexpected token)
 */
export function cleanMathNotation(text: string): string {
  if (!text) return "";
  const dollarChar = String.fromCharCode(36);
  // تنظيف علامات الدولار والرموز بشكل آمن تماماً عبر استبدال السلاسل النصية
  let cleaned = text.split(dollarChar).join('');
  cleaned = cleaned.replace(/\\\(/g, '').replace(/\\\)/g, '').replace(/\\\[/g, '').replace(/\\\]/g, '');
  cleaned = cleaned.replace(/[*_#`~]/g, '');
  return cleaned.trim();
}

/**
 * محرك تنفيذ طلبات Gemini المقاوم للفشل مع تدوير المفاتيح بشكل مكثف
 */
async function executeGeminiWithRetry(params: any, type: 'generateContent' | 'generateContentStream' = 'generateContent', maxRetries = 10) {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    const currentKey = getApiKey();
    if (currentKey === "BLOCKED") throw new Error("Subscription Required");
    if (!currentKey) throw new Error("API Keys Missing");
    
    const ai = new GoogleGenAI({ apiKey: currentKey });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); 

      let result;
      if (type === 'generateContentStream') {
        result = await ai.models.generateContentStream(params);
      } else {
        result = await ai.models.generateContent(params);
        if (!result || !result.text) {
          throw new Error("EMPTY_RESPONSE");
        }
      }
      
      clearTimeout(timeoutId);
      return result;
    } catch (e: any) {
      lastError = e;
      const errorStr = String(e).toLowerCase();
      
      if (errorStr.includes('429') || errorStr.includes('500') || errorStr.includes('internal') || errorStr.includes('fetch') || errorStr.includes('empty')) {
        markKeyAsFailed(currentKey);
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      if (errorStr.includes('audioout') || errorStr.includes('not supported')) {
        throw new Error("TTS_REJECTED");
      }

      throw e;
    }
  }
  throw lastError;
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
  sampleRate: number,
  numChannels: number,
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

export async function speakLongTextGemini(text: string, voiceName: string = 'Kore', onStart?: () => void, onEnd?: () => void): Promise<void> {
  if (isGlobalSpeaking) {
    window.speechSynthesis?.cancel();
    isGlobalSpeaking = false;
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass({ sampleRate: 24000 });
  nextStartTime = ctx.currentTime;
  isGlobalSpeaking = true;
  onStart?.();

  const cleanText = cleanMathNotation(text);
  const chunks = cleanText.split(/[.،؟!?\n]+/).filter(c => c.trim().length > 2);

  for (const chunk of chunks) {
    if (!isGlobalSpeaking) break;
    
    try {
      const response: any = await executeGeminiWithRetry({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: chunk.trim() }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        const buffer = await decodePcmAudio(decodeBase64(audioBase64), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const start = Math.max(ctx.currentTime, nextStartTime);
        source.start(start);
        nextStartTime = start + buffer.duration;
        
        const waitTime = (nextStartTime - ctx.currentTime) * 1000;
        if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime - 100));
      }
    } catch (e) {
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = 'ar-EG';
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    }
  }

  isGlobalSpeaking = false;
  onEnd?.();
}

export async function generatePodcastData(subject: string, content: string): Promise<{ audio?: string; script: string }> {
  const cacheKey = AudioCache.generateKey(`podcast_v10_${subject}_${content.substring(0, 50)}`);
  const cached = await AudioCache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let script = "";
  try {
    const scriptResponse: any = await executeGeminiWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `حول النص التعليمي التالي إلى سكريبت بودكاست مصري تفاعلي ومرح بين كريم ونهى: "${content}"` }] }],
    });
    script = scriptResponse.text || "";
  } catch (e) {
    script = `Karim: ركزي يا نهى. \nNoha: تمام. ${content}`;
  }

  try {
    const ttsResponse: any = await executeGeminiWithRetry({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Karim', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'Noha', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            ]
          }
        }
      }
    });

    const audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    const result = { audio, script };
    await AudioCache.save(cacheKey, JSON.stringify(result));
    return result;
  } catch (e) {
    return { script };
  }
}

export function searchInStaticBank(query: string): StaticQuestion | undefined {
  const normalizedQuery = query.toLowerCase();
  return questionsBank.find(item => 
    normalizedQuery.includes(item.question.toLowerCase()) || 
    item.question.toLowerCase().includes(normalizedQuery)
  );
}

export async function generateFinalMemo(subject: Subject, grade: GradeLevel): Promise<string> {
  const prompt = `أنت معلم خبير في المنهج المصري. قم بكتابة "عصارة الامتحان" لمادة ${subject} للصف ${grade}. المحتوى بأسلوب Markdown.`;
  const response: any = await executeGeminiWithRetry({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return response.text || "عذراً، فشل توليد العصارة حالياً.";
}

export async function generateTeacherPrep(grade: GradeLevel, subject: Subject, lesson: string): Promise<string> {
  const prompt = `بصفتك معلم خبير، قم بإعداد "دفتر تحضير دروس" احترافي ومنظم لدرس "${lesson}" في مادة ${subject} للصف ${grade} بأسلوب Markdown.`;
  const response: any = await executeGeminiWithRetry({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return response.text || "فشل توليد التحضير.";
}

export async function generateStreamResponse(
  userMessage: string, grade: GradeLevel, subject: Subject, history: Message[],
  onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions, deviceId?: string
): Promise<string> {
  try {
    const contents: any[] = history.slice(-6).map(msg => ({
      role: msg.sender === Sender.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const responseStream: any = await executeGeminiWithRetry({
      model: 'gemini-3-flash-preview',
      contents,
      config: { 
        systemInstruction: `أنت "المعلمة الذكية" لطلاب الثانوية العامة في مصر. اشرح مادة ${subject} للصف ${grade} بالعامية المصرية بأسلوب Markdown جذاب.` 
      },
    }, 'generateContentStream');

    let fullText = "";
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(cleanMathNotation(fullText));
      }
    }
    
    // تفعيل ميزة "بنك الطالب": حفظ السؤال والإجابة فورياً للاستخدام المستقبلي وأوفلاين
    if (fullText && deviceId) {
      DynamicQuestionBank.add(userMessage, fullText, subject, grade, deviceId).catch(err => {
        console.debug("Background Bank Sync Deferred");
      });
    }

    return fullText;
  } catch (error) { throw error; }
}
