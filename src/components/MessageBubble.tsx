
import React, { useState } from 'react';
import { Message, Sender, Subject } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Sparkles } from 'lucide-react';
import { cleanMathNotation } from '../services/geminiService';

/**
 * وظيفة مساعدة لاستخراج النص الصافي من عناصر React المتداخلة
 */
const extractText = (children: any): string => {
  let text = '';
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      text += child;
    } else if (React.isValidElement(child) && child.props && (child.props as any).children) {
      text += extractText((child.props as any).children);
    }
  });
  return text;
};

export const MessageBubble: React.FC<{ message: Message, subject?: Subject, onQuote?: (t: string) => void }> = ({ message, onQuote }) => {
  const isUser = message.sender === Sender.USER;
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex w-full max-w-[95%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
        <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border text-indigo-600'}`}>
          {isUser ? <User size={20} /> : <Bot size={22} />}
        </div>
        
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1`}>
          <div className={`group relative px-5 py-4 rounded-[2rem] shadow-sm border ${isUser ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-white text-slate-900 border-slate-100 rounded-tl-none'}`}>
            {!isUser && (
              <button onClick={handleCopy} className={`absolute -top-3 left-4 p-2 rounded-full shadow-md transition-all z-10 ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 hover:text-indigo-600'}`}>
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
            <div className="prose prose-slate max-w-none text-right" dir="rtl">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  components={{
                    h3: ({children}) => <h3 className="text-xl font-black text-indigo-700 mb-4 flex items-center gap-2"><Sparkles size={22}/>{children}</h3>,
                    p: ({children}) => {
                      const textContent = extractText(children);
                      return (
                        <p 
                          className="selectable-line font-medium text-inherit" 
                          onClick={() => onQuote && onQuote(textContent)}
                        >
                          {children}
                        </p>
                      );
                    },
                    li: ({children}) => {
                      const textContent = extractText(children);
                      return (
                        <li 
                          className="selectable-line cursor-pointer" 
                          onClick={() => onQuote && onQuote(textContent)}
                        >
                          {children}
                        </li>
                      );
                    }
                  }}
                >
                  {cleanMathNotation(message.text)}
                </ReactMarkdown>
            </div>
          </div>
          <span className="text-[10px] font-black text-slate-400 mt-2 px-2 uppercase">{isUser ? 'أنت' : 'المعلمة الذكية'}</span>
        </div>
      </div>
    </div>
  );
};
