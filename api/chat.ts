
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: "edge",
};

// كاش محلي سريع جداً للأسئلة الشائعة
const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 دقيقة

// تحديد معدل الطلبات
const rateMap = new Map<string, { count: number; reset: number }>();
const LIMIT = 60; 
const WINDOW = 60000;

export default async function handler(req: Request) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const { message, history, grade, subject, deviceId } = await req.json();
    const now = Date.now();

    // 1. حماية من الإساءة
    const userLimit = rateMap.get(deviceId) || { count: 0, reset: now + WINDOW };
    if (now > userLimit.reset) {
      userLimit.count = 0;
      userLimit.reset = now + WINDOW;
    }
    if (userLimit.count >= LIMIT) {
      return new Response(JSON.stringify({ error: "أنت تذاكر بسرعة مذهلة! انتظر دقيقة." }), { 
        status: 429, headers: { "Content-Type": "application/json" } 
      });
    }
    userLimit.count++;
    rateMap.set(deviceId, userLimit);

    // 2. فحص الكاش
    const cacheKey = `${subject}_${grade}_${message.trim().toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const entry = cache.get(cacheKey)!;
      if (now - entry.ts < CACHE_TTL) return new Response(entry.value);
    }

    // 3. قائمة المزودين المتاحين (Providers)
    const providers = [];

    // إضافة Gemini إذا وجد
    const geminiKeys = [process.env.API_KEY, process.env.API_KEY_2, process.env.API_KEY_3].filter(k => k && k.length > 10);
    if (geminiKeys.length > 0) providers.push('gemini');

    // إضافة OpenAI إذا وجد
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10) providers.push('openai');

    // إضافة DeepSeek إذا وجد
    if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 10) providers.push('deepseek');

    // اختيار مزود عشوائي
    const selectedProvider = providers[Math.floor(Math.random() * providers.length)] || 'gemini';
    
    let output = "";
    const systemInstruction = `أنت "المعلم الذكي" لطلاب الثانوية بمصر. مادة ${subject} للصف ${grade}.
    اشرح بلهجة مصرية تعليمية ممتعة وجداول Markdown دائماً. ابدأ بكلمة "تمام".`;

    if (selectedProvider === 'openai') {
      // تنفيذ طلب OpenAI
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            ...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
            { role: 'user', content: message }
          ],
          temperature: 0.7
        })
      });
      const data = await resp.json();
      output = data.choices[0].message.content;
    } 
    else if (selectedProvider === 'deepseek') {
      // تنفيذ طلب DeepSeek
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemInstruction },
            ...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
            { role: 'user', content: message }
          ],
          stream: false
        })
      });
      const data = await resp.json();
      output = data.choices[0].message.content;
    } 
    else {
      // تنفيذ طلب Gemini (المزود الافتراضي)
      const selectedKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)] || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey: selectedKey! });
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: "user", parts: [{ text: message }] }],
        config: { systemInstruction, temperature: 0.8 }
      });
      output = result.text || "";
    }

    if (!output) throw new Error("Empty response from provider");

    // حفظ في الكاش
    cache.set(cacheKey, { value: output, ts: now });

    return new Response(output);

  } catch (error: any) {
    console.error("Multi-Provider Error:", error);
    return new Response(JSON.stringify({ error: "عذراً، المعلم يراجع بعض الأوراق. حاول مرة أخرى خلال ثوانٍ." }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
