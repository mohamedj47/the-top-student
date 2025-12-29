
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: "edge",
};

// كاش محلي سريع جداً للأسئلة الشائعة لتوفير الـ Quota
const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 دقيقة

// تحديد معدل الطلبات (تم رفعه لـ 60 طلب في الدقيقة)
const rateMap = new Map<string, { count: number; reset: number }>();
const LIMIT = 60; 
const WINDOW = 60000;

export default async function handler(req: Request) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const { message, history, grade, subject, deviceId } = await req.json();
    const now = Date.now();

    // 1. طبقة حماية من الإساءة (Rate Limiting) - مخففة جداً للطلاب
    const userLimit = rateMap.get(deviceId) || { count: 0, reset: now + WINDOW };
    if (now > userLimit.reset) {
      userLimit.count = 0;
      userLimit.reset = now + WINDOW;
    }
    if (userLimit.count >= LIMIT) {
      return new Response(JSON.stringify({ error: "أنت تذاكر بسرعة مذهلة! انتظر ثواني بسيطة لتستوعب المعلومة." }), { 
        status: 429, headers: { "Content-Type": "application/json" } 
      });
    }
    userLimit.count++;
    rateMap.set(deviceId, userLimit);

    // 2. فحص الكاش (استجابة فورية للأسئلة المكررة)
    const cacheKey = `${subject}_${grade}_${message.trim().toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const entry = cache.get(cacheKey)!;
      if (now - entry.ts < CACHE_TTL) return new Response(entry.value);
    }

    // 3. نظام توزيع الأحمال (Load Balancing) بين المفاتيح الـ 5
    const keys = [
      process.env.API_KEY,
      process.env.API_KEY_2,
      process.env.API_KEY_3,
      process.env.API_KEY_4,
      process.env.API_KEY_5
    ].filter(k => k && k.length > 10);

    // اختيار مفتاح عشوائي لكل طلب لتوزيع الضغط
    const selectedKey = keys[Math.floor(Math.random() * keys.length)] || process.env.API_KEY;

    const ai = new GoogleGenAI({ apiKey: selectedKey });
    const model = "gemini-3-flash-preview"; 

    const systemInstruction = `أنت "المعلم الذكي" لطلاب الثانوية بمصر. مادة ${subject} للصف ${grade}.
    اشرح بلهجة مصرية تعليمية ممتعة. استخدم جداول Markdown دائماً. ابدأ بكلمة "تمام".`;

    const result = await ai.models.generateContent({
      model: model,
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: { systemInstruction, temperature: 0.8 }
    });

    const output = result.text || "عذراً، أحتاج لحظة للتفكير. اسألني مرة ثانية.";
    
    // حفظ في الكاش لتسريع الطلبات القادمة
    cache.set(cacheKey, { value: output, ts: now });

    return new Response(output);

  } catch (error: any) {
    console.error("Backend Error:", error);
    // رسالة خطأ تقنية بدلاً من رسالة الانشغال
    return new Response(JSON.stringify({ error: "عذراً، حدث اضطراب بسيط في الاتصال. حاول إرسال سؤالك مرة أخرى." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
