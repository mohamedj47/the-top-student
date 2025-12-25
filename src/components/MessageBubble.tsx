import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2, RefreshCcw, Quote, Lightbulb, X } from 'lucide-react'; // 1. أضفنا أيقونات جديدة
import { generateAiSpeech, streamSpeech } from '../services/geminiService';

interface MessageBubbleProps {
  message: Message;
  subject?: Subject;
  onQuote?: (text: string) => void;
  onRetry?: () => void;
}

export function MessageBubble({ message, subject, onQuote, onRetry }: MessageBubbleProps) {
  const isUser = message.sender === Sender.USER;
  const isError = message.text.includes("عذراً") || message.text.includes("مشغول");
  
  // --- START: الكود الجديد الذي أضفناه ---
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const visualDescription = !isUser && message.visualDescription;
  // --- END: الكود الجديد الذي أضفناه ---

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
    
    const target = e.target as HTMLElement;
    const clickedText = (target.innerText || target.textContent || "").replace(/\$/g, '').trim();
    
    if (clickedText) {
      e.stopPropagation();
      onQuote(clickedText);
    }
  };

  return (
    <> {/* 2. استخدمنا Fragment للسماح بوجود النافذة المنبثقة */}
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
                <div className="flex justify-end items-center gap-2 mb-2 border-b border-slate-50 pb-1.5 no-print">
                  {/* --- START: 3. الكود الجديد لزر "بسطها لي" --- */}
                  {visualDescription && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsVisualizerOpen(true); }}
                      className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:bg-amber-200"
                    >
                      <Lightbulb size={10} />
                      <span>بسطها لي</span>
                    </button>
                  )}
                  {/* --- END: الكود الجديد لزر "بسطها لي" --- */}

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
                  <button onClick={handleCopy} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                    {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                  <div className="text-[9px] text-slate-400 font-bold flex-grow text-right pr-2"><Quote size={8} className="inline-block ml-1"/> اضغط على أي نص للبحث عنه</div>
                </div>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
      
      {/* --- START: 4. الكود الجديد للنافذة المنبثقة --- */}
      {isVisualizerOpen && visualDescription && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 no-print"
          onClick={() => setIsVisualizerOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8 relative pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsVisualizerOpen(false)}
              className="absolute top-3 left-3 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5"
            >
              <X size={16} className="text-slate-600"/>
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 text-amber-600 p-2 rounded-full">
                <Lightbulb size={20} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">تبسيط المفهوم</h3>
            </div>
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-base">
              {visualDescription}
            </div>
          </div>
        </div>
      )}
      {/* --- END: الكود الجديد للنافذة المنبثقة --- */}
    </>
  );
};
