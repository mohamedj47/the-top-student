import React, { useState, useRef, useEffect, Suspense } from 'react';
import {
  GradeLevel,
  Subject,
  Message,
  Sender,
  Attachment,
  StudyLanguage
} from '../types';

import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { VideoResult } from '../data/videoData';
import { LiveVoiceModal } from './LiveVoiceModal';
import { DynamicQuestionBank, DynamicQuestion } from '../lib/dynamicBank';
import { isSupabaseConfigured } from '../lib/supabase'; // ✅ FIX

import {
  Send,
  ChevronRight,
  List,
  Loader2,
  Mic,
  Paperclip,
  X,
  Database,
  History,
  Zap,
  Users,
  Cloud,
  CloudOff,
  ShieldCheck,
  Heart,
  Brain,
  Sparkles
} from 'lucide-react';

const LessonBrowser = React.lazy(() =>
  import('./LessonBrowser').then(m => ({ default: m.LessonBrowser }))
);

const YouTubeModal = React.lazy(() =>
  import('./YouTubeModal').then(m => ({ default: m.YouTubeModal }))
);

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  studyLanguage?: StudyLanguage;
  onBack: () => void;
  onSubscribe?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  grade,
  subject,
  studyLanguage = StudyLanguage.ARABIC,
  onBack
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryContent, setLibraryContent] = useState<DynamicQuestion[]>([]);
  const [cloudStats, setCloudStats] = useState({ total: 0, students: 0 });
  const [cloudConnected, setCloudConnected] = useState(false);
  const [libTab, setLibTab] = useState<'local' | 'global'>('global');

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isLessonBrowserOpen, setIsLessonBrowserOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const [currentVideoData, setCurrentVideoData] = useState<VideoResult | null>(null);
  const [currentLessonTitle, setCurrentLessonTitle] = useState('');

  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ✅ Supabase status
  useEffect(() => {
    const connected = isSupabaseConfigured(); // ✅ FIX
    setCloudConnected(connected);

    if (connected) {
      DynamicQuestionBank.getCloudStats().then(setCloudStats);
    }

    const welcomeText =
      studyLanguage === StudyLanguage.ARABIC
        ? `أهلاً بك يا بطل في مادة **${subject}**! 🚀
أنا دكتور المادة الخاص بك. أي معلومة سأشرحها لك سيتم حفظها تلقائياً في **"بنك الطالب"**.`
        : `Welcome to **${subject}**! 🚀
Everything I explain will be saved automatically to your Student Bank.`;

    setMessages([
      {
        id: 'welcome',
        text: welcomeText,
        sender: Sender.BOT,
        timestamp: new Date()
      }
    ]);
  }, [subject, studyLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  useEffect(() => {
    if (isLibraryOpen) openLibrary();
  }, [libTab]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = (ev.target?.result as string).split(',')[1];
      setSelectedAttachment({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        mimeType: file.type,
        data: base64,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (text: string = inputValue) => {
    if ((!text.trim() && !selectedAttachment) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: Sender.USER,
      timestamp: new Date(),
      attachment: selectedAttachment || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedAttachment(null);
    setIsLoading(true);

    try {
      const botId = `${Date.now()}_bot`;

      setMessages(prev => [
        ...prev,
        { id: botId, text: '', sender: Sender.BOT, timestamp: new Date(), isStreaming: true }
      ]);

      await generateStreamResponse(
        userMessage.text,
        grade,
        subject,
        messages,
        chunk => {
          setMessages(prev =>
            prev.map(m => (m.id === botId ? { ...m, text: chunk } : m))
          );
        },
        userMessage.attachment,
        { language: studyLanguage },
        localStorage.getItem('device_id') || 'local'
      );

      setMessages(prev =>
        prev.map(m => (m.id === botId ? { ...m, isStreaming: false } : m))
      );
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: 'err',
          text:
            studyLanguage === StudyLanguage.ARABIC
              ? 'حدث خطأ في الاتصال.'
              : 'Connection error occurred.',
          sender: Sender.BOT,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Suspense fallback={null}>
        <LessonBrowser
          isOpen={isLessonBrowserOpen}
          onClose={() => setIsLessonBrowserOpen(false)}
          grade={grade}
          subject={subject}
          studyLanguage={studyLanguage}
          onPlayVideo={(l, d) => {
            setCurrentLessonTitle(l);
            setCurrentVideoData(d);
            setIsVideoModalOpen(true);
          }}
          onExplain={l => handleSend(`اشرح درس "${l}" بالتفصيل`)}
        />

        <YouTubeModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          videoData={currentVideoData}
          lessonTitle={currentLessonTitle}
        />

        <LiveVoiceModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          grade={grade}
          subject={subject}
        />
      </Suspense>

      {/* HEADER */}
      <header className="bg-white border-b p-3 flex justify-between items-center">
        <button onClick={onBack}>
          <ChevronRight />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="font-bold">{subject}</h1>
          <Heart size={14} className="text-red-500" />
        </div>

        {cloudConnected ? (
          <span className="flex items-center gap-1 text-emerald-600 text-xs">
            <Cloud size={12} /> Supabase Live
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-400 text-xs">
            <CloudOff size={12} /> Offline
          </span>
        )}
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} subject={subject} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t bg-white flex gap-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 p-3 rounded-xl border"
          placeholder="اسأل دكتور المادة..."
        />

        <button
          onClick={() => handleSend()}
          disabled={isLoading}
          className="bg-indigo-600 text-white px-4 rounded-xl"
        >
          <Send size={18} />
        </button>

        <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden />
        <button onClick={() => fileInputRef.current?.click()}>
          <Paperclip />
        </button>

        <button onClick={() => setIsVoiceModalOpen(true)}>
          <Mic />
        </button>
      </div>
    </div>
  );
};
