
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2, Lightbulb, X, Sparkles } from 'lucide-react'; import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Volume2, StopCircle, Loader2, Play, ImageIcon } from 'lucide-react';
import { 
  streamSpeech, 
  generateGeminiSpeech, 
  cleanMathNotation, 
  decodeBase64, 
  decodePcmAudio, 
  sanitizeForSpeech 
} from '../services/geminiService';
import { AudioCache } from '../lib/audioCache';

const InteractiveText: React.FC<{ text: any, onQuote?: (t: string) => void, onPlay?: (t: string) => void }> = ({ text, onQuote, onPlay }) => {
  if (!text) return null;
  if (typeof text !== 'string') return <>{text}</>;

  // تقسيم النص إلى جمل بناءً على علامات الترقيم العربية والإنجليزية
  const sentences = text.split(/(?<=[.،؟!:\n])\s+/);
  
  return (
    <>
      {sentences.map((sentence, idx) => {
        const trimmed = sentence.trim();
        if (!trimmed) return sentence;
        return (
          <span key={idx} className="group relative inline">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                onQuote?.(trimmed);
              }} 
              className="hover:bg-indigo-100/80 hover:text-indigo-900 cursor-pointer rounded-md px-1 py-0.5 transition-all font-bold active:bg-indigo-200"
              title="اضغط للسؤال عن هذا الجزء"
            >
              {sentence}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.(trimmed);
              }} 
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    setIsSpeaking(false);
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
        buffer = await decodePcmAudio(decodeBase64(cached), ctx, 24000, 1);
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

  const renderInteractive = (children: any) => {
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        return <InteractiveText text={child} onQuote={onQuote} onPlay={handlePlayText} />;
      }
      return child;
    });
  };

  return (
    <div className={`flex w-full mb-4 pop-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-emerald-600'}`}>
          {isUser ? <User size={14} /> : <Bot size={16} />}
        </div>
        <div className={`max-w-[90%] md:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {message.attachment && message.attachment.type === 'image' && (
            <div className="mb-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-sm overflow-hidden group relative">
              <img src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} alt="attachment" className="w-full rounded-xl" />
            </div>
          )}

          <div className={`px-4 py-3 rounded-2xl shadow-sm text-[15px] md:text-[16px] relative text-right ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-900 rounded-tl-none'}`}>
            {!isUser && (
              <div className="flex justify-end gap-2 mb-2 border-b border-slate-50 pb-2 no-print">
                <button onClick={() => handlePlayText(message.text)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${isSpeaking ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                  {isAiSpeechLoading ? <Loader2 size={12} className="animate-spin" /> : (isSpeaking ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                  <span>{isSpeaking ? 'إيقاف' : 'استمع'}</span>
                </button>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              p: ({children}) => <p className="mb-2 last:mb-0 leading-[1.8] font-bold">{renderInteractive(children)}</p>,
              li: ({children}) => <li className="mb-1 leading-[1.8] font-bold">{renderInteractive(children)}</li>,
              td: ({children}) => <td className="p-2 border-b border-slate-50 font-bold">{renderInteractive(children)}</td>
            }}>{cleanMathNotation(message.text)}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
import { streamSpeech, generateAiSpeech, cleanMathNotation, decodeBase64, decodePcmAudio } from '../services/geminiService';

const InteractiveText: React.FC<{ text: string, onQuote?: (t: string) => void }> = ({ text, onQuote }) => {
  if (!text) return null;
  
  // تحسين التقسيم: عدم تقسيم الرموز الرياضية الشائعة مثل \frac أو \sqrt أو \Rightarrow
  // سنقوم بالتقسيم بناءً على علامات الترقيم العربية والانجليزية والسطور الجديدة فقط
  const sentences = text.split(/(?<=[.،؟!:\n])\s+/);
  
  return (
    <>
      {sentences.map((sentence, idx) => {
        const trimmed = sentence.trim();
        if (!trimmed || trimmed.length < 1) return sentence;
        
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onQuote) {
                onQuote(trimmed);
              }
            }}
            className="hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer rounded px-1 transition-all duration-200 inline-block md:inline decoration-indigo-300/30 decoration-dotted hover:underline font-semibold active:scale-[0.98] active:bg-indigo-100"
            title="انقر للاستفسار عن هذا الجزء"
          >
            {sentence}
          </span>
        );
      })}
    </>
  );
};

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  useEffect(() => {
    const render = async () => {
      if (ref.current && (window as any).mermaid) {
        try {
          const { svg } = await (window as any).mermaid.render(
            `mermaid-${Math.random().toString(36).substr(2, 9)}`,
            chart.trim()
          );
          setSvg(svg);
        } catch (e) { setSvg(''); }
      }
    };
    render();
  }, [chart]);
  if (!svg) return null;
  return (
    <div 
      ref={ref} 
      className="mermaid-container flex justify-center bg-white p-4 rounded-xl border border-slate-100 my-4 shadow-sm overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

interface MessageBubbleProps {
  message: Message;
  subject?: Subject;
  onQuote?: (text: string) => void;
  onRetry?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, subject, onQuote, onRetry }) => {
  const isUser = message.sender === Sender.USER;
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeechLoading, setIsAiSpeechLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const displayChatText = cleanMathNotation(message.text);

  const stopAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
        sourceNodeRef.current = null;
    }
    if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
        htmlAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
      return () => stopAudio();
  }, []);

  const handleSpeech = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopAudio();
      return;
    }

    setIsSpeaking(true);
    setIsAiSpeechLoading(true);

    try {
        const aiAudio = await generateAiSpeech(displayChatText);
        setIsAiSpeechLoading(false);

        if (aiAudio && aiAudio.data) {
            if (aiAudio.source === 'gemini' && typeof aiAudio.data === 'string') {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
                const ctx = audioContextRef.current;
                const bytes = decodeBase64(aiAudio.data);
                const buffer = await decodePcmAudio(bytes, ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.onended = () => setIsSpeaking(false);
                sourceNodeRef.current = source;
                source.start();
            } else if (aiAudio.source === 'api' && aiAudio.data instanceof Blob) {
                const audioUrl = URL.createObjectURL(aiAudio.data);
                const audio = new Audio(audioUrl);
                htmlAudioRef.current = audio;
                audio.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                };
                audio.play();
            }
        } else {
            await streamSpeech(displayChatText, () => setIsSpeaking(false));
        }
    } catch (err) {
        console.error("Audio playback error:", err);
        setIsAiSpeechLoading(false);
        await streamSpeech(displayChatText, () => setIsSpeaking(false));
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(displayChatText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // وظيفة مساعدة لمعالجة الأطفال (Children) وتطبيق InteractiveText عليهم
  const wrapWithInteractive = (children: any) => {
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        return <InteractiveText text={child} onQuote={onQuote} />;
      }
      return child;
    });
  };

  const markdownComponents = {
    p: ({ children }: any) => (
      <p className="mb-3 last:mb-0 leading-[1.9] font-medium">
        {wrapWithInteractive(children)}
      </p>
    ),
    li: ({ children }: any) => (
      <li className="mb-2 leading-[1.9] font-medium">
        {wrapWithInteractive(children)}
      </li>
    ),
    td: ({ children }: any) => (
      <td className="p-3 border-b border-slate-50 text-right">
        {wrapWithInteractive(children)}
      </td>
    ),
    code({node, className, children, ...props}: any) {
      const match = /language-mermaid/.exec(className || '')
      return !props.inline && match ? (
        <MermaidDiagram chart={String(children).replace(/\n$/, '')} />
      ) : (
        <code className={className} {...props}>{children}</code>
      )
    }
  };

  return (
    <div className={`flex w-full mb-4 pop-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-emerald-600'}`}>
          {isUser ? <User size={16} /> : <Bot size={18} />}
        </div>
        <div className={`max-w-[95%] md:max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-3 rounded-2xl shadow-sm markdown-body text-[15px] md:text-[17px] relative transition-all ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-900 rounded-tl-none'}`}>
            {!isUser && (
              <div className="flex justify-end gap-2 mb-2 border-b border-slate-50 pb-2">
                <button 
                  onClick={handleSpeech} 
                  disabled={isAiSpeechLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${isSpeaking ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}
                >
                  {isAiSpeechLoading ? <Loader2 size={12} className="animate-spin" /> : (isSpeaking ? <StopCircle size={12} /> : <Volume2 size={12} />)}
                  <span>{isSpeaking ? 'إيقاف' : 'استمع'}</span>
                </button>
                <button onClick={handleCopy} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                  {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>{displayChatText}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
