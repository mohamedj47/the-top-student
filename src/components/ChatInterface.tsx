
import React, { useState, useRef, useEffect } from 'react';
import { GradeLevel, Subject, Message, Sender, StudyLanguage } from '../types';
import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { LessonBrowser } from './LessonBrowser';
import { KnowledgeNotebook } from './KnowledgeNotebook';
import { FinalMemoModal } from './FinalMemoModal';
import { FloatingTools } from './FloatingTools';
import { 
  Send, ChevronRight, Bot, Star, ShieldCheck, PenTool, Database, Brain, BookOpen, Sparkles, Mic, Camera, LayoutGrid
} from 'lucide-react';

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  studyLanguage?: StudyLanguage;
  onBack: () => void;
  onSubscribe?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, studyLanguage = StudyLanguage.ARABIC, onBack, onSubscribe }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [isFinalMemoOpen, setIsFinalMemoOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLessonBrowserOpen, setIsLessonBrowserOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const historyKey = `history_v5_${grade}_${subject}`;
    const saved = localStorage.getItem(historyKey);
    if (saved) setMessages(JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
    else setMessages([{ id: '1', text: `أهلاً بك يا بطل في استوديو **${subject}** المطور. أنا معلمك الخاص، كيف نكتسح المنهج اليوم؟`, sender: Sender.BOT, timestamp: new Date() }]);
  }, [subject, grade]);

  useEffect(() => {
    localStorage.setItem(`history_v5_${grade}_${subject}`, JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: Sender.USER, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const botId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botId, text: '', sender: Sender.BOT, timestamp: new Date(), isStreaming: true }]);

    try {
      const deviceId = localStorage.getItem('device_id') || 'guest';
      await generateStreamResponse(text, grade, subject, messages, (chunk) => {
        setMessages(prev => prev.map(m => m.id === botId ? { ...m, text: chunk } : m));
      }, undefined, undefined, deviceId);
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, isStreaming: false } : m));
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', text: "المحرك في وضع الصيانة التلقائية، جاري استعادة الاتصال...", sender: Sender.BOT, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[320px] bg-white border-l border-slate-200 flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-100 bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2.5 rounded-2xl"><Database size={22} /></div>
             <div>
                <h3 className="font-black text-lg">استوديو {subject}</h3>
                <p className="text-[10px] text-indigo-100 font-black uppercase tracking-widest">Source Studio v4.0</p>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
           <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-700 mb-2 flex items-center gap-2">
                 <Brain size={16} /> المساعد الذكي نشط
              </h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                نظام الـ 11 مفتاح API يعمل الآن بالتناوب لضمان استقرار الخدمة.
              </p>
           </div>

           <button onClick={() => setIsLessonBrowserOpen(true)} className="w-full p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all text-right flex items-center gap-3">
              <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600"><BookOpen size={18} /></div>
              <span className="font-black text-slate-800 text-sm">فهرس الدروس</span>
           </button>

           <button onClick={() => setIsNotebookOpen(true)} className="w-full p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all text-right flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600"><PenTool size={18} /></div>
              <span className="font-black text-slate-800 text-sm">المسودة والمصادر</span>
           </button>

           <button onClick={() => setIsFinalMemoOpen(true)} className="w-full p-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg transition-all hover:scale-[1.02] text-right flex items-center gap-3">
              <Star size={20} className="animate-pulse" />
              <span className="font-black text-sm">عصارة ليلة الامتحان</span>
           </button>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col relative bg-white">
        <FloatingTools />
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><ChevronRight size={24} /></button>
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                {subject} <ShieldCheck size={16} className="text-emerald-500" />
              </h2>
              <p className="text-[10px] text-indigo-600 font-black tracking-tight uppercase">نظام المعلم الخارق • نسخة مستقرة</p>
            </div>
          </div>
          <div className="lg:hidden flex gap-2">
             <button onClick={() => setIsLessonBrowserOpen(true)} className="p-2 bg-slate-100 rounded-xl"><LayoutGrid size={20} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 chat-container">
          <div className="max-w-4xl mx-auto w-full">
            {messages.map(m => <MessageBubble key={m.id} message={m} subject={subject} onQuote={(t) => setInputValue(prev => prev + " " + t)} />)}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto relative flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اسأل المعلم عن أي شيء في الدرس..."
                className="w-full bg-slate-100/50 border-none rounded-[2rem] px-6 py-4 h-[60px] resize-none font-bold text-slate-700 shadow-inner focus:bg-white transition-all"
              />
              <button onClick={() => handleSend()} className={`absolute left-2 top-2 p-3 rounded-full transition-all ${inputValue.trim() ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                <Send size={20} className="rotate-180" />
              </button>
            </div>
            <div className="flex gap-2">
               <button className="p-4 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-all"><Mic size={24} /></button>
               <button className="p-4 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-all"><Camera size={24} /></button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals are correctly imported via PascalCase */}
      <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(`اشرح لي درس ${l} بالتفصيل.`); }} onPlayVideo={() => {}} />
      <KnowledgeNotebook isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} subject={subject} onUseSource={(t) => handleSend(t)} />
      <FinalMemoModal isOpen={isFinalMemoOpen} onClose={() => setIsFinalMemoOpen(false)} subject={subject} grade={grade} />
    </div>
  );
};
