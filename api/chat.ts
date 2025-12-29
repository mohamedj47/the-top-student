
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

// طبقة الكاش البسيطة (In-Memory) - تعمل بكفاءة على مستوى الـ Edge Node
const cache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // ساعة واحدة

// طبقة تحديد معدل الطلبات (Rate Limiter)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { message, history, grade, subject, deviceId } = await req.json();

    // 1. تطبيق الـ Rate Limiting (5 طلبات لكل دقيقة)
    const now = Date.now();
    const userLimit = rateLimit.get(deviceId) || { count: 0, resetTime: now + 60000 };
    
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + 60000;
    }

    if (userLimit.count >= 5) {
      return new Response(JSON.stringify({ error: 'أنت سريع جداً! خذ نفساً عميقاً وحاول بعد دقيقة.' }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    userLimit.count++;
    rateLimit.set(deviceId, userLimit);

    // 2. التحقق من الكاش (بناءً على السؤال والمادة)
    const cacheKey = `${subject}_${grade}_${message.trim().toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL) {
        return new Response(cached.response);
      }
    }

    // 3. استدعاء Gemini (Gemini 3 Flash للأداء العالي)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const systemInstruction = `
      أنت "المعلم الذكي" لطلاب الثانوية العامة بمصر.
      تحدث بلهجة مصرية تعليمية هادئة. رد في جداول Markdown دائماً. ابدأ بكلمة "تمام".
      أنت تشرح الآن مادة ${subject} للصف ${grade}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const fullText = response.text || "عذراً، لم أستطع توليد رد.";

    // 4. حفظ في الكاش
    cache.set(cacheKey, { response: fullText, timestamp: now });

    return new Response(fullText);

  } catch (error: any) {
    console.error('Backend Error:', error);
    return new Response(JSON.stringify({ error: 'حدث خطأ في عقل المعلم الذكي. حاول لاحقاً.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
