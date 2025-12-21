
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Search, Check, HelpCircle, Volume2, StopCircle, Loader2 } from 'lucide-react';
import { streamSpeech } from '../services/geminiService';

interface MessageBubbleProps {
  message: Message;
  subject?: Subject;
  onTermClick?: (term: string) => void;
  onQuote?: (text: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, subject, onTermClick, onQuote }) => {
  const isUser = message.sender === Sender.USER;
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const extractText = (children: any): string => {
    if (!children) return '';
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractText).join('');
    if (children?.props?.children) return extractText(children.props.children);
    return '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const stopAudio = () => {
      isSpeakingRef.current = false;
      sourcesRef.current.forEach(source => {
          try { source.stop(); } catch (e) {}
      });
      sourcesRef.current = [];
      setIsSpeaking(false);
      setIsLoadingAudio(false);
      nextStartTimeRef.current = 0;
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
        stopAudio();
        return;
    }

    if (isLoadingAudio) return;

    setIsLoadingAudio(true);
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

        await streamSpeech(message.text, (base64) => {
            if (!isSpeakingRef.current) return;
            setIsLoadingAudio(false);
            scheduleChunk(base64);
        });

    } catch (e) {
        console.error("Audio Playback Error", e);
        stopAudio();
    }
  };

  const scheduleChunk = (base64: string) => {
      const ctx = audioContextRef.current;
      if (!ctx) return null;

      try {
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
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
              if (index > -1) {
                  sourcesRef.current.splice(index, 1);
              }
              if (sourcesRef.current.length === 0 && ctx.currentTime >= nextStartTimeRef.current - 0.1) {
                  setIsSpeaking(false);
                  isSpeakingRef.current = false;
              }
          };

          return source;
      } catch (err) {
          console.error("Error decoding audio chunk", err);
          return null;
      }
  };

  return (
    <div className={`flex w-full mb-3 md:mb-5 pop-in ${isUser ? 'justify-end' : 'justify-start'} print:block print:mb-4 print:w-full`}>
      <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2.5 print:max-w-full print:flex-row print:w-full`}>
        
        <div className={`flex-shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center no-print mt-1 transition-transform hover:scale-110 ${
          isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
        }`}>
          {isUser ? <User size={18} className="md:w-[22px]" /> : <Bot size={20} className="md:w-[24px]" />}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} print:items-start print:w-full min-w-0 max-w-[92%] md:max-w-[85%]`}>
          <div className={`px-4 py-3 md:px-7 md:py-5 rounded-3xl shadow-sm markdown-body text-base md:text-xl leading-loose relative w-full overflow-hidden transition-all duration-300
            ${isUser 
              ? 'bg-indigo-600 text-white rounded-tl-none font-medium user-message-bubble' 
              : 'bg-white border border-slate-200 text-slate-900 rounded-tr-none font-medium'
            }`}>
            
            {!isUser && (
              <div className="flex gap-2 mb-3 pb-2 border-b border-slate-100 no-print w-full justify-end items-center">
                
                <button 
                  onClick={handleSpeak}
                  disabled={isLoadingAudio}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold border transition-all active:scale-95 mr-auto ${
                      isSpeaking
                      ? 'bg-indigo-100 text-indigo-600 border-indigo-200 animate-pulse'
                      : isLoadingAudio 
                        ? 'bg-slate-50 text-slate-400 cursor-wait'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                  title={isSpeaking ? "إيقاف القراءة" : "استمع للشرح بصوت المعلمة"}
                >
                  {isLoadingAudio ? (
                     <Loader2 size={16} className="animate-spin" />
                  ) : isSpeaking ? (
                     <StopCircle size={16} className="text-indigo-600" />
                  ) : (
                     <Volume2 size={16} />
                  )}
                  <span className="inline">
                      {isLoadingAudio ? 'جاري التحميل...' : isSpeaking ? 'إيقاف' : 'استمع'}
                  </span>
                </button>

                <button 
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold border border-slate-200 transition-all active:scale-95 ${
                      isCopied 
                      ? 'bg-emerald-100 text-emerald-600 border-emerald-200' 
                      : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  {isCopied ? 'تم النسخ' : 'نسخ'}
                </button>
              </div>
            )}

            {isUser ? (
              <p className="whitespace-pre-wrap leading-loose break-words">{message.text}</p>
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({node, ...props}) => <div className="overflow-x-auto my-4 w-full border rounded-xl print:overflow-visible print:block"><table className="min-w-full divide-y divide-slate-200 border text-sm md:text-lg print:border-black print:text-sm print:w-full" {...props} /></div>,
                  th: ({node, ...props}) => <th className="px-3 py-3 bg-slate-50 text-right font-bold text-slate-800 uppercase border print:bg-gray-100 print:text-black print:border-black whitespace-nowrap" {...props} />,
                  td: ({node, ...props}) => <td className="px-3 py-3 text-slate-800 border print:border-black min-w-[120px]" {...props} />,
                  a: ({node, ...props}) => <a className="text-blue-600 underline hover:text-blue-800 font-semibold print:text-black print:no-underline break-all" {...props} />,
                  
                  p: ({node, children, ...props}) => {
                    const text = extractText(children);
                    return (
                        <div className="group relative mb-3 last:mb-0 -mx-2 px-2 rounded-xl transition-all duration-300 hover:bg-indigo-50/30">
                            <div className="cursor-pointer select-none md:select-text" onClick={() => onQuote && onQuote(text)}>
                                <p className="inline leading-loose" {...props}>{children}</p>
                            </div>
                            <div className="inline-flex items-center gap-1 absolute left-2 top-0 transform -translate-y-1/2 bg-white shadow-sm border border-slate-200 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-100 pointer-events-none">
                                <span className="text-[10px] text-slate-400 font-bold">
                                    <HelpCircle size={12} className="inline mr-1" />
                                    اسأل
                                </span>
                            </div>
                        </div>
                    );
                  },
                  
                  li: ({node, children, ...props}) => {
                    const text = extractText(children);
                    return (
                        <li className="group relative -mx-2 px-2 rounded-xl transition-colors cursor-pointer break-words hover:bg-indigo-50/30 mb-2" onClick={(e) => { e.stopPropagation(); onQuote && onQuote(text); }} {...props}>
                            <span className="inline leading-loose">{children}</span>
                        </li>
                    );
                  },

                  blockquote: ({node, ...props}) => <blockquote className="border-r-4 border-indigo-300 pr-4 italic text-slate-700 bg-indigo-50/50 p-3 rounded-lg my-3 text-base md:text-xl print:bg-white print:text-black print:border-black print:pl-0" {...props} />,
                  
                  code: ({node, inline, className, children, ...props}: any) => {
                     if (inline) {
                       return (
                         <span className="inline-block mx-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 text-sm md:text-base align-middle">
                           {children}
                         </span>
                       );
                     }
                     
                     // عرض الكود كمربع نصي تعليمي بارز بدلاً من التنسيق البرمجي الأسود
                     return (
                        <div className="my-4 p-5 bg-slate-50 border-r-4 border-indigo-500 rounded-xl text-slate-800 font-medium whitespace-pre-wrap break-words shadow-sm">
                           {children}
                        </div>
                     );
                  },
                }}
              >
                {message.text}
              </ReactMarkdown>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1.5 px-2 no-print font-medium">
            {message.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
