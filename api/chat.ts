import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: "edge",
};

const CACHE_TTL = 1000 * 60 * 60; // ساعة
const cache = new Map<string, { value: string; ts: number }>();

function getClientKey(req: Request, deviceId?: string) {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0] ||
    h.get("cf-connecting-ip") ||
    "unknown";
  return `${deviceId || "anon"}_${ip}`;
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { message, history, grade, subject, deviceId } = body;

    const clientKey = getClientKey(req, deviceId);
    const now = Date.now();

    // ---------- Cache ----------
    const cacheKey = JSON.stringify({
      subject,
      grade,
      message: message.trim().toLowerCase(),
    });

    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL) {
      return new Response(cached.value);
    }

    // ---------- Timeout ----------
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    // ---------- AI ----------
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    const systemInstruction = `
أنت المعلم الذكي لطلاب الثانوية العامة بمصر.
اشرح بهدوء وبأسلوب مبسط وبلهجة مصرية تعليمية.
ابدأ الرد بكلمة "تمام".
استخدم Markdown وجداول عند الحاجة.
أنت تشرح مادة ${subject} للصف ${grade}.
`;

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = result.text || "تمام، خلّينا نحاول بصيغة أبسط.";

    cache.set(cacheKey, { value: text, ts: now });

    return new Response(text);

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "حصل ضغط على المعلم الذكي، حاول بعد لحظة." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
