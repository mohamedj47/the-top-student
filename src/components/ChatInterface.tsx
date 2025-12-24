
import React, { useState, useRef, useEffect } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment } from '../types';
import { generateStreamResponse } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { LiveVoiceModal } from './LiveVoiceModal';
import { LessonBrowser } from './LessonBrowser';
import { YouTubeModal } from './YouTubeModal';
import { VideoResult } from '../data/videoData';
import { getActiveKeyIndex } from '../utils/apiKeyManager';
import { Send, Sparkles, ChevronRight, HelpCircle, FileText, Lightbulb, Bot, List, Printer, Mic, Camera, Paperclip, X, Image as ImageIcon, AudioLines, StopCircle, BrainCircuit, Globe, Youtube, PlayCircle, BadgePercent, Wifi, WifiOff, Cpu } from 'lucide-react';

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  onBack: () => void;
  onSubscribe?: () => void;
}

const SUGGESTIONS = [
  { label: 'اختر درساً للشرح', icon: <List size={18} />, promptPrefix: 'LESSON_BROWSER_TRIGGER', autoSend: false },
  { label: 'أسئلة تدريبية', icon: <HelpCircle size={18} />, promptPrefix: 'أعطني أسئلة تدريبية عن: ', autoSend: false },
  { label: 'لخص المفهوم', icon: <FileText size={18} />, promptPrefix: 'لخص لي موضوع: ', autoSend: false },
  { label: 'أهم التوقعات', icon: <Lightbulb size={18} />, promptPrefix: 'ما هي أهم التوقعات في: ', autoSend: false },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, onBack, onSubscribe }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `أهلاً بك يا بطل في مادة **${subject}**! 🚀\n\nأنا جاهز لمساعدتك. النظام يعمل الآن بكفاءة عالية.\n\n💡 *نصيحة: يمكنك تصوير مسألة من الكتاب 📸 للحصول على حل فوري.*`,
      sender: Sender.BOT,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLessonBrowserOpen, setIsLessonBrowserOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoData, setCurrentVideoData] = useState<VideoResult | null>(null);
  const [currentLessonTitle, setCurrentLessonTitle] = useState('');
  const [activeKeyNum, setActiveKeyNum] = useState(getActiveKeyIndex());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    setActiveKeyNum(getActiveKeyIndex());
  }, [messages, attachment]);

  const handleSend = async (text: string = inputValue) => {
    if ((!text.trim() && !attachment) || isLoading) return;

    let finalText = text;
    if (!finalText.trim() && attachment) {
        if (attachment.type === 'image') finalText = "اشرح هذه الصورة";
        else if (attachment.type === 'audio') finalText = "استمع وأجب";
        else finalText = "اشرح هذا الملف";
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: finalText,
      sender: Sender.USER,
      timestamp: new Date(),
      attachment: attachment ? { ...attachment } : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const botMessageId = (Date.now() + 1).toString();
      const initialBotMessage: Message = {
        id: botMessageId,
        text: '',
        sender: Sender.BOT,
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, initialBotMessage]);

      await generateStreamResponse(
        finalText,
        grade,
        subject,
        messages,
        (chunkText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, text: chunkText } : msg
            )
          );
        },
        userMessage.attachment,
        {
            useThinking: isThinkingMode,
            useSearch: isSearchMode
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
      setActiveKeyNum(getActiveKeyIndex());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64String = (ev.target?.result as string).split(',')[1];
            setAttachment({
                type: file.type.startsWith('image/') ? 'image' : 'file',
                mimeType: file.type,
                data: base64String,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/mp3' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    setAttachment({ type: 'audio', mimeType: 'audio/mp3', data: base64String, name: 'تسجيل صوتي' });
                };
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) { alert("لا يمكن الوصول للميكروفون"); }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 chat-container">
      <LiveVoiceModal isOpen={isLiveMode} onClose={() => setIsLiveMode(false)} grade={grade} subject={subject} />
      <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} onPlayVideo={(l, d) => { setCurrentLessonTitle(l); setCurrentVideoData(d); setIsVideoModalOpen(true); }} onExplain={(l) => { setIsLessonBrowserOpen(false); handleSend(`اشرح لي درس "${l}"`); }} />
      <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
      <input type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />

      <header className="bg-white border-b border-slate-200 px-3 py-3 md:px-6 md:py-4 flex justify-between items-center shadow-sm shrink-0 z-10 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-all shrink-0">
            <ChevronRight size={24} />
          </button>
          <div className="min-w-0">
             <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate leading-tight">{subject}</h1>
             <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] md:text-xs text-slate-500 font-bold">المعلم أونلاين (نشط 24/7)</span>
                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-indigo-100">Key {activeKeyNum}</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {onSubscribe && (
                <button onClick={onSubscribe} className="bg-amber-400 hover:bg-amber-500 text-amber-900 px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1 transition-all shadow-md animate-pulse">
                    <BadgePercent size={14} />
                    <span className="hidden sm:inline">اشترك الآن</span>
                </button>
            )}
            <button onClick={() => setIsLessonBrowserOpen(true)} className="p-2 text-slate-600 hover:text-red-600 rounded-full transition-all">
               <List size={22} />
            </button>
            <button onClick={() => window.print()} className="p-2 text-slate-600 hover:text-indigo-600 rounded-full transition-all">
               <Printer size={20} />
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id}>
             {msg.sender === Sender.USER && msg.attachment && (
                 <div className="flex justify-end mb-2 pop-in">
                     <div className="bg-indigo-600 p-2 rounded-2xl rounded-br-none max-w-[200px] border-2 border-indigo-400">
                         {msg.attachment.type === 'image' ? (
                             <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="attachment" className="rounded-xl w-full h-auto" />
                         ) : (
                             <div className="flex items-center gap-2 text-white p-2">
                                 {msg.attachment.type === 'audio' ? <Mic size={18} /> : <Paperclip size={18} />}
                                 <span className="text-xs truncate">{msg.attachment.name}</span>
                             </div>
                         )}
                     </div>
                 </div>
             )}
             <MessageBubble 
                message={msg} 
                subject={subject} 
                onQuote={(t) => { setInputValue(`اشرح لي: "${t}"`); inputRef.current?.focus(); }}
                onRetry={() => handleSend(msg.text)}
                onOpenLessons={() => setIsLessonBrowserOpen(true)}
             />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full pop-in">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
               <Cpu size={18} className="text-indigo-600 animate-spin" />
               <span className="text-xs text-indigo-500 font-bold">جاري المعالجة الذكية...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 bg-white border-t border-slate-200 shrink-0 input-area">
        {!isLoading && !attachment && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-print">
                {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => { if(s.promptPrefix === 'LESSON_BROWSER_TRIGGER') setIsLessonBrowserOpen(true); else setInputValue(s.promptPrefix); inputRef.current?.focus(); }} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-600 whitespace-nowrap hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                        {s.icon} {s.label}
                    </button>
                ))}
            </div>
        )}

        {attachment && (
            <div className="mb-3 p-2 bg-indigo-50 rounded-xl flex items-center justify-between border border-indigo-100">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm overflow-hidden">
                        {attachment.type === 'image' ? <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="w-full h-full object-cover" /> : <Paperclip size={20} />}
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 truncate max-w-[150px]">{attachment.name}</span>
                </div>
                <button onClick={() => setAttachment(null)} className="p-1.5 text-slate-400 hover:text-red-500"><X size={16} /></button>
            </div>
        )}

        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <div className="flex gap-1 pb-1">
             <button onClick={() => setIsLiveMode(true)} className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all hidden sm:flex"><AudioLines size={20} /></button>
             <button onClick={() => cameraInputRef.current?.click()} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-all"><Camera size={20} /></button>
             <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-all"><Paperclip size={20} /></button>
          </div>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="اكتب سؤالك التعليمي هنا..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-[50px] text-sm font-medium"
            disabled={isRecording}
          />
          <button onClick={handleRecordToggle} className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
            {isRecording ? <StopCircle size={24} /> : <Mic size={24} />}
          </button>
          <button
            onClick={() => handleSend()}
            disabled={(!inputValue.trim() && !attachment) || isLoading}
            className={`p-3 rounded-xl transition-all ${ (inputValue.trim() || attachment) && !isLoading ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed' }`}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
