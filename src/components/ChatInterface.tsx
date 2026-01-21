
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, StudyLanguage } from '../types';
import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { LiveVoiceModal } from './LiveVoiceModal';
import { PodcastModal } from './PodcastModal';
import { StudentMemory } from '../lib/studentMemory';
import { 
  Send, ChevronRight, List, Bot, Loader2, Mic, Camera, Paperclip, X, ShieldCheck, 
  Sparkles, Star, Database, History, Clock, Brain, BookOpen, PenTool, Image as ImageIcon,
  Printer, Smartphone, AlertTriangle, Key, Headphones
} from 'lucide-react';
import { isSystemOverloaded } from '../utils/apiKeyManager';

const LessonBrowser = React.lazy(() => import('./LessonBrowser').then(module => ({ default: module.LessonBrowser })));
const YouTubeModal = React.lazy(() => import('./YouTubeModal').then(module => ({ default: module.YouTubeModal })));

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  onBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isLessonBrowserOpen, setIsLessonBrowserOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isPodcastOpen, setIsPodcastOpen] = useState(false);
  const [currentVideoData, setCurrentVideoData] = useState<VideoResult | null>(null);
  const [currentLessonTitle, setCurrentLessonTitle] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const welcome = `أهلاً بك يا بطل في مادة **${subject}**! 🚀\nأنا هنا لأشرح لك أي جزء صعب. يمكنك السؤال بالكتابة أو بالصوت أو حتى بتصوير السؤال.\n\n*(تلميح: اضغط على أي سطر في شرحي للاستفسار عنه)*`;
    setMessages([{ id: '1', text: welcome, sender: Sender.BOT, timestamp: new Date() }]);
    
    // تحميل التاريخ المحلي (لغرض التأكد فقط - لا نغير UI)
    StudentMemory.getHistory(subject).then(history => {
       console.debug(`Loaded ${history.length} interactions for ${subject} from offline storage.`);
    });
  }, [subject]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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

  const handleOpenPersonalKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsQuotaExceeded(false);
      alert("✅ تم ربط مفتاحك الخاص بنجاح! سيعمل التطبيق الآن بكفاءة قصوى.");
      window.location.reload();
    }
  };

  const handleSend = async (text: string = inputValue, specialPrompt?: string) => {
    const finalQuery = specialPrompt || text;
    if ((!finalQuery.trim() && !selectedAttachment) || isLoading) return;

    setIsQuotaExceeded(false);
    const userMessage: Message = { 
      id: Date.now().toString(), 
      text: finalQuery.trim() || (selectedAttachment?.type === 'image' ? "حل هذه الصورة" : "تحليل ملف"), 
      sender: Sender.USER, 
      timestamp: new Date(),
      attachment: selectedAttachment || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    
    // تسجيل تفاعل الطالب فوراً في الذاكرة أوفلاين
    const deviceId = localStorage.getItem('device_id') || 'local';
    StudentMemory.saveInteraction({
      interactionId: userMessage.id,
      studentId: deviceId,
      type: 'user_text',
      content: userMessage.text,
      timestamp: userMessage.timestamp.getTime(),
      subject: subject,
      sessionId: 'session_' + deviceId,
      metadata: { 
        hasAttachment: !!userMessage.attachment,
        attachmentType: userMessage.attachment?.type 
      }
    });

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
        { language: StudyLanguage.ARABIC }, 
        deviceId
      );
      
      setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, isStreaming: false } : msg));
    } catch (err: any) { 
      if (err?.message?.includes('429') || err?.message?.includes('quota')) {
        setIsQuotaExceeded(true);
        setMessages(prev => prev.filter(m => !m.isStreaming));
        setMessages(prev => [...prev, { 
          id: 'err-quota', 
          text: "⚠️ خوادم المعلم مزدحمة جداً الآن (تجاوز الحصة المجانية). يمكنك الانتظار قليلاً أو ربط مفتاحك الخاص لضمان استمرار الخدمة.", 
          sender: Sender.BOT, 
          timestamp: new Date() 
        }]);
      } else {
        setMessages(prev => [...prev, { id: 'err', text: "حدث خطأ غير متوقع. يرجى إعادة المحاولة.", sender: Sender.BOT, timestamp: new Date() }]);
      }
    } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInquireLine = (text: string) => {
    const inquiryText = `ممكن توضح أكتر النقطة دي: "${text.trim()}"`;
    setInputValue(inquiryText);
    textareaRef.current?.focus();
  };

  const lastBotMessage = [...messages].reverse().find(m => m.sender === Sender.BOT && m.text.length > 50);

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans safe-top" dir="rtl">
      
      <Suspense fallback={null}>
        <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} onPlayVideo={(l, d) => { setCurrentLessonTitle(l); setCurrentVideoData(d); setIsVideoModalOpen(true); }} onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(undefined, `اشرح درس "${l}" بالتفصيل.`); }} />
        <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
        <LiveVoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} grade={grade} subject={subject} />
        {isPodcastOpen && lastBotMessage && (
          <PodcastModal isOpen={isPodcastOpen} onClose={() => setIsPodcastOpen(false)} subject={subject} content={lastBotMessage.text} />
        )}
      </Suspense>

      <input type="file" ref={fileInputRef} hidden accept="*/*" onChange={(e) => handleFileUpload(e, 'file')} />
      <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'image')} />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-50 rounded-xl text-slate-800"><ChevronRight size={22} /></button>
          <div className="text-right">
             <h1 className="text-base font-black text-slate-900 leading-tight flex items-center gap-1">
               {subject} <ShieldCheck size={14} className="text-emerald-500" />
             </h1>
             <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isQuotaExceeded ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  {isQuotaExceeded ? 'System Overloaded' : 'Active System 2026'}
                </span>
             </div>
          </div>
        </div>
        
        <div className="flex gap-2">
            <button onClick={() => setIsLessonBrowserOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-[10px] shadow-lg shadow-indigo-100 active:scale-95 transition-all">
                <List size={16} />
                <span>المنهج</span>
            </button>
        </div>
      </header>

      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
           <div className="flex items-center gap-2 text-amber-800 text-xs font-black">
              <AlertTriangle size={18} />
              <span>خوادم Gemini المجانية مزدحمة الآن!</span>
           </div>
           <button 
             onClick={handleOpenPersonalKey}
             className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-lg shadow-amber-100 hover:bg-amber-700 transition-all"
           >
              <Key size={14} />
              استخدم مفتاحك الخاص مجاناً
           </button>
        </div>
      )}

      {/* Chat Space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} subject={subject} onQuote={handleInquireLine} />
        ))}
        {isLoading && (
          <div className="flex justify-start px-4">
             <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Doctor is thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-4 bg-white border-t border-slate-200 safe-bottom no-print">
        {selectedAttachment && (
            <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-2xl border border-indigo-100 mb-3 animate-in slide-in-from-bottom-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    {selectedAttachment.type === 'image' ? <ImageIcon size={18} /> : <Paperclip size={18} />}
                </div>
                <span className="text-[10px] font-black text-indigo-700 flex-1 truncate">{selectedAttachment.name || "مرفق جديد"}</span>
                <button onClick={() => setSelectedAttachment(null)} className="p-2 bg-indigo-100 rounded-full text-indigo-600"><X size={16}/></button>
            </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          <QuickAction icon={Headphones} label="بودكاست الشرح" onClick={() => { if (lastBotMessage) setIsPodcastOpen(true); else alert("اسأل المعلم أولاً ليتمكن من إنشاء بودكاست لك!"); }} color="text-indigo-600 bg-indigo-50 border-indigo-100 animate-pulse" />
          <QuickAction icon={Star} label="عصارة الامتحان" onClick={() => handleSend(undefined, "أريد عصارة ليلة الامتحان في هذا الجزء.")} color="text-amber-600 bg-amber-50" />
          <QuickAction icon={PenTool} label="توقع سؤال" onClick={() => handleSend(undefined, "توقع لي سؤال امتحان على ما شرحته.")} color="text-emerald-600 bg-emerald-50" />
          <QuickAction icon={BookOpen} label="ملخص الدرس" onClick={() => handleSend(undefined, "لخص لي الدرس في 5 نقاط ذهبية.")} color="text-indigo-600 bg-indigo-50" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <button onClick={() => setIsVoiceModalOpen(true)} className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 active:scale-90 transition-all"><Mic size={22} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-slate-100 text-slate-600 rounded-[1.5rem] hover:bg-slate-200 active:scale-90 transition-all"><Paperclip size={22} /></button>
            <button onClick={() => cameraInputRef.current?.click()} className="p-4 bg-slate-100 text-slate-600 rounded-[1.5rem] hover:bg-slate-200 active:scale-90 transition-all"><Camera size={22} /></button>
          </div>
          
          <div className="flex-1 relative flex items-center">
            <textarea 
              ref={textareaRef} 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={handleKeyDown}
              placeholder="اسأل الدكتور..." 
              className="w-full bg-slate-100/50 border-none rounded-[1.5rem] px-5 py-4 h-[60px] font-bold text-base shadow-inner focus:ring-2 focus:ring-indigo-100 transition-all resize-none overflow-hidden" 
            />
            <button 
               onClick={() => handleSend()} 
               className={`absolute left-2.5 p-2.5 rounded-2xl transition-all ${inputValue.trim() || selectedAttachment ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}
            >
                <Send size={20} className="rotate-[-180deg]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, color, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-6 py-3.5 rounded-[1.4rem] border-2 border-transparent hover:border-current transition-all active:scale-95 shrink-0 whitespace-nowrap shadow-sm ${color}`}>
     <Icon size={20} />
     <span className="text-[15px] font-black">{label}</span>
  </button>
);
