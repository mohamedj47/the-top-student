
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, GenerationOptions, StudyLanguage } from '../types';
import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { LiveVoiceModal } from './LiveVoiceModal';
import { 
  Send, ChevronRight, List, Bot, Loader2, BookText, 
  Trophy, HelpCircle, Target, Mic, Camera, Paperclip, X, CheckCircle, GraduationCap
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

  useEffect(() => {
    const welcomeText = studyLanguage === StudyLanguage.ARABIC 
      ? `مرحباً بك في مادة **${subject}**! 🚀\nأنا معلمك الذكي، سأقوم بشرح المنهج لك وتوليد امتحانات MCQ بنظام الوزارة الجديد. تفضل بسؤالك!`
      : studyLanguage === StudyLanguage.ENGLISH 
      ? `Welcome to **${subject}**! 🚀\nI am your AI Tutor. I will explain the curriculum and generate mock MCQ exams in English. How can I help you?`
      : studyLanguage === StudyLanguage.FRENCH
      ? `Bienvenue au cours de **${subject}**! 🚀\nJe suis votre tuteur IA. Je vais expliquer le programme et générer des examens QCM en français.`
      : `Willkommen zum Fach **${subject}**! 🚀\nIch bin dein KI-Lehrer. Ich werde den Lehrplan erklären und MC-Prüfungen auf Deutsch erstellen.`;

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedAttachment({ type: 'image', mimeType: file.type, data: base64, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleQuote = (text: string) => {
    const prompt = studyLanguage === StudyLanguage.ARABIC ? `اشرح أكثر عن: "${text}"` : `Explain more about: "${text}"`;
    setInputValue(prompt);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSend = async (text: string = inputValue, specialPrompt?: string) => {
    const finalQuery = specialPrompt || text;
    if ((!finalQuery.trim() && !selectedAttachment) || isLoading) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      text: finalQuery.trim() || (selectedAttachment ? (studyLanguage === StudyLanguage.ARABIC ? "اشرح هذه الصورة" : "Explain this image") : ""), 
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
      const errMsg = studyLanguage === StudyLanguage.ARABIC ? "عذراً، واجهت مشكلة في الاتصال." : "Sorry, I encountered a connection issue.";
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
        <LessonBrowser 
          isOpen={isLessonBrowserOpen} 
          onClose={() => setIsLessonBrowserOpen(false)} 
          grade={grade} 
          subject={subject} 
          studyLanguage={studyLanguage}
          onPlayVideo={(l, d) => { setCurrentLessonTitle(l); setCurrentVideoData(d); setIsVideoModalOpen(true); }} 
          onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(studyLanguage === StudyLanguage.ARABIC ? `اشرح درس "${l}" بالتفصيل` : `Explain lesson "${l}" in detail`); }} 
        />
        <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
        <LiveVoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} grade={grade} subject={subject} />
      </Suspense>

      <header className="bg-white border-b border-slate-200 px-3 py-3 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className={`flex items-center gap-2 flex-1 ${studyLanguage === StudyLanguage.ARABIC ? 'flex-row' : 'flex-row-reverse'}`}>
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronRight size={24} className={studyLanguage === StudyLanguage.ARABIC ? '' : 'rotate-180'} />
          </button>
          <div className={studyLanguage === StudyLanguage.ARABIC ? 'text-right' : 'text-left'}>
            <h1 className="text-lg font-bold text-slate-800 truncate leading-tight">{subject}</h1>
            <p className="text-[10px] text-indigo-600 font-black">{grade} - {studyLanguage.toUpperCase()}</p>
          </div>
        </div>
        <button onClick={() => setIsLessonBrowserOpen(true)} className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><List size={22} /></button>
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
              <span className="text-xs text-indigo-600 font-bold">
                {studyLanguage === StudyLanguage.ARABIC ? 'المعلم يجهز الإجابة...' : 'AI Tutor is thinking...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 space-y-4 shadow-[0_-10px_25px_rgba(0,0,0,0.03)] no-print">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <QuickTool 
            icon={GraduationCap} 
            label={studyLanguage === StudyLanguage.ARABIC ? "امتحان شامل MCQ" : "Mock MCQ Exam"} 
            color="text-red-600 border-red-100 bg-red-50/30" 
            prompt={studyLanguage === StudyLanguage.ARABIC ? `ضع لي امتحان MCQ من 10 أسئلة على منهج ${subject} بنظام الوزارة الجديد مع الإجابات في النهاية.` : `Generate a 10-question Mock MCQ Exam for ${subject} with answers at the end.`} 
          />
          <QuickTool 
            icon={BookText} 
            label={studyLanguage === StudyLanguage.ARABIC ? "ملخص الدرس" : "Lesson Summary"} 
            color="text-indigo-600 border-indigo-100" 
            prompt={studyLanguage === StudyLanguage.ARABIC ? `لخص لي أهم نقاط مادة ${subject} في جدول.` : `Summarize the main points of ${subject} in a table.`} 
          />
          <QuickTool 
            icon={Target} 
            label={studyLanguage === StudyLanguage.ARABIC ? "أهم المصطلحات" : "Key Keywords"} 
            color="text-emerald-600 border-emerald-100" 
            prompt={studyLanguage === StudyLanguage.ARABIC ? `ما هي أهم المصطلحات العلمية في هذا الجزء مع شرحها؟` : `List the key scientific terms for this lesson and their definitions.`} 
          />
        </div>

        <div className={`flex items-center gap-2 ${studyLanguage === StudyLanguage.ARABIC ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setIsVoiceModalOpen(true)} className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all active:scale-90"><Mic size={24} /></button>
            <button onClick={() => cameraInputRef.current?.click()} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-90"><Camera size={24} /></button>
            <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="environment" className="hidden" />
          </div>
          
          <div className="flex-1 relative flex items-center">
            <textarea 
              ref={textareaRef} 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
              placeholder={studyLanguage === StudyLanguage.ARABIC ? "اسأل معلمك الذكي..." : "Ask your AI Tutor..."} 
              className={`w-full bg-slate-50 border-none rounded-2xl px-4 py-4 h-[58px] focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-sm shadow-inner ${studyLanguage === StudyLanguage.ARABIC ? 'text-right' : 'text-left'}`} 
            />
            <button 
              onClick={() => handleSend()} 
              disabled={(!inputValue.trim() && !selectedAttachment) || isLoading} 
              className={`absolute ${studyLanguage === StudyLanguage.ARABIC ? 'left-2.5' : 'right-2.5'} p-2.5 rounded-xl transition-all ${inputValue.trim() || selectedAttachment ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Send size={20} className={studyLanguage === StudyLanguage.ARABIC ? 'rotate-[-180deg]' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
