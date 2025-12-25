
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2, RefreshCcw, Quote } from 'lucide-react';
import { generateAiSpeech, streamSpeech } from '../services/geminiService';

interface MessageBubbleProps {
  message: Message;
  subject?: Subject;
  onQuote?: (text: string) => void;
  onRetry?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, subject, onQuote, onRetry }) => {
  const isUser = message.sender === Sender.USER;
  const isError = message.text.includes("عذراً") || message.text.includes("مشغول");
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch(e) {}
      sourceRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleSpeech = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopAudio();
      return;
    }

    setIsAudioLoading(true);
    try {
      const base64Audio = await generateAiSpeech(message.text);
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) float32Data[i] = int16Data[i] / 32768.0;
        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceRef.current = source;
        setIsAudioLoading(false);
        setIsSpeaking(true);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else {
        setIsAudioLoading(false);
        setIsSpeaking(true);
        await streamSpeech(message.text, () => setIsSpeaking(false));
      }
    } catch (error) {
      setIsAudioLoading(false);
      setIsSpeaking(true);
      await streamSpeech(message.text, () => setIsSpeaking(false));
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTextClick = (e: React.MouseEvent) => {
    if (isUser || !onQuote) return;
    
    // الحصول على النص الموجود داخل العنصر الذي تم الضغط عليه (فقرة، سطر، خلية جدول)
    const target = e.target as HTMLElement;
    // تنظيف النص المقتبس من علامات الدولار فوراً عند التقاطه
    const clickedText = (target.innerText || target.textContent || "").replace(/\$/g, '').trim();
    
    if (clickedText) {
      e.stopPropagation();
      onQuote(clickedText);
    }
  };

  return (
    <div className={`flex w-full mb-3 pop-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2 md:gap-3 items-end`}>
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-emerald-600'}`}>
          {isUser ? <User size={14} /> : <Bot size={16} />}
        </div>
        <div className={`max-w-[90%] md:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div 
            onClick={handleTextClick}
            className={`px-4 py-2.5 rounded-2xl shadow-sm markdown-body text-sm md:text-base relative cursor-pointer hover:shadow-md transition-shadow active:scale-[0.995] ${
            isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 
            isError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-white border border-slate-100 text-slate-900 rounded-tl-none'
          }`}>
            {!isUser && (
              <div className="flex justify-end gap-2 mb-2 border-b border-slate-50 pb-1.5 no-print">
                {isError && onRetry && (
                  <button onClick={(e) => { e.stopPropagation(); onRetry(); }} className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded text-[9px] font-bold">
                    <RefreshCcw size={10} /> محاولة ثانية
                  </button>
                )}
                <button 
                  onClick={handleSpeech} 
                  disabled={isAudioLoading}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${isSpeaking ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}
                >
                  {isAudioLoading ? <Loader2 size={10} className="animate-spin" /> : (isSpeaking ? <StopCircle size={10} /> : <Volume2 size={10} />)}
                  <span>{isSpeaking ? 'إيقاف' : 'استمع'}</span>
                </button>
                <button onClick={handleCopy} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
                  {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
                <div className="text-[9px] text-slate-300 font-bold flex items-center gap-1"><Quote size={8}/> اضغط للنسخ للبحث</div>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
