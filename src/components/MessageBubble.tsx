
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Volume2, StopCircle, Loader2, Play, Radio, Share2, Download } from 'lucide-react';
import { 
  streamSpeech, 
  generateGeminiSpeech, 
  generateElevenLabsSpeech,
  generatePodcastAudio,
  cleanMathNotation, 
  decodeBase64, 
  decodePcmAudio, 
  sanitizeForSpeech 
} from '../services/geminiService';
import { AudioCache } from '../lib/audioCache';

const InteractiveText: React.FC<{ text: any, onQuote?: (t: string) => void, onPlay?: (t: string) => void }> = ({ text, onQuote, onPlay }) => {
  if (!text || typeof text !== 'string') return <>{text}</>;
  const sentences = text.split(/(?<=[.،؟!:\n])\s+/);
  return (
    <>
      {sentences.map((sentence, idx) => {
        const trimmed = sentence.trim();
        if (!trimmed) return sentence;
        return (
          <span key={idx} className="group relative inline">
            <span 
              onClick={(e) => { e.stopPropagation(); onQuote?.(trimmed); }} 
              className="hover:bg-indigo-100/80 hover:text-indigo-900 cursor-pointer rounded-md px-1 py-0.5 transition-all font-bold active:bg-indigo-200"
            >
              {sentence}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onPlay?.(trimmed); }} 
              className="opacity-0 group-hover:opacity-100 ml-1 inline-flex items-center justify-center w-5 h-5 bg-indigo-500 text-white rounded-full transition-opacity align-middle no-print"
            >
              <Play size={10} fill="currentColor" />
            </button>
          </span>
        );
      })}
    </>
  );
};

export const MessageBubble: React.FC<{ message: Message, subject?: Subject, onQuote?: (t: string) => void }> = ({ message, subject, onQuote }) => {
  const isUser = message.sender === Sender.USER;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeechLoading, setIsAiSpeechLoading] = useState(false);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    setIsSpeaking(false);
  };

  const handleExportToNotebook = () => {
    // تجهيز الملف للرفع
    const content = `Subject: ${subject}\nDate: ${new Date().toLocaleDateString()}\n\n${message.text}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tutor_Source_${subject}_${Date.now()}.txt`;
    a.click();
    // فتح الموقع
    window.open('https://notebooklm.google.com/', '_blank');
  };

  const handlePodcast = async () => {
    if (isSpeaking) { stopAudio(); return; }
    setIsPodcastLoading(true);
    setIsSpeaking(true);
    
    try {
      const audioData = await generatePodcastAudio(subject || 'الدرس المختار', message.text);
      if (audioData) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const ctx = audioContextRef.current;
        const buffer = await decodePcmAudio(decodeBase64(audioData), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        activeSourcesRef.current.add(source);
        source.onended = () => {
            activeSourcesRef.current.delete(source);
            if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
        };
      } else {
        setIsSpeaking(false);
      }
    } catch (e) {
      setIsSpeaking(false);
    } finally {
      setIsPodcastLoading(false);
    }
  };

  const handlePlayText = async (textToPlay: string) => {
    if (isSpeaking) { stopAudio(); return; }
    setIsSpeaking(true);
    setIsAiSpeechLoading(true);
    
    try {
      const cleanText = sanitizeForSpeech(textToPlay);
      const cacheKey = AudioCache.generateKey(cleanText);
      
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      
      const cached = await AudioCache.get(cacheKey);
      let buffer: AudioBuffer | null = null;
      
      if (cached) {
        buffer = await ctx.decodeAudioData(decodeBase64(cached).buffer).catch(async () => {
           return await decodePcmAudio(decodeBase64(cached), ctx, 24000, 1);
        });
      } else {
        const geminiAudio = await generateGeminiSpeech(cleanText);
        if (geminiAudio) {
          buffer = await decodePcmAudio(decodeBase64(geminiAudio), ctx, 24000, 1);
          await AudioCache.save(cacheKey, geminiAudio);
        }
      }
      
      setIsAiSpeechLoading(false);
      
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        activeSourcesRef.current.add(source);
        source.onended = () => { 
          activeSourcesRef.current.delete(source); 
          if (activeSourcesRef.current.size === 0) setIsSpeaking(false); 
        };
      } else { 
        await streamSpeech(cleanText, () => setIsSpeaking(false)); 
      }
    } catch (err) { 
      setIsAiSpeechLoading(false); 
      await streamSpeech(textToPlay, () => setIsSpeaking(false)); 
    }
  };

  return (
    <div className={`flex w-full mb-4 pop-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-emerald-600'}`}>
          {isUser ? <User size={14} /> : <Bot size={16} />}
        </div>
        <div className={`max-w-[90%] md:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {message.attachment && (
            <div className="mb-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-sm overflow-hidden">
              <img src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} alt="attachment" className="w-full rounded-xl" />
            </div>
          )}
          <div className={`px-4 py-3 rounded-2xl shadow-sm text-[15px] md:text-[16px] relative text-right ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-900 rounded-tl-none'}`}>
            {!isUser && (
              <div className="flex justify-end gap-2 mb-2 border-b border-slate-50 pb-2 no-print overflow-x-auto scrollbar-hide">
                <button onClick={() => handlePlayText(message.text)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${isSpeaking ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                  {isAiSpeechLoading ? <Loader2 size={12} className="animate-spin" /> : (isSpeaking ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                  <span>{isSpeaking ? 'إيقاف' : 'استمع'}</span>
                </button>
                
                {message.text.length > 250 && (
                  <>
                    <button 
                      onClick={handlePodcast} 
                      title="تحويل الشرح لبودكاست حواري"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${isPodcastLoading ? 'bg-amber-500 text-white animate-pulse' : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100'}`}
                    >
                      {isPodcastLoading ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
                      <span>بودكاست الشرح</span>
                    </button>
                    
                    <button 
                      onClick={handleExportToNotebook}
                      title="تصدير لـ NotebookLM للبحث المتعمق"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 transition-all shrink-0 hover:bg-blue-100"
                    >
                      <Share2 size={12} />
                      <span>لـ NotebookLM</span>
                    </button>
                  </>
                )}
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              p: ({children}) => <p className="mb-2 last:mb-0 leading-[1.8] font-bold"><InteractiveText text={children} onQuote={onQuote} onPlay={handlePlayText} /></p>,
              li: ({children}) => <li className="mb-1 leading-[1.8] font-bold"><InteractiveText text={children} onQuote={onQuote} onPlay={handlePlayText} /></li>,
              td: ({children}) => <td className="p-2 border-b border-slate-50 font-bold"><InteractiveText text={children} onQuote={onQuote} onPlay={handlePlayText} /></td>
            }}>{cleanMathNotation(message.text)}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
