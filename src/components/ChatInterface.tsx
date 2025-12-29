
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, PerformanceMetrics } from '../types';
import { generateStreamResponse, evaluateStudentLevel } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { getApiKey } from '../utils/apiKeyManager';
import { Send, Sparkles, ChevronRight, HelpCircle, FileText, Lightbulb, Bot, List, Printer, Mic, Camera, Paperclip, X, AudioLines, StopCircle, BrainCircuit, Globe, BadgePercent, AlertCircle, TrendingUp, Loader2, WifiOff, Clock, CheckCircle2 } from 'lucide-react';

// Lazy-loaded components
const LiveVoiceModal = React.lazy(() => import('./LiveVoiceModal').then(module => ({ default: module.LiveVoiceModal })));
const LessonBrowser = React.lazy(() => import('./LessonBrowser').then(module => ({ default: module.LessonBrowser })));
const YouTubeModal = React.lazy(() => import('./YouTubeModal').then(module => ({ default: module.YouTubeModal })));
const PerformanceDashboard = React.lazy(() => import('./PerformanceDashboard').then(module => ({ default: module.PerformanceDashboard })));

const GlobalSuspenseFallback = (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
  </div>
);

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  onBack: () => void;
  onSubscribe?: () => void;
}

const SUGGESTIONS = [
  { 
    label: '📝 مذكرة ليلة الامتحان الشاملة', 
    icon: <Sparkles size={18} className="text-amber-500" />, 
    promptPrefix: 'بصفتك كبير خبراء المناهج ومحلل امتحانات الثانوية العامة، قم بإنشاء "مذكرة ليلة الامتحان الشاملة" لدرس: [اكتب اسم الدرس]. \nيجب أن تشمل المذكرة كل شيء "من الواضح لما بين السطور" وبالتنسيق التالي حرفياً:\n\n1️⃣ الخلاصة: أهم المفاهيم والنظريات لهذا الجزء بشكل مركز جداً.\n2️⃣ أهم النقاط: كل النقاط التي يركز عليها واضعو الامتحان (الفنيات والتكات).\n3️⃣ أمثلة عملية: مثال أو اثنين لكل نوع سؤال مهم مع شرح خطوات الحل.\n4️⃣ أسئلة محلولة: من 5 إلى 10 أسئلة نموذجية مع حلول مختصرة وسهلة الفهم.\n5️⃣ ملخص سريع (قبل اللجنة): صفحة الـ 60 ثانية التي تشمل أهم القوانين والكلمات المفتاحية.\n\nالتنسيق: استخدم جداول Markdown والرموز التعبيرية واجعل اللهجة مصرية تعليمية محفزة.', 
    autoSend: false 
  },
  { 
    label: '📊 اختبار قياس المستوى الشامل', 
    icon: <BrainCircuit size={18} />, 
    promptPrefix: 'أريد "اختباراً شاملاً لقياس مستواي الحقيقي" لدرس: [اكتب اسم الدرس]. \nبصفتك خبير مناهج، التزم بالآتي حرفياً:\n1. اعرض الآن مجموعة أسئلة فقط (بدون إجابات) تغطي المنهج كامل لهذا الدرس.\n2. نوّع الأسئلة لتشمل (اختياري، مقالي، فنيات).\n3. اطلب مني الحل أولاً ثم كتابة "عرض الإجابات" للتقييم.', 
    autoSend: false 
  },
  { 
    label: '✅ عرض الإجابات النموذجية', 
    icon: <CheckCircle2 size={18} />, 
    promptPrefix: 'أريد الآن "عرض الإجابات النموذجية" للاختبار السابق مع تحليل مستواي (ضعيف/متوسط/جيد/متفوق) وتوضيح نقاط القوة والضعف.', 
    autoSend: false 
  },
  { label: 'اختر درساً للشرح', icon: <List size={18} />, promptPrefix: 'LESSON_BROWSER_TRIGGER', autoSend: false },
  { label: 'سؤال MCQ تفاعلي', icon: <HelpCircle size={18} />, promptPrefix: 'أريد سؤال MCQ تفاعلي عن: ', autoSend: false },
  { label: 'أهم التوقعات', icon: <Lightbulb size={18} />, promptPrefix: 'ما هي أهم التوقعات في: ', autoSend: false },
  { label: 'لخص المفهوم', icon: <FileText size={18} />, promptPrefix: 'لخص لي موضوع: ', autoSend: false },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, onBack, onSubscribe }) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    text: `أهلاً بك في مادة **${subject}**! 🚀\nيمكنك كتابة السؤال، رفع صورة، أو تسجيل صوتك.`,
    sender: Sender.BOT,
    timestamp: new Date(),
  }]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLessonBrowserOpen, setIsLessonBrowserOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoData, setCurrentVideoData] = useState<VideoResult | null>(null);
  const [currentLessonTitle, setCurrentLessonTitle] = useState('');
  const [apiKeyWarning, setApiKeyWarning] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const key = getApiKey();
    if (!key || key === "") setApiKeyWarning(true);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, attachment]);

  const handleMeasureLevel = async () => {
    if (messages.length < 3) return alert("تفاعل مع البوت بسؤالين على الأقل أولاً.");
    setIsEvaluating(true);
    try {
      const result = await evaluateStudentLevel(messages, subject);
      if (result) { setPerformanceMetrics(result); setIsDashboardOpen(true); }
      else alert("عذراً، لم أتمكن من التحليل حالياً.");
    } catch (e) { console.error(e); }
    finally { setIsEvaluating(false); }
  };

  /**
   * دالة للتعامل مع تسجيل الصوت
   */
  const handleRecordToggle = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            setAttachment({
              type: 'audio',
              mimeType: 'audio/webm',
              data: base64data,
              name: `صوت_${new Date().toLocaleTimeString('ar-EG')}.webm`
            });
          };
          reader.readAsDataURL(blob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access error:", err);
        alert("لم نتمكن من الوصول للميكروفون. يرجى التحقق من الأذونات.");
      }
    }
  };

  /**
   * دالة للتعامل مع اختيار الملفات والصور
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachment({
        type,
        mimeType: file.type,
        data: base64,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input to allow selecting same file again
  };

  const handleSend = async (text: string = inputValue) => {
    if ((!text.trim() && !attachment) || isLoading) return;
    const finalText = text.trim() || (attachment?.type === 'image' ? 'اشرح هذه الصورة' : attachment?.type === 'audio' ? 'استمع وأجب' : 'اشرح هذا الملف');
    const userMessage: Message = { id: Date.now().toString(), text: finalText, sender: Sender.USER, timestamp: new Date(), attachment: attachment ? { ...attachment } : undefined };
    setMessages(prev => [...prev, userMessage]);
    setInputValue(''); setAttachment(null); setIsLoading(true);

    try {
      const botId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botId, text: '', sender: Sender.BOT, timestamp: new Date(), isStreaming: true }]);
      
      const deviceId = localStorage.getItem('device_id') || 'local_user';
      
      await generateStreamResponse(finalText, grade, subject, messages, chunk => {
        setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, text: chunk } : msg));
      }, userMessage.attachment, { useThinking: isThinkingMode, useSearch: isSearchMode }, deviceId);
      
      setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, isStreaming: false } : msg));
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleSuggestionClick = (sugg: typeof SUGGESTIONS[0]) => {
    if (sugg.promptPrefix === 'LESSON_BROWSER_TRIGGER') { setIsLessonBrowserOpen(true); return; }
    setInputValue(sugg.promptPrefix);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleQuoteClick = (text: string) => {
    const cleanText = text.substring(0, 150) + (text.length > 150 ? '...' : '');
    setInputValue(`اشرح لي بالتفصيل: "${cleanText}"`);
    setTimeout(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
  };

  const handlePrint = () => window.print();
  const handlePlayVideo = (lesson: string, data: VideoResult) => { setCurrentLessonTitle(lesson); setCurrentVideoData(data); setIsVideoModalOpen(true); };
  const handleExplainLesson = (lesson: string) => { setIsLessonBrowserOpen(false); handleSend(`اشرح لي درس "${lesson}" بالتفصيل.`); };

  return (
    <div className="flex flex-col h-screen bg-slate-50 chat-container">
      <Suspense fallback={<div className="hidden" />}>
        <LiveVoiceModal isOpen={isLiveMode} onClose={() => setIsLiveMode(false)} grade={grade} subject={subject} />
      </Suspense>
      
      <Suspense fallback={<div className="hidden" />}>
        <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} onPlayVideo={handlePlayVideo} onExplain={handleExplainLesson} />
      </Suspense>
      
      <Suspense fallback={GlobalSuspenseFallback}>
        <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
      </Suspense>
      
      {isDashboardOpen && performanceMetrics && (
        <Suspense fallback={GlobalSuspenseFallback}>
          <PerformanceDashboard metrics={performanceMetrics} subject={subject} onClose={() => setIsDashboardOpen(false)} />
        </Suspense>
      )}

      {isOffline && (
        <div className="bg-amber-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-300">
          <WifiOff size={14} />
          <span>أنت الآن في وضع الأوفلاين - يتم استخدام الذاكرة المحلية</span>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-3 py-3 flex justify-between items-center shadow-sm gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={24} /></button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{subject}</h1>
            <p className="text-xs text-slate-500 truncate">{grade}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleMeasureLevel} disabled={isEvaluating} className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-black text-xs ${isEvaluating ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'}`}>
            {isEvaluating ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />} {isEvaluating ? 'جاري التحليل...' : 'قياس مستواي'}
          </button>
          {apiKeyWarning && <div className="hidden lg:flex items-center gap-1.5 text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse"><AlertCircle size={14} /><span className="text-[10px] font-bold">عقل الـ AI غير مفعل</span></div>}
          {onSubscribe && <button onClick={onSubscribe} className="bg-amber-400 hover:bg-amber-500 text-amber-900 px-4 py-2 rounded-full font-bold flex items-center gap-1"><BadgePercent size={16} /><span className="hidden sm:inline">اشترك الآن</span></button>}
          <button onClick={() => setIsLessonBrowserOpen(true)} className="p-2 rounded-full hover:bg-red-50"><List size={22} /></button>
          <button onClick={handlePrint} className="p-2 rounded-full hover:bg-indigo-50"><Printer size={20} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
        {messages.map(msg => <div key={msg.id}><MessageBubble message={msg} subject={subject} onQuote={handleQuoteClick} /></div>)}
        {isLoading && <div className="flex justify-start"><div className="bg-white border px-5 py-4 rounded-3xl shadow-sm flex items-center gap-3"><Bot size={20} className="text-indigo-600 animate-pulse" /><span className="text-xs text-indigo-500 font-bold">لحظات، أقوم بتحضير إجابتك...</span></div></div>}
        <div ref={messagesEndRef} />
      </div>

      {!isLoading && !attachment && (
        <div className="px-3 py-2 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => handleSuggestionClick(s)} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm border-slate-100">
              <span className="text-indigo-500">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {attachment && <div className="px-5 py-3 bg-slate-100 border-t flex items-center justify-between">
        <div className="flex items-center gap-4">
          {attachment.type === 'image' ? <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="h-14 w-14 object-cover rounded-xl border-2 border-indigo-200" /> : <div className="h-14 w-14 flex items-center justify-center rounded-xl border-2">{attachment.type === 'audio' ? <Mic size={24} /> : <FileText size={24} />}</div>}
          <div className="text-sm font-bold truncate max-w-[200px]">{attachment.name || 'مرفق'}</div>
        </div>
        <button onClick={() => setAttachment(null)} className="p-2 rounded-full hover:rotate-90"><X size={20} /></button>
      </div>}

      <div className="p-3 bg-white border-t flex items-end gap-2">
        <input type="file" ref={fileInputRef} className="hidden" accept="*/*" onChange={(e) => handleFileSelect(e, 'file')} />
        <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileSelect(e, 'image')} />
        
        <button onClick={() => cameraInputRef.current?.click()} className="p-3 text-slate-500 hover:text-indigo-600 transition-all active:scale-90"><Camera size={24} /></button>
        <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-500 hover:text-indigo-600 transition-all active:scale-90"><Paperclip size={24} /></button>
        
        <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={isRecording ? "جاري التسجيل..." : "اكتب سؤالك هنا..."} className="flex-1 bg-slate-50 border rounded-2xl px-4 py-3.5 resize-none h-[56px] focus:ring-2 focus:ring-indigo-200 outline-none transition-all" disabled={isRecording} />
        
        <button onClick={handleRecordToggle} className={`${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'} p-3 rounded-2xl transition-all active:scale-90`}><Mic size={24} /></button>
        <button onClick={() => handleSend()} disabled={(!inputValue.trim() && !attachment) || isLoading || isRecording} className={`${(inputValue.trim() || attachment) && !isLoading ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'} p-3 rounded-2xl transition-all active:scale-95`}><Send size={24} /></button>
      </div>
    </div>
  );
};
