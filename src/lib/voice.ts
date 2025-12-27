// ===================
// Kore (Browser local)
// ===================
export async function speakWithKore(text: string) {
  return new Promise<void>((resolve, reject) => {
    const synth = window.speechSynthesis;

    const waitForVoices = () => {
      const voices = synth.getVoices();
      const kore = voices.find(v =>
        v.name.toLowerCase().includes("kore")
      );

      if (!kore) {
        reject();
        return;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = kore;
      utter.lang = "ar-EG";
      utter.rate = 0.95;
      utter.pitch = 1;

      utter.onend = () => resolve();
      utter.onerror = () => reject();

      synth.speak(utter);
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = waitForVoices;
    } else {
      waitForVoices();
    }
  });
}

// =========================
// ElevenLabs via Vercel API
// =========================
export async function speakWithTeacher(text: string) {
  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error();

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
}

// ==========================
// Smart Switch
// ==========================
export async function speak(text: string) {
  try {
    await speakWithKore(text);
  } catch {
    await speakWithTeacher(text);
  }
}
