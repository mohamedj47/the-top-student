
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!text) return res.status(400).json({ error: 'Text is required' });
  if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

  // Voice ID for "Arabic Female Teacher" - Bella style (Multilingual v2)
  const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.85,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API returned ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(buffer);
  } catch (error) {
    console.error('Voice API Error:', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
}
