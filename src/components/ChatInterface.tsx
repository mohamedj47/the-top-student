
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, PerformanceMetrics } from '../types';
import { generateStreamResponse, evaluateStudentLevel } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { getApiKey } from '../utils/apiKeyManager';
import { Send, Sparkles, ChevronRight, HelpCircle, FileText, Lightbulb, Bot, List, Printer, Mic, Camera, Paperclip, X, AudioLines, StopCircle, BrainCircuit, Globe, BadgePercent, AlertCircle, TrendingUp, Loader2, WifiOff, Clock } from 'lucide-react';

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
  { label: '📝 مراجعة ليلة الامتحان', icon: <Clock size={18} />, promptPrefix: 'أريد "مراجعة ليلة الامتحان" مركزة جداً لدرس: [اكتب اسم الدرس هنا]. \nالتزم بالترتيب التالي حرفياً وبدون حشو:\n1️⃣ أهم المفاهيم الأساسية (تعريفات مختصرة جداً).\n2️⃣ أهم القوانين أو النقاط الحتمية التي لا يخرج عنها الامتحان.\n3️⃣ أكثر الأسئلة المتوقعة تكراراً بصيغة الامتحان.\n4️⃣ أخطاء شائعة يقع فيها الطلاب وتصحيحها.\n5️⃣ تنبيهات ليلة الامتحان (احفظ – انتبه – لا تخلط – ركّز).\n6️⃣ فقرة "لو معاك 30 دقيقة بس، تذاكر إيه؟" (ترتيب أولويات).\nالأسلوب: نقاط مختصرة، لغة بسيطة، مناسبة للمراجعة السريعة.', autoSend: false },
  { label: 'اختر درساً للشرح', icon: <List size={18} />, promptPrefix: 'LESSON_BROWSER_TRIGGER', autoSend: false },
  { label: 'أسئلة تدريبية', icon: <HelpCircle size={18} />, promptPrefix: 'أعطني أسئلة تدريبية عن: ', autoSend: false },
  { label: 'لخص المفهوم', icon: <FileText size={18} />, promptPrefix: 'لخص لي موضوع: ', autoSend: false },
  { label: 'أهم التوقعات', icon: <Lightbulb size={18} />, promptPrefix: 'ما هي أهم التوقعات في: ', autoSend: false },
  { label: 'أهم نقاط الامتحان', icon: <Sparkles size={18} />, promptPrefix: 'ما هي أهم نقاط الامتحان في: ', autoSend: false },
  { label: 'سؤال MCQ تفاعلي', icon: <HelpCircle size={18} />, promptPrefix: 'أريد سؤال MCQ تفاعلي عن: ', autoSend: false },
  { label: 'خريطة ذهنية', icon: <BrainCircuit size={18} />, promptPrefix: 'اعمل لي خريطة ذهنية لدرس: ', autoSend: false },
  { label: 'لخص في 5 نقاط', icon: <FileText size={18} />, promptPrefix: 'لخص لي في 5 نقاط فقط: ', autoSend: false },
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

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = (e.target?.result as string).split(',')[1];
      const mimeType = file.type;
      let type: 'image' | 'file' = 'file';
      if (mimeType.startsWith('image/')) type = 'image';
      setAttachment({ type, mimeType, data: base64String, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setAttachment({ type: 'audio', mimeType: 'audio/mp3', data: base64String, name: 'تسجيل صوتي' });
          stream.getTracks().forEach(track => track.stop());
        };
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { console.error("Error accessing mic:", err); alert("لا يمكن الوصول للميكروفون."); }
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
    // تأخير بسيط لضمان تحديث الواجهة والتركيز على شريط البحث
    setTimeout(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
  };

  const handlePrint = () => window.print();
  const toggleThinking = () => { setIsThinkingMode(prev => !prev); if (!isThinkingMode) setIsSearchMode(false); };
  const toggleSearch = () => { setIsSearchMode(prev => !prev); if (!isSearchMode) setIsThinkingMode(false); };
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

      {/* Offline Indicator */}
      {isOffline && (
        <div className="bg-amber-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-300">
          <WifiOff size={14} />
          <span>أنت الآن في وضع الأوفلاين - يتم استخدام الذاكرة المحلية</span>
        </div>
      )}

      {/* File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
      <input type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />

      {/* Header */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
        {messages.map(msg => <div key={msg.id}><MessageBubble message={msg} subject={subject} onQuote={handleQuoteClick} /></div>)}
        {isLoading && <div className="flex justify-start"><div className="bg-white border px-5 py-4 rounded-3xl shadow-sm flex items-center gap-3"><Bot size={20} className="text-indigo-600 animate-pulse" /><span className="text-xs text-indigo-500 font-bold">لحظات، أقوم بتحضير إجابتك...</span></div></div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {!isLoading && !attachment && <div className="px-3 py-2 flex flex-wrap gap-2 justify-center">{SUGGESTIONS.map((s, i) => <button key={i} onClick={() => handleSuggestionClick(s)} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95"><span className="text-indigo-500">{s.icon}</span>{s.label}</button>)}</div>}

      {/* Attachment Preview */}
      {attachment && <div className="px-5 py-3 bg-slate-100 border-t flex items-center justify-between">
        <div className="flex items-center gap-4">
          {attachment.type === 'image' ? <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="h-14 w-14 object-cover rounded-xl border-2 border-indigo-200" /> : <div className="h-14 w-14 flex items-center justify-center rounded-xl border-2">{attachment.type === 'audio' ? <Mic size={24} /> : <FileText size={24} />}</div>}
          <div className="text-sm font-bold truncate max-w-[200px]">{attachment.name || 'مرفق'}</div>
        </div>
        <button onClick={() => setAttachment(null)} className="p-2 rounded-full hover:rotate-90"><X size={20} /></button>
      </div>}

      {/* Input Area */}
      <div className="p-3 bg-white border-t flex items-end gap-2">
        <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={isRecording ? "جاري التسجيل..." : isThinkingMode ? "اكتب مسألة صعبة..." : isSearchMode ? "ابحث عن معلومة..." : "اكتب سؤالك هنا..."} className="flex-1 bg-slate-50 border rounded-2xl px-4 py-3.5 resize-none h-[56px] focus:ring-2 focus:ring-indigo-200 outline-none transition-all" disabled={isRecording} />
        <button onClick={handleRecordToggle} className={`${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'} p-3 rounded-2xl transition-all active:scale-90`}><Mic size={24} /></button>
        <button onClick={() => handleSend()} disabled={(!inputValue.trim() && !attachment) || isLoading || isRecording} className={`${(inputValue.trim() || attachment) && !isLoading ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'} p-3 rounded-2xl transition-all active:scale-95`}><Send size={24} /></button>
      </div>
    </div>
  );
};
