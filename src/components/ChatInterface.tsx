
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, GenerationOptions, StudyLanguage } from '../types';
import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { LiveVoiceModal } from './LiveVoiceModal';
import { DynamicQuestionBank, DynamicQuestion } from '../lib/dynamicBank';
import { isSupabaseConnected, getSupabaseStatus } from '../lib/supabase';
import { 
  Send, ChevronRight, List, Bot, Loader2, BookText, 
  Trophy, HelpCircle, Target, Mic, Camera, Paperclip, X, CheckCircle, GraduationCap,
  Sparkles, FileText, FileSearch, Heart, Youtube, Database, History, Clock, Brain, Cloud, CloudOff, Users, Zap, Globe, ShieldCheck, AlertCircle
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
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryContent, setLibraryContent] = useState<DynamicQuestion[]>([]);
  const [cloudStats, setCloudStats] = useState({ total: 0, students: 0 });
  const [cloudConnected, setCloudConnected] = useState(false);
  const [libTab, setLibTab] = useState<'local' | 'global'>('global');
  const [showStatusHint, setShowStatusHint] = useState(false);

  useEffect(() => {
    const connected = isSupabaseConnected();
    setCloudConnected(connected);
    if (connected) {
        DynamicQuestionBank.getCloudStats().then(setCloudStats);
    }
    
    const welcomeText = studyLanguage === StudyLanguage.ARABIC 
      ? `أهلاً بك يا بطل في مادة **${subject}**! 🚀\nأنا دكتور المادة الخاص بك. أي معلومة سأشرحها لك سيتم حفظها تلقائياً في **"بنك الطالب"** لترجع إليها لاحقاً.`
      : `Welcome to **${subject}**! 🚀\nEverything I explain will be saved automatically to your **"Student Bank"**.`;

    setMessages([{ id: '1', text: welcomeText, sender: Sender.BOT, timestamp: new Date() }]);
  }, [subject, studyLanguage]);

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openLibrary = async () => {
    setIsLoading(true);
    if (libTab === 'global' && cloudConnected) {
        const globalContent = await DynamicQuestionBank.getGlobalFeed(subject);
        setLibraryContent(globalContent);
    } else {
        const content = DynamicQuestionBank.getAll().filter(q => q.subject === subject);
        setLibraryContent(content);
    }
    setIsLoading(false);
    setIsLibraryOpen(true);
  };

  useEffect(() => { if (isLibraryOpen) openLibrary(); }, [libTab]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedAttachment({ 
        type: file.type.startsWith('image/') ? 'image' : 'file', 
        mimeType: file.type, 
        data: base64, 
        name: file.name 
      });
    };
    reader.readAsDataURL(file);
  };

  const handleQuote = (text: string) => {
    const prompt = studyLanguage === StudyLanguage.ARABIC ? `اشرح أكثر عن: "${text}"` : `Explain more about: "${text}"`;
    setInputValue(prompt);
    setTimeout(() => { textareaRef.current?.focus(); }, 100);
  };

  const handleSend = async (text: string = inputValue, specialPrompt?: string) => {
    const finalQuery = specialPrompt || text;
    if ((!finalQuery.trim() && !selectedAttachment) || isLoading) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      text: finalQuery.trim() || (selectedAttachment ? (studyLanguage === StudyLanguage.ARABIC ? "حلل هذا المرفق" : "Analyze this attachment") : ""), 
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
      const errMsg = studyLanguage === StudyLanguage.ARABIC ? "عذراً يا بطل، واجهت مشكلة في الاتصال." : "Sorry, I encountered a connection issue.";
      setMessages(prev => [...prev, { id: 'err', text: errMsg, sender: Sender.BOT, timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const QuickTool = ({ icon: Icon, label, color, prompt, onClick }: { icon: any, label: string, color: string, prompt?: string, onClick?: () => void }) => (
    <button onClick={onClick || (() => handleSend("", prompt))} disabled={isLoading} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap ${color} hover:border-current`}>
      <Icon size={16} />
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 chat-container" dir={studyLanguage === StudyLanguage.ARABIC ? 'rtl' : 'ltr'}>
      <Suspense fallback={null}>
        <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} studyLanguage={studyLanguage} onPlayVideo={(l, d) => { setCurrentLessonTitle(l); setCurrentVideoData(d); setIsVideoModalOpen(true); }} onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(studyLanguage === StudyLanguage.ARABIC ? `اشرح درس "${l}" بالتفصيل` : `Explain lesson "${l}" in detail`); }} />
        <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
        <LiveVoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} grade={grade} subject={subject} />
      </Suspense>

      {/* واجهة البنك المتطور (Global Library) */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                <div className="p-6 bg-indigo-600 text-white flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Database size={28} />
                            <div>
                                <h3 className="font-black text-xl">بنك الطالب العالمي</h3>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-indigo-100">مزامنة سحابية مع 10,000 طالب 🚀</p>
                                  {cloudConnected && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsLibraryOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
                    </div>
                    
                    <div className="flex bg-indigo-700/50 p-1 rounded-2xl">
                        <button onClick={() => setLibTab('global')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${libTab === 'global' ? 'bg-white text-indigo-600 shadow-lg' : 'text-indigo-200 hover:text-white'}`}>
                            <Zap size={14} /> رادار الأسئلة الحالية
                        </button>
                        <button onClick={() => setLibTab('local')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${libTab === 'local' ? 'bg-white text-indigo-600 shadow-lg' : 'text-indigo-200 hover:text-white'}`}>
                            <History size={14} /> أرشيف أسئلتي
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
                    {isLoading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}
                    
                    {libTab === 'global' && cloudConnected && (
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl mb-2 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-700 text-[10px] font-black">
                           <ShieldCheck size={14} /> متصل بالسحابة (Supabase)
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold">{cloudStats.total} سؤال متاح</div>
                      </div>
                    )}

                    {libraryContent.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                            <History size={64} className="opacity-20" />
                            <p className="font-bold">لا توجد بيانات متاحة في هذا القسم.</p>
                        </div>
                    ) : (
                        libraryContent.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => { setIsLibraryOpen(false); handleSend(item.question); }}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${
                                            item.category === 'exam' ? 'bg-red-50 text-red-600' : 
                                            item.category === 'summary' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            {item.category === 'exam' ? 'توقع امتحان' : item.category === 'summary' ? 'ليلة الامتحان' : 'شرح درس'}
                                        </span>
                                        {item.timesAsked > 1 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1"><Users size={10}/> {item.timesAsked} طلاب</span>}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-bold">{new Date(item.timestamp).toLocaleDateString('ar-EG')}</div>
                                </div>
                                <p className="font-black text-slate-800 leading-relaxed group-hover:text-indigo-600 transition-colors">{item.question}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-3 py-3 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className={`flex items-center gap-2 flex-1 ${studyLanguage === StudyLanguage.ARABIC ? 'flex-row' : 'flex-row-reverse'}`}>
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={24} className={studyLanguage === StudyLanguage.ARABIC ? '' : 'rotate-180'} /></button>
          <div className={studyLanguage === StudyLanguage.ARABIC ? 'text-right' : 'text-left'}>
            <h1 className="text-lg font-bold text-slate-800 truncate leading-tight flex items-center gap-1.5">
               {subject} <Heart size={14} className="text-red-500 fill-current animate-pulse" />
            </h1>
            <div className="flex items-center gap-2 relative">
                <p className="text-[10px] text-indigo-600 font-black">{grade}</p>
                
                {/* مؤشر الحالة السحابية المتطور */}
                {cloudConnected ? (
                    <span title="مشروعك متصل بسحابة Supabase بنجاح" className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm transition-all hover:bg-emerald-100 cursor-pointer">
                        <div className="relative">
                          <Cloud size={11} className="fill-current opacity-20" />
                          <Cloud size={11} className="absolute inset-0" />
                          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-[9px] font-black tracking-tight">Supabase Live</span>
                    </span>
                ) : (
                    <div className="relative group">
                        <span 
                            onClick={() => setShowStatusHint(!showStatusHint)}
                            className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 cursor-help hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                        >
                            <CloudOff size={11} />
                            <span className="text-[9px] font-black">Offline Mode</span>
                        </span>
                        
                        {showStatusHint && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] p-5 z-50 animate-in fade-in slide-in-from-top-1 text-right border-t-4 border-t-red-500">
                                <div className="flex items-center gap-2 text-red-600 mb-3 border-b border-slate-100 pb-2">
                                    <AlertCircle size={16} />
                                    <span className="text-[11px] font-black">فحص اتصال السحابة</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold">
                                        <span className={getSupabaseStatus().hasUrl ? "text-emerald-600" : "text-red-500"}>
                                            {getSupabaseStatus().hasUrl ? "رابط صحيح ✅" : "مفقود ❌"}
                                        </span>
                                        <span className="text-slate-500">Supabase URL</span>
                                    </div>
                                    <div className="flex flex-col gap-2 border-t border-slate-50 pt-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                          <span className={getSupabaseStatus().isKeyFormatCorrect ? "text-emerald-600" : "text-red-500"}>
                                              {getSupabaseStatus().isKeyFormatCorrect ? "تنسيق صحيح (eyJ) ✅" : "تنسيق خاطئ ❌"}
                                          </span>
                                          <span className="text-slate-500">تنسيق المفتاح</span>
                                        </div>
                                        {getSupabaseStatus().isStripeKeyDetected && (
                                          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-[9px] font-black leading-relaxed mt-1 border border-red-100">
                                            ⚠️ خطأ شائع: لقد استخدمت مفتاح Stripe (يبدأ بـ sb_). سوبابيز يتطلب المفتاح الذي يبدأ بـ (eyJ).
                                          </div>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => window.location.reload()} className="mt-4 w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black">إعادة تحديث الصفحة</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
            <button onClick={openLibrary} className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm relative group" title="بنك المتفوقين">
                <Database size={22} />
                {cloudConnected && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>}
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full"></span>
            </button>
            <button onClick={() => setIsLessonBrowserOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-100 active:scale-95 transition-all">
                <List size={18} />
                <span className="hidden sm:inline">منهج المادة</span>
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} subject={subject} onQuote={handleQuote} />)}
        {isLoading && (
          <div className={`flex ${studyLanguage === StudyLanguage.ARABIC ? 'justify-start' : 'justify-end'}`}>
            <div className="bg-white border border-slate-100 px-5 py-3.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-xs text-indigo-600 font-bold">{studyLanguage === StudyLanguage.ARABIC ? 'الدكتور يجهز لك الخلاصة...' : 'Doctor is analyzing...'}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 space-y-4 shadow-[0_-10px_25px_rgba(0,0,0,0.03)] no-print">
        {selectedAttachment && (
            <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-2">
                <div className="bg-indigo-600 text-white p-2 rounded-xl"><Paperclip size={16} /></div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-indigo-900 truncate">{selectedAttachment.name}</p>
                    <p className="text-[10px] text-indigo-400 uppercase font-black">{selectedAttachment.type}</p>
                </div>
                <button onClick={() => setSelectedAttachment(null)} className="p-1.5 hover:bg-indigo-100 rounded-full text-indigo-600"><X size={16} /></button>
            </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <QuickTool 
            icon={Brain} 
            label={studyLanguage === StudyLanguage.ARABIC ? "أسئلة الدرس المتوقعة" : "Lesson Forecast Qs"} 
            color="text-violet-600 border-violet-100 bg-violet-50/30" 
            prompt={studyLanguage === StudyLanguage.ARABIC ? `بناءً على الدرس الذي شرحته لي للتو أو ناقشناه، أريد "الأسئلة النهائية" التي تضمن لي فهم الدرس بنسبة 100%. وفر لي أهم وأصعب التركات المتوقعة في الامتحان لهذا الدرس تحديداً مع الإجابات النموذجية.` : `Based on the lesson we just discussed, generate the "Ultimate Questions" that guarantee 100% mastery. Provide the most expected and challenging exam-style questions for this specific lesson with ideal answers.`} 
          />
          <QuickTool 
            icon={Sparkles} 
            label={studyLanguage === StudyLanguage.ARABIC ? "عصارة ليلة الامتحان" : "Final Night Booklet"} 
            color="text-amber-600 border-amber-100 bg-amber-50/30" 
            prompt={studyLanguage === StudyLanguage.ARABIC ? `يا دكتور، أعطني "المذكرة الذهبية" لليلة الامتحان في مادة ${subject}. ركز على أهم التركات والمتوقع.` : `Doctor, give me the "Golden Night Booklet" for ${subject}. Focus on the most expected points.`} 
          />
          <QuickTool 
            icon={FileSearch} 
            label={studyLanguage === StudyLanguage.ARABIC ? "امتحان متوقع + الإجابات" : "Mock Exam + Answers"} 
            color="text-red-600 border-red-100 bg-red-50/30" 
            prompt={studyLanguage === StudyLanguage.ARABIC ? `ولد لي نموذج امتحان ليلة الامتحان في مادة ${subject} (15 سؤال MCQ) مع شرح الإجابات في النهاية.` : `Generate a Final Mock Exam for ${subject} with 15 MCQ questions and detailed answers.`} 
          />
        </div>

        <div className={`flex items-center gap-2 ${studyLanguage === StudyLanguage.ARABIC ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setIsVoiceModalOpen(true)} className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all active:scale-90 shadow-lg shadow-indigo-200"><Mic size={24} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-90 border border-slate-200"><Paperclip size={24} /></button>
            <button onClick={() => cameraInputRef.current?.click()} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-90"><Camera size={24} /></button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="environment" className="hidden" />
          </div>
          
          <div className="flex-1 relative flex items-center">
            <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder={studyLanguage === StudyLanguage.ARABIC ? "اسأل دكتور المادة..." : "Ask your Subject Doctor..."} className={`w-full bg-slate-50 border-none rounded-2xl px-4 py-4 h-[58px] focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-sm shadow-inner scrollbar-hide resize-none ${studyLanguage === StudyLanguage.ARABIC ? 'text-right' : 'text-left'}`} />
            <button onClick={() => handleSend()} disabled={(!inputValue.trim() && !selectedAttachment) || isLoading} className={`absolute ${studyLanguage === StudyLanguage.ARABIC ? 'left-2.5' : 'right-2.5'} p-2.5 rounded-xl transition-all ${inputValue.trim() || selectedAttachment ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Send size={20} className={studyLanguage === StudyLanguage.ARABIC ? 'rotate-[-180deg]' : ''} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
