
import { Message, GradeLevel, Subject, Attachment, GenerationOptions, Sender, StudyLanguage } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { questionsBank, localContentRepository, StaticQuestion } from "../lib/questionsBank";
import { DynamicQuestionBank } from "../lib/dynamicBank";
import { getApiKey, markKeyAsFailed } from "../utils/apiKeyManager";

let nextStartTime = 0;

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

export async function speakLongTextGemini(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass({ sampleRate: 24000 });
  nextStartTime = ctx.currentTime;
  onStart?.();

  const chunks = text.match(/[^.،؟!?\n]{1,300}(?=[.،؟!?\n]|$)/g) || [text];

  for (const chunk of chunks) {
    let success = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const currentKey = getApiKey();
      try {
        const ai = new GoogleGenAI({ apiKey: currentKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: chunk }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
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
          success = true;
          break; 
        }
      } catch (e: any) {
        if (e?.message?.includes('429')) {
          markKeyAsFailed(currentKey);
          continue;
        }
      }
    }
  }

  const waitTime = (nextStartTime - ctx.currentTime) * 1000;
  setTimeout(() => onEnd?.(), Math.max(0, waitTime));
}

export async function generatePodcastData(subject: string, content: string): Promise<{ audio: string; script: string }> {
  const currentKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey: currentKey });

  const scriptPrompt = `بصفتك معد برامج تعليمية رائد، اكتب حواراً قصيراً وشيقاً بالعامية المصرية بين "Karim" و"Noha" يشرحان فيه بأسلوب مبسط وتفاعلي هذا المحتوى عن مادة ${subject}:
  "${content}"
  
  يجب أن يكون الحوار منسقاً كالتالي:
  Karim: ...
  Noha: ...
  
  اجعل الحوار قصيراً (حوالي 4-6 جمل) لضمان تجربة مستخدم سريعة وسلسة.`;

  const scriptResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: scriptPrompt }] }],
  });

  const script = scriptResponse.text || "";

  const ttsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: script }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'Karim',
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }
              }
            },
            {
              speaker: 'Noha',
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' }
              }
            }
          ]
        }
      }
    }
  });

  const audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";

  return { audio, script };
}

export async function generateTeacherPrep(grade: string, subject: string, lesson: string): Promise<string> {
  const localMatch = localContentRepository.find(item => 
    item.grade === grade && 
    item.subject === subject && 
    (lesson.includes(item.topic) || item.topic.includes(lesson))
  );

  if (localMatch) {
    return localMatch.explanation;
  }

  const currentKey = getApiKey();
  try {
    const ai = new GoogleGenAI({ apiKey: currentKey });
    const prompt = `بصفتك خبيراً تربويًا في المناهج المصرية، قم بتحضير درس "${lesson}" لمادة "${subject}" للصف "${grade}". 
    يجب أن يتضمن التحضير: نواتج التعلم، التمهيد، عرض الدرس، أنشطة تفاعلية، وأسئلة مهارات تفكير عليا. استعمل Markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "عذراً، لم نتمكن من توليد التحضير حالياً.";
  } catch (error: any) {
    if (error?.message?.includes('429')) markKeyAsFailed(currentKey);
    throw error;
  }
}

export async function generateStreamResponse(
  userMessage: string, grade: GradeLevel, subject: Subject, history: Message[],
  onChunk: (text: string) => void, attachment?: Attachment, options?: GenerationOptions, deviceId?: string
): Promise<string> {
  
  const localMatch = localContentRepository.find(item => 
    item.grade === grade && 
    item.subject === subject && 
    userMessage.includes(item.topic)
  );

  if (localMatch && !attachment) {
    const text = `### شرح مخزن سحابياً (بدون إنترنت) 📦\n\n${localMatch.explanation}\n\n**الخلاصة:** ${localMatch.summary}`;
    onChunk(text);
    return text;
  }

  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const currentKey = getApiKey();
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const contents: any[] = history.slice(-5).map(msg => ({
        role: msg.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      const parts: any[] = [{ text: userMessage }];
      if (attachment && attachment.type === 'image') {
        parts.unshift({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
      }
      contents.push({ role: 'user', parts });

      const systemInstruction = `أنت "المعلمة الذكية". اشرح بالعامية المصرية بأسلوب ممتع. استخدم Markdown. المادة: ${subject}. الصف: ${grade}.`;

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction },
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          onChunk(cleanMathNotation(fullText));
        }
      }
      return fullText;
    } catch (error: any) {
      lastError = error;
      if (error?.message?.includes('429')) { markKeyAsFailed(currentKey); continue; }
      throw error;
    }
  }
  throw lastError;
}

export function searchInStaticBank(query: string): StaticQuestion | null {
  const normalizedQuery = query.toLowerCase().trim();
  return questionsBank.find(q => 
    normalizedQuery.includes(q.question.toLowerCase()) || 
    q.question.toLowerCase().includes(normalizedQuery)
  ) || null;
}

export async function generateFinalMemo(subject: string, grade: string): Promise<string> {
    const currentKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey: currentKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ parts: [{ text: `ولد مذكرة ليلة الامتحان لمادة ${subject} صف ${grade}` }] }],
    });
    return response.text || "";
}
