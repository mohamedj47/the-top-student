
import { GoogleGenAI } from "@google/genai"; 

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { message, history, grade, subject } = await req.json();

    const systemInstruction = `أنت "المعلم الذكي" لطلاب الثانوية بمصر. مادة ${subject} للصف ${grade}.
    اشرح بلهجة مصرية تعليمية مشجعة واستخدم جداول Markdown للمقارنات والقوانين. ابدأ دائماً بكلمة "تمام".`;

    const keys = [
      process.env.API_KEY,
      process.env.API_KEY_1,
      process.env.API_KEY_2,
      process.env.API_KEY_3,
      process.env.API_KEY_4,
      process.env.API_KEY_5
    ].filter(k => k && k.length > 10);

    if (keys.length === 0) {
      return new Response(JSON.stringify({ text: "عذراً، نظام الذكاء الاصطناعي يحتاج لتفعيل المفاتيح." }), { status: 200 });
    }

    // محاولة الاتصال بالمفاتيح المتاحة بالتوالي
    for (const key of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key! });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [...history, { role: "user", parts: [{ text: message }] }],
          config: { 
            systemInstruction, 
            temperature: 0.7,
            topP: 0.95,
            topK: 40
          }
        });

        if (response && response.text) {
          return new Response(JSON.stringify({ text: response.text }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (e: any) {
        console.error("Key attempt failed:", e.message);
        continue; // جرب المفتاح التالي
      }
    }

    return new Response(JSON.stringify({ text: "المعذرة، جميع مفاتيح الخدمة مشغولة حالياً، حاول مرة أخرى بعد قليل." }), { status: 200 });

  } catch (error: any) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ text: "حدث خطأ فني في السيرفر، برجاء المحاولة لاحقاً." }), { status: 200 });
  }
}
