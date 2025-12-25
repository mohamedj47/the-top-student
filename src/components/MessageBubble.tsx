
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2, Lightbulb, X, Info } from 'lucide-react';
import { generateAiSpeech, streamSpeech, cleanMathNotation } from '../services/geminiService';

// Mermaid Renderer Component
const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const render = async () => {
      if (ref.current && (window as any).mermaid) {
        try {
          let lines = chart.trim().split('\n');
          let outputLines: string[] = ['graph TD'];
          let styles: string[] = [];
          
          lines.forEach(line => {
            let l = line.trim();
            if (!l || l.toLowerCase().startsWith('graph')) return;
            if (l.toLowerCase().startsWith('style')) {
              styles.push(l.replace(/,\s*$/, ''));
              return;
            }
            l = l.replace(/--.*?-->/g, '-->');
            l = l.replace(/([A-Z0-9_]+)[\(\{\[]+(.*?)[\)\}\]]+/g, (match, id, content) => {
              const cleanId = id.replace(/^\d+/, 'N$&'); 
              const cleanContent = content.replace(/[#$%;:()"]/g, ' ').trim();
              return `${cleanId}["${cleanContent}"]`;
            });
            l = l.replace(/(^|[\s\->])(\d+)($|[\s\->])/g, '$1N$2$3');
            if (l) outputLines.push('    ' + l);
          });
          styles.forEach(s => outputLines.push('    ' + s));
          const finalChart = outputLines.join('\n');
          const { svg } = await (window as any).mermaid.render(
            `mermaid-${Math.random().toString(36).substr(2, 9)}`,
            finalChart
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
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isSimplifyModalOpen, setIsSimplifyModalOpen] = useState(false);
  
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // تطهير النص قبل عرضه لضمان عدم وجود $ نهائياً
  const displayChatText = cleanMathNotation(message.text);

  const handleSpeech = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      if (sourceRef.current) try { sourceRef.current.stop(); } catch(e) {}
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      const base64Audio = await generateAiSpeech(displayChatText);
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
        await streamSpeech(displayChatText, () => setIsSpeaking(false));
      }
    } catch (error) {
      setIsAudioLoading(false);
      setIsSpeaking(true);
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

  return (
    <div className={`flex w-full mb-3 pop-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2 md:gap-3 items-end`}>
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-emerald-600'}`}>
          {isUser ? <User size={14} /> : <Bot size={16} />}
        </div>
        <div className={`max-w-[90%] md:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-2.5 rounded-2xl shadow-sm markdown-body text-sm md:text-base relative cursor-pointer ${
            isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-900 rounded-tl-none'
          }`}>
            {!isUser && (
              <div className="flex justify-end gap-2 mb-2 border-b border-slate-50 pb-1.5 no-print">
                {hasSimplification && (
                  <button 
                    onClick={() => setIsSimplifyModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-200 shadow-sm"
                  >
                    <Lightbulb size={10} />
                    <span>بسطها لي</span>
                  </button>
                )}
                <button onClick={handleSpeech} disabled={isAudioLoading} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${isSpeaking ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                  {isAudioLoading ? <Loader2 size={10} className="animate-spin" /> : (isSpeaking ? <StopCircle size={10} /> : <Volume2 size={10} />)}
                  <span>{isSpeaking ? 'إيقاف' : 'استمع'}</span>
                </button>
                <button onClick={handleCopy} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
                  {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            )}
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, className, children, ...props}: any) {
                  const inline = props.inline;
                  const match = /language-mermaid/.exec(className || '')
                  return !inline && match ? (
                    <MermaidDiagram chart={String(children).replace(/\n$/, '')} />
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  )
                },
                p({children}: any) {
                  const content = children?.[0];
                  if (typeof content === 'string' && content.trim().startsWith('<div') && content.trim().endsWith('</div>')) {
                    return <div dangerouslySetInnerHTML={{ __html: content }} />;
                  }
                  return <p>{children}</p>;
                }
              }}
            >
              {displayChatText}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {isSimplifyModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="p-4 bg-amber-50 flex justify-between items-center border-b border-amber-100">
              <div className="flex items-center gap-2 text-amber-700">
                <Lightbulb className="fill-current" size={24} />
                <h3 className="font-bold text-lg">بسطها لي 💡</h3>
              </div>
              <button onClick={() => setIsSimplifyModalOpen(false)} className="p-2 hover:bg-amber-100 rounded-full text-amber-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6 text-right" dir="rtl">
              {message.simplifiedText && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative">
                  <div className="absolute -top-3 right-4 bg-white px-2 text-[10px] font-black text-indigo-500 border border-indigo-100 rounded-full flex items-center gap-1">
                     <Info size={10} /> الشرح المبسط
                  </div>
                  <p className="text-slate-700 leading-relaxed font-bold text-base md:text-lg">
                    {cleanMathNotation(message.simplifiedText)}
                  </p>
                </div>
              )}
              {message.visualDescription && (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">📊 الرسم التوضيحي المتقدم</h4>
                  <div 
                    className="visual-html-container overflow-hidden rounded-2xl border border-slate-100"
                    dangerouslySetInnerHTML={{ __html: message.visualDescription }} 
                  />
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
               <button onClick={() => setIsSimplifyModalOpen(false)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all">
                 فهمت، شكراً لك!
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
