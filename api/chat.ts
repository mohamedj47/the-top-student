import { GoogleGenAI } from "@google/genai";

/**
 * تشغيل على Edge Runtime (Vercel)
 */
export const config = {
  runtime: "edge",
};

/**
 * ===============================
 * Cache (In-Memory – Edge Safe)
 * ===============================
 */
const CACHE_TTL = 1000 * 60 * 60; // ساعة
const cache = new Map<string, { value: string; ts: number }>();

/**
 * ===============================
 * Rate Limit (Soft – Edge Friendly)
 * ===============================
 */
const RATE_LIMIT_WINDOW = 60_000; // دقيقة
const RATE_LIMIT_MAX = 5;
const rateMap = new Map<string, { count: number; reset: number }>();

/**
 * ===============================
 * Helpers
 * ===============================
 */
function getClientKey(req: Request, deviceId?: string) {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0] ||
    h.get("cf-connecting-ip") ||
    "unknown-ip";

  return `${deviceId || "anon"}_${ip}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("AI_TIMEOUT")),
      ms
    );

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * ===============================
 * API Handler
 * ===============================
 */
export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { message, history = [], grade, subject, deviceId } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "طلب غير صالح" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = Date.now();
    const clientKey = getClientKey(req, deviceId);

    /**
     * ---------- Rate Limit ----------
     */
    const limit =
      rateMap.get(clientKey) || {
        count: 0,
        reset: now + RATE_LIMIT_WINDOW,
      };

    if (now > limit.reset) {
      limit.count = 0;
      limit.reset = now + RATE_LIMIT_WINDOW;
    }

    if (limit.count >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({
          error: "أنت سريع جداً، حاول مرة أخرى بعد دقيقة.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    limit.count++;
    rateMap.set(clientKey, limit);

    /**
     * ---------- Cache ----------
     */
    const cacheKey = JSON.stringify({
      subject,
      grade,
      message: message.trim().toLowerCase(),
    });

    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL) {
      return new Response(cached.value);
    }

    /**
     * ---------- Gemini ----------
     */
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    const systemInstruction = `
أنت المعلم الذكي لطلاب الثانوية العامة في مصر.
اشرح بهدوء وبأسلوب مبسط وبلهجة مصرية تعليمية.
ابدأ الرد بكلمة "تمام".
استخدم Markdown وجداول عند الحاجة.
أنت تشرح مادة ${subject} للصف ${grade}.
`;

    const result = await withTimeout(
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          ...history,
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      }),
      12_000 // 12 ثانية Timeout
    );

    const text =
      result.text || "تمام، خلّينا نعيد الشرح بطريقة أبسط.";

    /**
     * ---------- Save Cache ----------
     */
    cache.set(cacheKey, { value: text, ts: now });

    return new Response(text);

  } catch (error: any) {
    console.error("API Error:", error);

    const msg =
      error?.message === "AI_TIMEOUT"
        ? "الشرح بياخد وقت أطول من المعتاد، حاول تاني."
        : "حصل ضغط على المعلم الذكي، حاول بعد لحظة.";

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
