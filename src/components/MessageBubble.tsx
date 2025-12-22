
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2 } from 'lucide-react';
import { generateAiSpeech, streamSpeech, sanitizeForSpeech } from '../services/geminiService';

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
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeech = async () => {
    if (isSpeaking) {
      if (audioRef.current) audioRef.current.pause();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsAudioLoading(true);

    try {
      // 1. المحاولة الأولى: استخدام Gemini TTS (صوت Kore الاحترافي)
      const base64Audio = await generateAiSpeech(message.text);
      
      if (base64Audio) {
        const audioSrc = `data:audio/pcm;base64,${base64Audio}`;
        
        // فك تشفير الـ PCM الخام (Gemini يعيد PCM 16-bit 24kHz)
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768.0;
        }
        
        const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        setIsAudioLoading(false);
        setIsSpeaking(true);
        
        source.onended = () => setIsSpeaking(false);
        source.start();
        
        // حفظ المرجع للإيقاف
        (window as any).currentAudioSource = source;
      } else {
        // 2. المحاولة الثانية (الاحتياطية): استخدام المحرك الصوتي للجهاز
        setIsAudioLoading(false);
        setIsSpeaking(true);
        await streamSpeech(message.text, () => setIsSpeaking(false));
      }
    } catch (error) {
      console.error("Speech Error:", error);
      setIsAudioLoading(false);
      // محاولة أخيرة بالمحرك المحلي
      setIsSpeaking(true);
      await streamSpeech(message.text, () => setIsSpeaking(false));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const InteractiveText = ({ children }: { children: React.ReactNode }) => {
    if (isUser || !onQuote) return <>{children}</>;

    const processNode = (node: React.ReactNode): React.ReactNode => {
      if (typeof node === 'string') {
        const sentences = node.split(/(?<=[.؟!])\s+/);
        return sentences.map((s, i) => (
          <span 
            key={i} 
            onClick={(e) => {
              e.stopPropagation();
              onQuote(s.trim());
            }}
            className="cursor-help hover:bg-indigo-100/60 hover:text-indigo-900 rounded px-1 transition-all inline-block decoration-dotted decoration-indigo-300 underline-offset-4"
            title="اضغط أو المس للاستفسار عن هذه الجملة"
          >
            {s}{i < sentences.length - 1 ? ' ' : ''}
          </span>
        ));
      }
      if (React.isValidElement(node)) {
        const element = node as React.ReactElement<any>;
        return React.cloneElement(element, {
          children: React.Children.map(element.props.children, processNode)
        } as any);
      }
      return node;
    };

    return <>{React.Children.map(children, processNode)}</>;
  };

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
                  onClick={handleSpeech} 
                  disabled={isAudioLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isSpeaking ? 'bg-indigo-100 text-indigo-700 animate-pulse border-indigo-200 border' : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'}`}
                >
                  {isAudioLoading ? <Loader2 size={14} className="animate-spin" /> : (isSpeaking ? <StopCircle size={14} /> : <Volume2 size={14} />)}
                  <span>{isAudioLoading ? 'جاري التحضير...' : (isSpeaking ? 'إيقاف' : 'استمع بصوت Kore')}</span>
                </button>
                <button onClick={handleCopy} className="p-1 hover:text-indigo-600 transition-colors" title="نسخ">
                  {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            )}
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-4"><InteractiveText>{children}</InteractiveText></p>,
                li: ({ children }) => <li className="mb-2"><InteractiveText>{children}</InteractiveText></li>,
                h1: ({ children }) => <h1 className="text-2xl font-black mb-4"><InteractiveText>{children}</InteractiveText></h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mb-3"><InteractiveText>{children}</InteractiveText></h2>,
                h3: ({ children }) => <h3 className="text-lg font-bold mb-2"><InteractiveText>{children}</InteractiveText></h3>,
                td: ({ children }) => <td className="p-2 border border-slate-200"><InteractiveText>{children}</InteractiveText></td>,
                blockquote: ({ children }) => <blockquote className="border-r-4 border-indigo-500 pr-4 italic my-4"><InteractiveText>{children}</InteractiveText></blockquote>,
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
