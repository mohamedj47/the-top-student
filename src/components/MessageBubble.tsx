// ================ بداية الكود الكامل لملف MessageBubble.tsx ================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  subject?: Subject;
  onQuote?: (text: string) => void;
  onTermClick?: (term: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, subject, onQuote, onTermClick }) => {
  const isUser = message.sender === Sender.USER;
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // سنستخدم هذا المتغير للاحتفاظ بمرجع للكائن الصوتي للتحكم فيه (مثل الإيقاف)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // دالة لتنظيف الموارد والتأكد من توقف أي صوت عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // دالة بناء النص التعليمي (احتفظنا بها كما هي لأنها ممتازة!)
  const buildEducationalSpeechText = (rawText: string): string => {
    let base = rawText
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`.*?`/g, ' ')
      .replace(/\[.*?\]\(.*?\)/g, ' ')
      .replace(/[\[\]{}()]/g, ' ')
      .replace(/[*#~_]/g, '')
      .replace(/[—-]/g, ' ، ');
    const lines = base.split('\n');
    let listCounter = 0;
    const transformedLines: string[] = [];
    lines.forEach(line => {
      let l = line.trim();
      if (!l) return;
      if (l.startsWith('#') || (l.length < 50 && l.endsWith(':'))) {
        transformedLines.push(`خلّينا نركز في الجزء ده ، ${l.replace(/[#:]/g, '')}`);
        listCounter = 0;
        return;
      }
      if (/^(\d+[-.)]|\*|-)/.test(l)) {
        const content = l.replace(/^(\d+[-.)]|\*|-)/, '').trim();
        listCounter++;
        const prefix = listCounter === 1 ? 'أول نقطة هي ' : 'النقطة اللي بعدها هي ';
        transformedLines.push(`${prefix} ${content}`);
        return;
      } else {
        listCounter = 0;
      }
      if (l.includes('مثال')) {
        transformedLines.push(`خلّينا نشوف مثال بسيط ، ${l}`);
        return;
      }
      transformedLines.push(l);
    });
    return transformedLines.join(' . ');
  };

  const speak = useCallback(async () => {
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
      return;
    }
    
    const textToSpeak = buildEducationalSpeechText(message.text);
    if (!textToSpeak) return;

    setIsSpeaking(true);

    try {
      // ******** هذا هو السطر الوحيد الذي تم تغييره ********
      const response = await fetch('https://audio-server-vrbp.onrender.com/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      });

      if (!response.ok) {
        throw new Error('فشل الخادم في إنشاء الصوت.');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        console.error("حدث خطأ أثناء تشغيل الملف الصوتي.");
      };
    } catch (error) {
      console.error("خطأ في التواصل مع خادم الصوت:", error);
      // تم تحسين رسالة الخطأ للمستخدم
      alert("حدث خطأ أثناء محاولة تشغيل الصوت. يرجى المحاولة مرة أخرى.");
      setIsSpeaking(false);
    }
  }, [isSpeaking, message.text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ----- لا يوجد أي تغيير في الجزء المرئي (return) -----
  return (
    <div className={`flex w-full mb-4 pop-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {isUser ? <User size={20} /> : <Bot size={22} />}
        </div>
        <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-3 rounded-2xl shadow-sm markdown-body text-base md:text-lg leading-relaxed relative ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'}`}>
            {!isUser && (
              <div className="flex justify-end gap-2 mb-2 border-b border-slate-100 pb-2 no-print">
                <button 
                  onClick={speak} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isSpeaking ? 'bg-indigo-100 text-indigo-700 animate-pulse border-indigo-200 border' : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'}`}
                >
                  {isSpeaking ? <StopCircle size={14} /> : <Volume2 size={14} />}
                  <span>{isSpeaking ? 'إيقاف الشرح' : 'استمع للشرح'}</span>
                </button>
                <button onClick={handleCopy} className="p-1 hover:text-indigo-600 transition-colors" title="نسخ">
                  {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  ); 
};

// ================ نهاية الكود الكامل لملف MessageBubble.tsx ================
