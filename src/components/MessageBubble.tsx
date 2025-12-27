
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2, Lightbulb, X, Sparkles } from 'lucide-react';
import { streamSpeech, generateAiSpeech, cleanMathNotation, decodeBase64, decodePcmAudio } from '../services/geminiService';

/**
 * مكون لمعالجة النصوص وجعل كل جملة قابلة للضغط بشكل مستقل مع دعم خط Cairo
 */
const InteractiveText: React.FC<{ text: string, onQuote?: (t: string) => void }> = ({ text, onQuote }) => {
  if (!text) return null;

  // تقسيم النص بناءً على علامات الترقيم أو الأسطر الجديدة لضمان التفاعل سطر بسطر
  const sentences = text.split(/(?<=[.،؟!:\n])\s+/);

  return (
    <>
      {sentences.map((sentence, idx) => (
        <span
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            if (onQuote && sentence.trim().length > 2) {
              onQuote(sentence.trim());
            }
          }}
          className="hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer rounded px-0.5 transition-colors duration-150 inline decoration-indigo-200 decoration-dotted hover:underline font-medium"
          title="اضغط للاستفسار عن هذه الجملة"
        >
          {sentence}
        </span>
      ))}
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
  const [isSimplifyModalOpen, setIsSimplifyModalOpen] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const displayChatText = cleanMathNotation(message.text);

  const stopAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
        sourceNodeRef.current = null;
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
      return () => {
          stopAudio();
          if (audioContextRef.current) audioContextRef.current.close();
      };
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
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            }
            const ctx = audioContextRef.current;
            const bytes = decodeBase64(aiAudio.data);
            const audioBuffer = await decodePcmAudio(bytes, ctx, 24000, 1);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.onended = () => { if (sourceNodeRef.current === source) setIsSpeaking(false); };
            sourceNodeRef.current = source;
            source.start();
        } else {
            await streamSpeech(displayChatText, () => setIsSpeaking(false));
        }
    } catch (err) {
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

  const hasSimplification = !!(message.simplifiedText || message.visualDescription);

  // مخصصات ريندر الماركداون لجعل العناصر قابلة للضغط مع التنسيق المطلوب
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
    td: ({ children }: any) => (
      <td className="p-3 leading-[1.6] font-medium">
        {React.Children.map(children, child => 
          typeof child === 'string' ? <InteractiveText text={child} onQuote={onQuote} /> : child
        )}
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
          <div 
            className={`px-5 py-3 rounded-2xl shadow-sm markdown-body text-[15px] md:text-[17px] relative transition-all select-none ${
              isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-900 rounded-tl-none'
            }`}
          >
            {!isUser && (
              <div className="flex justify-end gap-2 mb-2 border-b border-slate-50 pb-2 no-print">
                {hasSimplification && (
                  <button onClick={(e) => { e.stopPropagation(); setIsSimplifyModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-200">
                    <Lightbulb size={12} />
                    <span>بسطها لي</span>
                  </button>
                )}
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
            
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={markdownComponents as any}
            >
              {displayChatText}
            </ReactMarkdown>
            
            {!isUser && (
                <div className="mt-3 pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span>يمكنك الضغط على أي جملة في الأعلى للاستفسار عنها</span>
                </div>
            )}
          </div>
        </div>
      </div>

      {isSimplifyModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-amber-50 flex justify-between items-center border-b border-amber-100">
              <div className="flex items-center gap-2 text-amber-700">
                <Lightbulb size={24} />
                <h3 className="font-bold text-lg">بسطها لي 💡</h3>
              </div>
              <button onClick={() => setIsSimplifyModalOpen(false)} className="p-2 hover:bg-amber-100 rounded-full text-amber-500">
                <X size={24} />
              </button>
            </div>
            <div className="p-7 overflow-y-auto max-h-[70vh] text-right" dir="rtl">
              {message.simplifiedText && (
                <p className="text-slate-800 leading-[2.1] font-medium text-lg md:text-xl">
                  {cleanMathNotation(message.simplifiedText)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
