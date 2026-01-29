// src/components/ChatInterface.tsx
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, StudyLanguage } from '../types';
import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { LiveVoiceModal } from './LiveVoiceModal';
import { DynamicQuestionBank, DynamicQuestion } from '../lib/dynamicBank';
import { isSupabaseConnected } from '../lib/supabase';
import { 
  Send, ChevronRight, Database, X, Loader2, Cloud, CloudOff, Users, ShieldCheck
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

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, studyLanguage = StudyLanguage.ARABIC, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryContent, setLibraryContent] = useState<DynamicQuestion[]>([]);
  const [cloudStats, setCloudStats] = useState({ total: 0, students: 0 });
  const [cloudConnected, setCloudConnected] = useState(false);
  const [libTab, setLibTab] = useState<'local' | 'global'>('global');
  const [isLoading, setIsLoading] = useState(false);
  const [isLessonBrowserOpen, setIsLessonBrowserOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentVideoData, setCurrentVideoData] = useState<VideoResult | null>(null);
  const [currentLessonTitle, setCurrentLessonTitle] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const connected = isSupabaseConnected();
    setCloudConnected(connected);
    if (connected) DynamicQuestionBank.getCloudStats().then(setCloudStats);

    const welcomeText = studyLanguage === StudyLanguage.ARABIC 
      ? `أهلاً بك يا بطل في مادة **${subject}**! 🚀`
      : `Welcome to **${subject}**! 🚀`;
    setMessages([{ id: '1', text: welcomeText, sender: Sender.BOT, timestamp: new Date() }]);
  }, [subject, studyLanguage]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim() && !selectedAttachment) return;
    const userMessage: Message = { id: Date.now().toString(), text, sender: Sender.USER, timestamp: new Date(), attachment: selectedAttachment || undefined };
    setMessages(prev => [...prev, userMessage]);
    setInputValue(''); setSelectedAttachment(null); setIsLoading(true);

    try {
      const botId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botId, text: '', sender: Sender.BOT, timestamp: new Date(), isStreaming: true }]);
      await generateStreamResponse(text, grade, subject, messages, chunk => {
        setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, text: chunk } : msg));
      }, selectedAttachment, { language: studyLanguage }, localStorage.getItem('device_id') || 'local');
      setMessages(prev => prev.map(msg => msg.id === botId ? { ...msg, isStreaming: false } : msg));
    } catch {
      setMessages(prev => [...prev, { id: 'err', text: studyLanguage === StudyLanguage.ARABIC ? "واجهت مشكلة في الاتصال." : "Connection error.", sender: Sender.BOT, timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const QuickTool = ({ icon: Icon, label, color, prompt }: { icon: any, label: string, color: string, prompt?: string }) => (
    <button onClick={() => handleSend(prompt)} disabled={isLoading} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${color}`}>
      <Icon size={16} />
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50" dir={studyLanguage === StudyLanguage.ARABIC ? 'rtl' : 'ltr'}>
      <Suspense fallback={null}>
        <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} studyLanguage={studyLanguage} onPlayVideo={(l,d) => { setCurrentLessonTitle(l); setCurrentVideoData(d); setIsVideoModalOpen(true); }} onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(`اشرح درس "${l}"`) }} />
        <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
        <LiveVoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} grade={grade} subject={subject} />
      </Suspense>

      {/* رسائل الدردشة */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} subject={subject} onQuote={(t) => setInputValue(t)} />)}
        <div ref={messagesEndRef} />
      </div>

      {/* إدخال المستخدم */}
      <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
        <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} className="flex-1 rounded-2xl px-4 py-3 border bg-slate-50" placeholder={studyLanguage === StudyLanguage.ARABIC ? "اسأل دكتور المادة..." : "Ask your Subject Doctor..."} />
        <button onClick={() => handleSend()} disabled={(!inputValue.trim() && !selectedAttachment) || isLoading} className="bg-indigo-600 text-white p-3 rounded-xl">Send</button>
      </div>
    </div>
  );
};
