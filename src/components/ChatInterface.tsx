
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Send, 
  Bot,  
  User, 
  Sparkles, 
  Mic, 
  BookOpen,
  Settings,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { GradeLevel, Subject, Message, Sender, StudyLanguage } from '../types';
import { MessageBubble } from './MessageBubble';
import { generateStreamResponse } from '../services/geminiService';
import { getSupabaseStatus } from '../lib/supabase';
import { FloatingTools } from './FloatingTools';
import { LessonBrowser } from './LessonBrowser';
import { YouTubeModal } from './YouTubeModal';
import { LiveVoiceModal } from './LiveVoiceModal';
import { VideoResult } from './data/videoData';

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  studyLanguage: StudyLanguage;
  onBack: () => void;
  onSubscribe?: () => void;
}

// Fixed missing variables and export by providing full component implementation
export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  grade, 
  subject, 
  studyLanguage, 
  onBack, 
  onSubscribe 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showStatusHint, setShowStatusHint] = useState(false);
  const [isLessonBrowserOpen, setIsLessonBrowserOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ lesson: string; data: VideoResult } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      sender: Sender.BOT,
      text: studyLanguage === StudyLanguage.ENGLISH 
        ? `Hello! I am your AI tutor for ${subject}. How can I help you today?`
        : `أهلاً بك! أنا معلمك الذكي لمادة ${subject}. كيف يمكنني مساعدتك اليوم؟`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [subject, studyLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = {
      id: botMessageId,
      sender: Sender.BOT,
      text: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, botMessage]);

    try {
      await generateStreamResponse(
        text,
        grade,
        subject,
        messages,
        (chunk) => {
          setMessages(prev => 
            prev.map(m => m.id === botMessageId ? { ...m, text: chunk } : m)
          );
        },
        undefined,
        { language: studyLanguage }
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsStreaming(false);
      setMessages(prev => 
        prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false } : m)
      );
    }
  };

  const handleExplainLesson = (lesson: string) => {
    setIsLessonBrowserOpen(false);
    handleSend(studyLanguage === StudyLanguage.ENGLISH ? `Explain the lesson: ${lesson}` : `اشرح لي درس: ${lesson}`);
  };

  const supabaseStatus = getSupabaseStatus();

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans" dir={studyLanguage === StudyLanguage.ARABIC ? 'rtl' : 'ltr'}>
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowRight size={20} className={studyLanguage === StudyLanguage.ARABIC ? '' : 'rotate-180'} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{subject}</h2>
            <p className="text-[10px] text-slate-500 font-bold">{grade}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
           <button 
             onClick={() => setIsLiveVoiceOpen(true)}
             className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
           >
             <Mic size={16} />
             <span>اتصال مباشر</span>
           </button>

           <button 
             onClick={() => setIsLessonBrowserOpen(true)}
             className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
           >
             <BookOpen size={20} />
           </button>

           <button 
             onClick={() => setShowStatusHint(!showStatusHint)}
             className={`p-2 rounded-xl transition-all border ${supabaseStatus.isConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}
           >
             <Settings size={20} />
           </button>

           {showStatusHint && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] p-5 z-50 animate-in fade-in slide-in-from-top-1 text-right border-t-4 border-t-red-500">
                    <div className="flex items-center justify-between text-red-600 mb-3 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span className="text-[11px] font-black">تقرير تشخيص السحابة</span>
                        </div>
                        <button onClick={() => setShowStatusHint(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={14} /></button>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                            <p className="text-[9px] text-slate-500 font-bold mb-1">المفاتيح التي يراها التطبيق حالياً:</p>
                            <div className="flex justify-between items-center text-[8px] font-mono text-indigo-600 bg-white p-1 rounded border border-slate-50">
                                <span>{supabaseStatus.urlPrefix}...</span>
                                <span className="text-slate-400">URL:</span>
                            </div>
                            <div className="flex justify-between items-center text-[8px] font-mono text-indigo-600 bg-white p-1 rounded border border-slate-50 mt-1">
                                <span>{supabaseStatus.keyPrefix}...</span>
                                <span className="text-slate-400">KEY:</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={supabaseStatus.isUrlValid ? "text-emerald-600" : "text-red-500"}>
                                {supabaseStatus.hasUrl ? (supabaseStatus.isUrlValid ? "رابط صحيح ✅" : "رابط غير دقيق ⚠️") : "مفقود ❌"}
                            </span>
                            <span className="text-slate-500">Supabase URL</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className={supabaseStatus.isKeyFormatCorrect ? "text-emerald-600" : "text-red-500"}>
                              {supabaseStatus.hasKey ? (supabaseStatus.isKeyFormatCorrect ? "تنسيق صحيح ✅" : "تنسيق خاطئ ❌") : "مفقود ❌"}
                          </span>
                          <span className="text-slate-500">تنسيق المفتاح</span>
                        </div>
                        
                        {!supabaseStatus.isConnected && (
                            <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl text-[9px] font-black leading-relaxed mt-1 border border-indigo-100">
                              🚀 <span className="underline">حل المشكلة في دقيقة:</span><br/>
                              1. اذهب لـ Vercel Settings.<br/>
                              2. أضف نفس المفاتيح بأسماء تبدأ بـ <span className="text-red-600">VITE_</span><br/>
                              مثال: <span className="font-mono">VITE_SUPABASE_URL</span><br/>
                              3. اضغط <span className="bg-indigo-600 text-white px-1 rounded">Redeploy</span> لآخر نسخة.
                            </div>
                        )}
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-4 w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-indigo-600 transition-colors shadow-lg">إعادة تحديث وفحص</button>
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} subject={subject} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          {onSubscribe && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-4">
               <p className="text-xs font-bold text-amber-800">لقد قاربت فترة التجربة على الانتهاء. اشترك الآن لتستمر في استخدام الذكاء الاصطناعي.</p>
               <button onClick={onSubscribe} className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-sm shrink-0">تفعيل الحساب</button>
            </div>
          )}
          
          <div className="flex items-center gap-3">
             <div className="flex-1 relative">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={studyLanguage === StudyLanguage.ENGLISH ? "Ask me anything..." : "اسألني أي شيء..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm md:text-base font-bold resize-none h-[50px] scrollbar-hide"
                  rows={1}
                />
             </div>
             <button 
               onClick={() => handleSend()}
               disabled={!input.trim() || isStreaming}
               className={`p-3 rounded-2xl transition-all shadow-md ${input.trim() && !isStreaming ? 'bg-indigo-600 text-white scale-100' : 'bg-slate-100 text-slate-400 scale-95 shadow-none'}`}
             >
                {isStreaming ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
             </button>
          </div>
        </div>
      </footer>

      <FloatingTools />
      
      <LessonBrowser 
        isOpen={isLessonBrowserOpen}
        onClose={() => setIsLessonBrowserOpen(false)}
        grade={grade}
        subject={subject}
        studyLanguage={studyLanguage}
        onExplain={handleExplainLesson}
        onPlayVideo={(lesson, data) => setSelectedVideo({ lesson, data })}
      />
 
      <YouTubeModal 
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoData={selectedVideo?.data || null}
        lessonTitle={selectedVideo?.lesson || ''}
      />

      <LiveVoiceModal 
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        grade={grade}
        subject={subject}
      />
    </div>
  );
};
