import React, { useState, useEffect, useRef } from 'react';
import { Printer, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { streamSpeech } from '../services/geminiService';

export const FloatingTools: React.FC = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopAudio = () => {
    isSpeakingRef.current = false;

    sourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch {}
    });

    sourcesRef.current = [];
    setIsSpeaking(false);
    setIsLoading(false);
  };

  const handlePrint = () => {
    window.scrollTo(0, 0);
    window.print();
  };

  const handleReadPage = async () => {
    if (isSpeaking) {
      stopAudio();
      return;
    }

    let textToRead = '';

    const contentElements = document.querySelectorAll('.markdown-body');
    if (contentElements.length > 0) {
      contentElements.forEach(el => {
        textToRead += (el as HTMLElement).innerText + ' . ';
      });
    } else {
      const headers = document.querySelectorAll('h1, h2, h3, p');
      headers.forEach(el => {
        textToRead += (el as HTMLElement).innerText + ' . ';
      });
    }

    if (!textToRead.trim()) return;

    setIsLoading(true);
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setIsLoading(false);

      await streamSpeech(textToRead, () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      });
    } catch (error) {
      console.error('Read page error:', error);
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
        title={isSpeaking ? 'إيقاف القراءة' : 'قراءة الصفحة بالكامل'}
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
