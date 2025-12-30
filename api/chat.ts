
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: "edge",
};

// كاش بسيط لتقليل استهلاك المفاتيح
const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 دقيقة

export default async function handler(req: Request) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const { message, history, grade, subject } = await req.json();
    const now = Date.now();

    // 1. فحص الكاش
    const cacheKey = `${subject}_${grade}_${message.trim().toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const entry = cache.get(cacheKey)!;
      if (now - entry.ts < CACHE_TTL) {
        return new Response(JSON.stringify({ text: entry.value }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const systemInstruction = `أنت "المعلم الذكي" لطلاب الثانوية بمصر. مادة ${subject} للصف ${grade}.
    اشرح بلهجة مصرية تعليمية ممتعة وجداول Markdown دائماً. ابدأ بكلمة "تمام".`;

    // 2. جمع كل المفاتيح الستة المتاحة
    const geminiKeys = [
      process.env.API_KEY,
      process.env.API_KEY_1,
      process.env.API_KEY_2,
      process.env.API_KEY_3,
      process.env.API_KEY_4,
      process.env.API_KEY_5
    ].filter(k => k && k.length > 10);

    const providers = ['gemini', 'openai'];
    let lastError = null;

    for (const provider of providers) {
      try {
        if (provider === 'gemini' && geminiKeys.length > 0) {
          // جرب كل مفتاح
          for (const key of geminiKeys) {
            try {
              const ai = new GoogleGenAI({ apiKey: key! });
              // محاولة موديل gemini-3 أولاً، ثم الهبوط لـ flash في حالة الفشل
              const modelsToTry = ['gemini-3-flash-preview', 'gemini-flash-latest'];
              
              for (const modelName of modelsToTry) {
                try {
                  const result = await ai.models.generateContent({
                    model: modelName,
                    contents: [...history, { role: "user", parts: [{ text: message }] }],
                    config: { systemInstruction, temperature: 0.8 }
                  });
                  
                  if (result.text) {
                    cache.set(cacheKey, { value: result.text, ts: now });
                    return new Response(JSON.stringify({ text: result.text }), {
                      headers: { "Content-Type": "application/json" }
                    });
                  }
                } catch (e) {
                  console.error(`Model ${modelName} failed with key`);
                  continue;
                }
              }
            } catch (e) {
              lastError = e;
              continue;
            }
          }
        } 
        
        else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
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
              ]
            })
          });
          
          if (resp.ok) {
            const data = await resp.json();
            const text = data.choices[0].message.content;
            cache.set(cacheKey, { value: text, ts: now });
            return new Response(JSON.stringify({ text: text }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    throw lastError || new Error("All keys and providers failed");

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: "المعلم مشغول حالياً بمراجعة أوراق الامتحانات، برجاء المحاولة مرة أخرى خلال لحظات." 
    }), { 
      status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
