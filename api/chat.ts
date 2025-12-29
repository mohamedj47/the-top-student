
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: "edge",
};

// كاش محلي على مستوى الـ Edge Node لتوفير التكلفة
const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // ساعة واحدة

// تحديد معدل الطلبات لكل جهاز (deviceId)
const rateMap = new Map<string, { count: number; reset: number }>();
const LIMIT = 5;
const WINDOW = 60000;

export default async function handler(req: Request) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const { message, history, grade, subject, deviceId } = await req.json();
    const now = Date.now();

    // 1. Rate Limiting Layer
    const userLimit = rateMap.get(deviceId) || { count: 0, reset: now + WINDOW };
    if (now > userLimit.reset) {
      userLimit.count = 0;
      userLimit.reset = now + WINDOW;
    }
    if (userLimit.count >= LIMIT) {
      return new Response(JSON.stringify({ error: "هدّي السرعة شوية يا بطل! 5 طلبات بس في الدقيقة." }), { 
        status: 429, headers: { "Content-Type": "application/json" } 
      });
    }
    userLimit.count++;
    rateMap.set(deviceId, userLimit);

    // 2. Cache Layer (In-Memory)
    const cacheKey = `${subject}_${grade}_${message.trim().toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const entry = cache.get(cacheKey)!;
      if (now - entry.ts < CACHE_TTL) return new Response(entry.value);
    }

    // 3. AI Execution (Server-Side Only)
    // Always use process.env.API_KEY directly as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Use allowed model gemini-3-flash-preview instead of prohibited gemini-1.5-flash
    const model = "gemini-3-flash-preview"; 

    const systemInstruction = `أنت "المعلم الذكي" لطلاب الثانوية بمصر. مادة ${subject} للصف ${grade}.
    اشرح بلهجة مصرية مبسطة. استخدم جداول Markdown دائماً لتنظيم المعلومات. ابدأ بكلمة "تمام".`;

    const result = await ai.models.generateContent({
      model: model,
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: { systemInstruction, temperature: 0.7 }
    });

    // Access .text property directly (not a method) as per guidelines
    const output = result.text || "عذراً، لم أتمكن من استيعاب السؤال حالياً.";
    
    // حفظ في الكاش قبل الرد
    cache.set(cacheKey, { value: output, ts: now });

    return new Response(output);

  } catch (error: any) {
    console.error("Backend Error:", error);
    return new Response(JSON.stringify({ error: "المعلم مشغول حالياً مع 10,000 طالب، حاول كمان دقيقة." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
