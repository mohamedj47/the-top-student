
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

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = "pNInz6obpgnuMGrWAt7r"; 

const generateElevenLabsSpeech = async (text: string): Promise<string | null> => {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.includes('YOUR_KEY')) return null;
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("ElevenLabs Error:", error);
    return null;
  }
};

// تحديث البنك المحلي بمحتوى Unit 1 ليعمل فوراً
const EXTENDED_LOCAL_CONTENT = [
  ...localContentRepository,
  {
    topic: "Unit 1: Health and Safety",
    subject: Subject.ENGLISH,
    grade: GradeLevel.GRADE_11,
    explanation: `### تمام، إليك شرح درس Unit 1: Health and Safety (First Aid) 🩺

في هذا الدرس نتعلم كيف نتصرف في حالات الطوارئ الطبية وأهمية الإسعافات الأولية.

| المصطلح (Word) | المعنى بالعربي | التعريف (Definition) |
| :--- | :--- | :--- |
| **First Aid** | الإسعافات الأولية | Basic medical help given to an injured person. |
| **CPR** | الإنعاش القلبي | Cardio-Pulmonary Resuscitation. |
| **Emergency** | حالة طوارئ | A serious situation that needs immediate action. |
| **Infection** | عدوى | A disease caused by germs or bacteria. |

---
**القواعد (Grammar): الضرورة والالتزام (Must / Have to)**

1. **Must**: للالتزام القوي النابع من الداخلي أو القواعد العامة.
   - *Example:* You **must** wash your hands before eating.
2. **Mustn't**: للتحريم والمنع (ممنوع تعمل كذا).
   - *Example:* You **mustn't** touch a wound with dirty hands.

---
**الوصف البصري 🎨:**
تخيل الإسعافات الأولية زي "درع الحماية" اللي بنستخدمه أول ما حد يتصاب عشان نمنع المشكلة إنها تكبر لحد ما يوصل الدكتور.

---
**خريطة ذهنية سريعة:**
\`\`\`mermaid
graph TD
    A["Health & Safety"] --> B["First Aid Tools"]
    A --> C["Grammar: Necessity"]
    B --> B1["Bandages"]
    B --> B2["Antiseptic"]
    C --> C1["Must (Strong Advice)"]
    C --> C2["Mustn't (Prohibition)"]
\`\`\``,
    summary: `### ملخص Unit 1
- الإسعافات الأولية (First Aid) ضرورية لإنقاذ الأرواح.
- الإنعاش القلبي (CPR) يُستخدم عندما يتوقف القلب عن العمل.
- نستخدم Must للضرورة و Mustn't للمنع والتحريم.`,
    practice: `### أسئلة تدريبية على Unit 1
1. **Choose:** You (must / mustn't) use clean bandages on a wound.
2. **Translate:** "يجب عليك غسل يديك جيداً لتجنب العدوى."
   *(You must wash your hands well to avoid infection.)*`,
    keyPoints: "| النقطة | التفاصيل |\n| :--- | :--- |\n| Vocabulary | Focus on Medical verbs (Perform, React) |\n| Grammar | Use Must for internal obligation |"
  }
];

export const cleanMathNotation = (text: string): string => {
  if (!text) return "";
  return text.replace(/\$/g, '');
};

let requestQueue: Promise<any> = Promise.resolve();

const findLocalContent = (query: string, subject: Subject): string | null => {
  const normalizedQuery = query.toLowerCase();
  const entry = EXTENDED_LOCAL_CONTENT.find(e => 
    normalizedQuery.includes(e.topic.toLowerCase()) || 
    e.topic.toLowerCase().includes(normalizedQuery.replace(/(اشرح|لي|درس|بالتفصيل|وبالأمثلة|unit 1|unit1)/g, '').trim())
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
  return text.replace(/\$/g, '').replace(/\|/g, ' ').replace(/\*/g, '').replace(/#/g, '').replace(/-+/g, ' ').replace(/\n+/g, ' . ').trim();
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

export const generateAiSpeech = async (text: string): Promise<{data: string, source: 'gemini' | 'elevenlabs'} | null> => {
  const elevenAudio = await generateElevenLabsSpeech(text);
  if (elevenAudio) return { data: elevenAudio, source: 'elevenlabs' };
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
};

export const streamSpeech = async (text: string, onComplete?: () => void): Promise<void> => {
  if (!window.speechSynthesis) { onComplete?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  utterance.lang = 'ar-SA';
  utterance.onend = () => onComplete?.();
  window.speechSynthesis.speak(utterance);
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
    const hasKey = await ensureApiKey();
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === "") {
        throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey });
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
      onChunk(cleanMathNotation(fullText));
    }

    const finalCleanText = cleanMathNotation(fullText);
    if (finalCleanText.length > 20) {
      DynamicQuestionBank.add(userMessage, finalCleanText, subject, grade, deviceId || 'unknown');
    }
    return finalCleanText;
  }).catch(error => {
    console.error("Gemini API Error:", error);
    let errorMsg = "عذراً، لم أجد إجابة جاهزة حالياً. فضلاً تأكد من وجود مفتاح الـ API في الإعدادات وسأجيبك فوراً.";
    
    if (error.message === "API_KEY_MISSING" || error.message?.includes("API_KEY")) {
        errorMsg = "⚠️ **تنبيه**: عقل المعلم الذكي غير متصل. يرجى التأكد من إضافة مفتاح Gemini API في ملف vite.config.ts لتتمكن من طرح أسئلة جديدة.";
    } else {
        rotateApiKey();
    }
    
    onChunk(errorMsg);
    return errorMsg;
  });

  requestQueue = requestQueue.then(() => task());
  return requestQueue;
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
