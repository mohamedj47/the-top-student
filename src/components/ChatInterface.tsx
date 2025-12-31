import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, GenerationOptions } from '../types';
import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { LiveVoiceModal } from './LiveVoiceModal';
import { 
  Send, ChevronRight, List, Bot, Loader2, WifiOff, Database, 
  HardDriveDownload, BrainCircuit, Sparkles, BookText, 
  Trophy, HelpCircle, Target, Lightbulb, Mic, Camera, Paperclip, X, Image as ImageIcon, GraduationCap, CheckCircle
} from 'lucide-react';

const LessonBrowser = React.lazy(() => import('./LessonBrowser').then(module => ({ default: module.LessonBrowser })));
const YouTubeModal = React.lazy(() => import('./YouTubeModal').then(module => ({ default: module.YouTubeModal })));

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  onBack: () => void;
  onSubscribe?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, onBack, onSubscribe }) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    text: `مرحباً بك في مادة **${subject}**! 🚀\nأنا معلمك الذكي، يمكنك سؤالي كتابةً، أو تصوير سؤالك بالكاميرا، أو التحدث معي بالصوت. جرب الضغط على أي جملة في كلامي للسؤال عنها!`,
    sender: Sender.BOT,
    timestamp: new Date(),
  }]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedAttachment({
        type: 'image',
        mimeType: file.type,
        data: base64,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleQuote = (text: string) => {
    setInputValue(`اشرح لي أكثر عن: "${text}"`);
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
      text: finalQuery.trim() || (selectedAttachment ? "اشرح لي هذه الصورة" : ""), 
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
        userMessage.text, 
        grade, 
        subject, 
        messages, 
        chunk => {
          setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, text: chunk } : msg));
        }, 
        userMessage.attachment, 
        undefined, 
        localStorage.getItem('device_id') || 'local'
      );
      
      setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, isStreaming: false } : msg));
    } catch (err) { 
      console.error(err);
      setMessages(prev => [...prev, { id: 'err', text: "عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى.", sender: Sender.BOT, timestamp: new Date() }]);
    } finally { 
      setIsLoading(false); 
    }
  };

  const QuickTool = ({ icon: Icon, label, color, prompt, onClick }: { icon: any, label: string, color: string, prompt?: string, onClick?: () => void }) => (
    <button 
      onClick={onClick || (() => handleSend("", prompt))}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap ${color} hover:border-current`}
    >
      <Icon size={16} />
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 chat-container">
      <Suspense fallback={null}>
        <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} onPlayVideo={(l, d) => { setCurrentLessonTitle(l); setCurrentVideoData(d); setIsVideoModalOpen(true); }} onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(`اشرح درس "${l}" بالتفصيل مع أمثلة تطبيقية`); }} />
        <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
        <LiveVoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} grade={grade} subject={subject} />
      </Suspense>

      <header className="bg-white border-b border-slate-200 px-3 py-3 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={24} /></button>
          <div className="text-right">
            <h1 className="text-lg font-bold text-slate-800 truncate leading-tight">{subject}</h1>
            <p className="text-[10px] text-indigo-600 font-black">{grade}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsLessonBrowserOpen(true)} className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><List size={22} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.map(msg => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            subject={subject} 
            onQuote={handleQuote} 
          />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 px-5 py-3.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-xs text-indigo-600 font-bold">المعلم يفكر...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 space-y-4 shadow-[0_-10px_25px_rgba(0,0,0,0.03)] no-print">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <QuickTool icon={BookText} label="مذكرة ليلة الامتحان" color="text-indigo-600 border-indigo-100" prompt={`أريد "مذكرة ليلة الامتحان" الشاملة لمادة ${subject} لصف ${grade}. قدمها في جداول منظمة لأهم القوانين والتعريفات.`} />
          <QuickTool icon={Trophy} label="اختبار مستوى شامل" color="text-emerald-600 border-emerald-100" prompt={`قم بإعداد "اختبار قياس مستوى شامل" لـ ${subject}. أريد 5 أسئلة MCQ صعبة ومبتكرة مع إخفاء الإجابات النموذجية في الأسفل.`} />
          <QuickTool icon={CheckCircle} label="عرض الإجابات" color="text-blue-600 border-blue-100" prompt={`أظهر لي الإجابات النموذجية لآخر اختبار قمت بطرحه مع شرح سبب اختيار كل إجابة.`} />
          <QuickTool icon={HelpCircle} label="سؤال MCQ تفاعلي" color="text-amber-600 border-amber-100" prompt={`اطرح عليّ الآن سؤال MCQ واحد فقط من أهم أجزاء منهج ${subject} واطلب مني الإجابة.`} />
          <QuickTool icon={Target} label="أهم التوقعات" color="text-red-600 border-red-100" prompt={`ما هي أهم التوقعات والأسئلة التي تتكرر دائماً في امتحانات الوزارة لمادة ${subject}؟`} />
        </div>

        {selectedAttachment && (
          <div className="flex items-center gap-3 p-2 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-2">
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-indigo-200 shadow-sm">
              <img src={`data:${selectedAttachment.mimeType};base64,${selectedAttachment.data}`} alt="preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-right">
               <p className="text-[11px] font-black text-indigo-700">تم التقاط الصورة ✅</p>
            </div>
            <button onClick={() => setSelectedAttachment(null)} className="p-1.5 bg-white rounded-full text-red-500 shadow-md hover:bg-red-50"><X size={16} /></button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setIsVoiceModalOpen(true)} className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-90"><Mic size={24} /></button>
            <button onClick={() => cameraInputRef.current?.click()} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-90"><Camera size={24} /></button>
            <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="environment" className="hidden" />
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-90"><Paperclip size={24} /></button>
          </div>
          
          <div className="flex-1 relative flex items-center">
            <textarea 
              ref={textareaRef}
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
              placeholder="اكتب سؤالك هنا..." 
              className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 resize-none h-[58px] focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-sm shadow-inner" 
            />
            <button 
              onClick={() => handleSend()} 
              disabled={(!inputValue.trim() && !selectedAttachment) || isLoading} 
              className={`absolute left-2.5 p-2.5 rounded-xl transition-all shadow-sm ${inputValue.trim() || selectedAttachment ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Send size={20} className="rotate-[-180deg]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
