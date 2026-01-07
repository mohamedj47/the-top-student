
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node'; 

const ALL_KEYS = [
  process.env.ELEVENLABS_API_KEY,
  process.env.API_KEY,
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  process.env.API_KEY_3,
  process.env.API_KEY_4,
  process.env.API_KEY_5
].filter(Boolean);

// تتبع المفاتيح المحظورة مؤقتاً في هذه الجلسة للسيرفر
const coolDownKeys = new Set();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { text, voiceId = "SAz9YHcvj6GT2YYXd8vo" } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  // تصفية المفاتيح المتاحة (ليست في فترة التبريد)
  let availableKeys = ALL_KEYS.filter(k => !coolDownKeys.has(k));
  if (availableKeys.length === 0) {
    coolDownKeys.clear(); // إعادة ضبط الكل إذا تعطل الجميع
    availableKeys = ALL_KEYS;
  }

  for (const apiKey of availableKeys) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        }),
      });

      if (response.status === 429) {
        coolDownKeys.add(apiKey);
        continue; // جرب المفتاح التالي
      }

      if (!response.ok) throw new Error('API Error');

      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(buffer);

    } catch (error) {
      coolDownKeys.add(apiKey);
    }
  }

  return res.status(500).json({ error: 'All keys exhausted' });
}
