
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { streamSpeech, generateAiSpeech } from '../services/geminiService';

export const FloatingTools: React.FC = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const stopAudio = () => {
    isSpeakingRef.current = false;
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current = [];
    setIsSpeaking(false);
    setIsLoading(false);
    nextStartTimeRef.current = 0;
  };

  const handlePrint = () => {
    window.scrollTo(0, 0);
    window.print();
  };

  const scheduleChunk = (base64: string) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      sourcesRef.current.push(source);
      source.onended = () => {
        const index = sourcesRef.current.indexOf(source);
        if (index > -1) sourcesRef.current.splice(index, 1);
        if (sourcesRef.current.length === 0 && ctx.currentTime >= nextStartTimeRef.current - 0.1) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        }
      };
    } catch (e) {
      console.error("Schedule error", e);
    }
  };

  const handleReadPage = async () => {
    if (isSpeaking) {
      stopAudio();
      return;
    }

    // تجميع النص من الصفحة بشكل ذكي
    let textToRead = "";
    const contentElements = document.querySelectorAll('.markdown-body');
    if (contentElements.length > 0) {
      contentElements.forEach(el => {
        textToRead += (el as HTMLElement).innerText + " . ";
      });
    } else {
      const mainHeaders = document.querySelectorAll('h1, h2, h3');
      mainHeaders.forEach(h => {
        textToRead += (h as HTMLElement).innerText + " . ";
      });
    }

    if (!textToRead.trim()) return;

    setIsLoading(true);
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      nextStartTimeRef.current = audioContextRef.current.currentTime;

      // Fix: Adjusting the call to use generateAiSpeech for high-quality audio
      // and ensuring streamSpeech call matches its 2-argument signature.
      const base64 = await generateAiSpeech(textToRead);
      if (base64) {
        setIsLoading(false);
        scheduleChunk(base64);
      } else {
        setIsLoading(false);
        await streamSpeech(textToRead, () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        });
      }
    } catch (e) {
      console.error("Global Read error", e);
      stopAudio();
    }
  };

  return (
    <div className="fixed top-20 left-4 z-50 flex flex-col gap-3 no-print group">
      <div className="absolute -top-8 left-0 bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold shadow-sm">
        أدوات الطالب
      </div>

      <button
        onClick={handleReadPage}
        disabled={isLoading}
        className={`p-3 rounded-full shadow-lg transition-all border-2 border-white hover:scale-105 flex items-center justify-center ${
          isSpeaking 
          ? 'bg-red-500 text-white animate-pulse' 
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        title={isSpeaking ? "إيقاف القراءة" : "قراءة الصفحة بالكامل"}
      >
        {isLoading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : isSpeaking ? (
          <VolumeX size={20} />
        ) : (
          <Volume2 size={20} />
        )}
      </button>

      <button
        onClick={handlePrint}
        className="p-3 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-900 transition-all border-2 border-white hover:scale-105"
        title="طباعة / حفظ PDF"
      >
        <Printer size={20} />
      </button>
    </div>
  );
};
