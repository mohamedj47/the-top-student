
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2, Lightbulb, X, Sparkles } from 'lucide-react';
import { streamSpeech, generateAiSpeech, cleanMathNotation, decodeBase64, decodePcmAudio } from '../services/geminiService';

const InteractiveText: React.FC<{ text: string, onQuote?: (t: string) => void }> = ({ text, onQuote }) => {
  if (!text) return null;
  // تقسيم النص إلى جمل بناءً على علامات الترقيم العربية والانجليزية
  const sentences = text.split(/(?<=[.،؟!:\n])\s+/);
  
  return (
    <>
      {sentences.map((sentence, idx) => {
        const trimmed = sentence.trim();
        if (!trimmed) return null;
        
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              if (onQuote && trimmed.length > 1) {
                onQuote(trimmed);
              }
            }}
            className="hover:bg-indigo-100 hover:text-indigo-800 cursor-pointer rounded px-0.5 transition-all duration-200 inline decoration-indigo-300/30 decoration-dotted hover:underline font-medium select-none active:bg-indigo-200"
            title="انقر للاستفسار عن هذا السطر"
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

  const markdownComponents = {
    p: ({ children }: any) => (
      <p className="mb-3 last:mb-0 leading-[1.9] font-medium">
        {React.Children.map(children, child => 
          typeof child === 'string' ? <InteractiveText text={child} onQuote={onQuote} /> : child
        )}
      </p>
    ),
    li: ({ children }: any) => (
      <li className="mb-2 leading-[1.9] font-medium">
        {React.Children.map(children, child => 
          typeof child === 'string' ? <InteractiveText text={child} onQuote={onQuote} /> : child
        )}
      </li>
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
