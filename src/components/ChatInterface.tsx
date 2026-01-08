
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, GenerationOptions, StudyLanguage } from '../types';
import { generateStreamResponse, generateTopicQuiz } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { LiveVoiceModal } from './LiveVoiceModal';
import { DynamicQuestionBank } from '../lib/dynamicBank';
import { KnowledgeNotebook } from './KnowledgeNotebook';
import { FinalMemoModal } from './FinalMemoModal';
import { 
  Send, ChevronRight, List, Bot, Loader2, BookText, 
  Trophy, HelpCircle, Target, Mic, Camera, Paperclip, X, CheckCircle, GraduationCap,
  Sparkles, FileText, FileSearch, Heart, Youtube, Database, History, Clock, Brain, BookOpen, Star, ShieldCheck, PenTool, Image as ImageIcon
} from 'lucide-react';

const LessonBrowser = React.lazy(() => import('./LessonBrowser').then(module => ({ default: module.LessonBrowser })));
const YouTubeModal = React.lazy(() => import('./YouTubeModal').then(module => ({ default: module.YouTubeModal })));

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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentVideoData, setCurrentVideoData] = useState<VideoResult | null>(null);
  const [currentLessonTitle, setCurrentLessonTitle] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // تحميل الأرشيف المحفوظ لهذا الموضوع عند الفتح
    const historyKey = `chat_history_${grade}_${subject}`;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        } catch(e) { console.error("History parse error", e); }
    } else {
        const welcomeText = `أهلاً بك يا بطل! أنا **المعلمة الذكية**. كل شروحاتي تُحفظ لك هنا أوفلاين تلقائياً.`;
        setMessages([{ id: '1', text: welcomeText, sender: Sender.BOT, timestamp: new Date() }]);
    }
  }, [subject, grade]);

  useEffect(() => {
     if (messages.length > 1) {
         const historyKey = `chat_history_${grade}_${subject}`;
         localStorage.setItem(historyKey, JSON.stringify(messages));
     }
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, grade, subject]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        type: type === 'image' ? 'image' : 'file',
        mimeType: file.type,
        data: (reader.result as string).split(',')[1],
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (text: string = inputValue, specialPrompt?: string) => {
    const finalQuery = specialPrompt || text;
    if ((!finalQuery.trim() && !selectedAttachment) || isLoading) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      text: finalQuery.trim() || (selectedAttachment?.type === 'image' ? "حل هذه الصورة" : "تحليل ملف"), 
      sender: Sender.USER, 
      timestamp: new Date(),
      attachment: selectedAttachment || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue(''); 
    setSelectedAttachment(null);
    setIsLoading(true);

    try {
      const botId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botId, text: '', sender: Sender.BOT, timestamp: new Date(), isStreaming: true }]);
      
      await generateStreamResponse(
        userMessage.text, grade, subject, messages, 
        chunk => { setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, text: chunk } : msg)); }, 
        userMessage.attachment, 
        { language: studyLanguage }, 
        localStorage.getItem('device_id') || 'local'
      );
      
      setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, isStreaming: false } : msg));
    } catch (err) { 
      setMessages(prev => [...prev, { id: 'err', text: "حدث خطأ في الاتصال.", sender: Sender.BOT, timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const QuickTool = ({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) => (
    <button onClick={onClick} disabled={isLoading} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap ${color} hover:border-current`}>
      <Icon size={16} />
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 chat-container" dir={studyLanguage === StudyLanguage.ARABIC ? 'rtl' : 'ltr'}>
      <Suspense fallback={null}>
        <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} studyLanguage={studyLanguage} onPlayVideo={(l, d) => { setCurrentLessonTitle(l); setCurrentVideoData(d); setIsVideoModalOpen(true); }} onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(undefined, `اشرح درس "${l}" بالتفصيل.`); }} />
        <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
        <LiveVoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} grade={grade} subject={subject} />
        <KnowledgeNotebook isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} subject={subject} onUseSource={(t) => handleSend(t)} />
        <FinalMemoModal isOpen={isFinalMemoOpen} onClose={() => setIsFinalMemoOpen(false)} subject={subject} grade={grade} />
      </Suspense>

      <input type="file" ref={fileInputRef} hidden accept="*/*" onChange={(e) => handleFileUpload(e, 'file')} />
      <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'image')} />

      <header className="bg-white border-b border-slate-200 px-3 py-3 flex justify-between items-center shadow-sm sticky top-0 z-20 no-print">
        <div className="flex items-center gap-2 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={24} /></button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 truncate leading-tight flex items-center gap-1.5">
               {subject} <ShieldCheck size={14} className="text-emerald-500" />
            </h1>
            <p className="text-[10px] text-indigo-600 font-black tracking-tight">وضع الأرشفة الذكي مفعل ✅</p>
          </div>
        </div>
        
        <div className="flex gap-2">
            <button onClick={() => setIsFinalMemoOpen(true)} className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition-all shadow-sm" title="عصارة ليلة الامتحان">
                <Star size={22} className="animate-pulse" />
            </button>
            <button onClick={() => setIsLessonBrowserOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md">
                <List size={18} />
                <span className="hidden sm:inline">المنهج</span>
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide no-print">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} subject={subject} onQuote={(t) => setInputValue(`اشرح لي أكتر عن "${t}"`)} />)}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 space-y-4 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)] no-print">
        {selectedAttachment && (
            <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-xl border border-indigo-100 animate-in slide-in-from-bottom-2">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                    {selectedAttachment.type === 'image' ? <ImageIcon size={16} /> : <Paperclip size={16} />}
                </div>
                <span className="text-xs font-bold text-indigo-700 flex-1 truncate">{selectedAttachment.name || "مرفق جديد"}</span>
                <button onClick={() => setSelectedAttachment(null)} className="p-1 text-red-500"><X size={16}/></button>
            </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <QuickTool icon={Star} label="عصارة الامتحان" color="text-amber-600 bg-amber-50" onClick={() => setIsFinalMemoOpen(true)} />
          <QuickTool icon={PenTool} label="أسئلة الدرس" color="text-emerald-600 bg-emerald-50" onClick={() => handleSend(undefined, "ولد لي 5 أسئلة MCQ على الدرس الأخير.")} />
          <QuickTool icon={Target} label="بنك المنهج" color="text-red-600 bg-red-50" onClick={() => handleSend(undefined, "ولد لي اختبار شامل على المنهج.")} />
          <QuickTool icon={Database} label="المحفوظات" color="text-indigo-600 bg-indigo-50" onClick={() => setIsNotebookOpen(true)} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button onClick={() => setIsVoiceModalOpen(true)} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg hover:scale-105 transition-all"><Mic size={24} /></button>
            <button onClick={() => cameraInputRef.current?.click()} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"><Camera size={24} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"><Paperclip size={24} /></button>
          </div>
          
          <div className="flex-1 relative flex items-center">
            <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="اسأل المعلمة..." className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 h-[58px] font-bold text-sm shadow-inner resize-none overflow-hidden" />
            <button onClick={() => handleSend()} className="absolute left-2.5 p-2.5 bg-indigo-600 text-white rounded-xl shadow-md"><Send size={20} className="rotate-[-180deg]" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
