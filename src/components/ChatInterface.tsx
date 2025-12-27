
import React, { useState, useRef, useEffect } from 'react';
import { GradeLevel, Subject, Message, Sender, Attachment, PerformanceMetrics } from '../types';
import { generateStreamResponse, evaluateStudentLevel } from '../services/geminiService';
import { MessageBubble } from './MessageBubble';
import { LiveVoiceModal } from './LiveVoiceModal';
import { LessonBrowser } from './LessonBrowser';
import { YouTubeModal } from './YouTubeModal';
import { PerformanceDashboard } from './PerformanceDashboard';
import { VideoResult } from '../data/videoData';
import { getApiKey } from '../utils/apiKeyManager';
import { Send, Sparkles, ChevronRight, HelpCircle, FileText, Lightbulb, Bot, List, Printer, Mic, Camera, Paperclip, X, Image as ImageIcon, AudioLines, StopCircle, BrainCircuit, Globe, Youtube, PlayCircle, BadgePercent, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';

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
  { label: 'أهم نقاط الامتحان', icon: <Sparkles size={18} />, promptPrefix: 'ما هي أهم نقاط الامتحان في: ', autoSend: false },
  { label: 'سؤال MCQ تفاعلي', icon: <HelpCircle size={18} />, promptPrefix: 'أريد سؤال MCQ تفاعلي عن: ', autoSend: false },
  { label: 'خريطة ذهنية', icon: <BrainCircuit size={18} />, promptPrefix: 'اعمل لي خريطة ذهنية لدرس: ', autoSend: false },
  { label: 'لخص في 5 نقاط', icon: <FileText size={18} />, promptPrefix: 'لخص لي في 5 نقاط فقط: ', autoSend: false },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, onBack, onSubscribe }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `أهلاً بك يا بطل في مادة **${subject}**! 🚀\n\nأنا جاهز لمساعدتك. يمكنك تصوير مسألة من الكتاب 📸، أو تسجيل سؤالك بصوتك 🎙️، أو الكتابة لي.\n\n💡 *نصيحة: يمكنك الضغط على أي سطر في إجابتي للسؤال عنه فوراً.*`,
      sender: Sender.BOT,
      timestamp: new Date(),
    },
  ]);
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const key = getApiKey();
    if (!key || key === "") {
        setApiKeyWarning(true);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, attachment]);

  const handleMeasureLevel = async () => {
    if (messages.length < 3) {
      alert("من فضلك تفاعل معي قليلاً أولاً (اسأل سؤالين على الأقل) لكي أتمكن من قياس مستواك بدقة.");
      return;
    }
    
    setIsEvaluating(true);
    try {
      const result = await evaluateStudentLevel(messages, subject);
      if (result) {
        setPerformanceMetrics(result);
        setIsDashboardOpen(true);
      } else {
        alert("عذراً، لم أتمكن من إتمام التحليل حالياً. حاول مرة أخرى لاحقاً.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
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
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
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
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("لا يمكن الوصول للميكروفون. تأكد من الصلاحيات.");
        }
    }
  };

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
            prev.map((msg) => msg.id === botMessageId ? { ...msg, text: chunkText } : msg)
          );
        },
        userMessage.attachment,
        { useThinking: isThinkingMode, useSearch: isSearchMode }
      );

      setMessages((prev) =>
        prev.map((msg) => msg.id === botMessageId ? { ...msg, isStreaming: false } : msg)
      );
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[0]) => {
    if (suggestion.promptPrefix === 'LESSON_BROWSER_TRIGGER') { setIsLessonBrowserOpen(true); return; }
    if (suggestion.autoSend) handleSend(suggestion.promptPrefix);
    else { setInputValue(suggestion.promptPrefix); inputRef.current?.focus(); }
  };

  const handleQuoteClick = (text: string) => {
      const cleanText = text.substring(0, 150) + (text.length > 150 ? "..." : "");
      setInputValue(`اشرح لي بالتفصيل: "${cleanText}"`);
      inputRef.current?.focus();
  };
  
  const handlePrint = () => window.print();

  const toggleThinking = () => {
      if (!isThinkingMode) { setIsThinkingMode(true); setIsSearchMode(false); } 
      else setIsThinkingMode(false);
  };

  const toggleSearch = () => {
      if (!isSearchMode) { setIsSearchMode(true); setIsThinkingMode(false); }
      else setIsSearchMode(false);
  };
  
  const handlePlayVideo = (lesson: string, data: VideoResult) => {
      setCurrentLessonTitle(lesson);
      setCurrentVideoData(data);
      setIsVideoModalOpen(true);
  };
  
  const handleExplainLesson = (lesson: string) => {
      setIsLessonBrowserOpen(false);
      handleSend(`اشرح لي درس "${lesson}" بالتفصيل وبالأمثلة.`);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 chat-container">
      <LiveVoiceModal isOpen={isLiveMode} onClose={() => setIsLiveMode(false)} grade={grade} subject={subject} />
      <LessonBrowser isOpen={isLessonBrowserOpen} onClose={() => setIsLessonBrowserOpen(false)} grade={grade} subject={subject} onPlayVideo={handlePlayVideo} onExplain={handleExplainLesson} />
      <YouTubeModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoData={currentVideoData} lessonTitle={currentLessonTitle} />
      
      {isDashboardOpen && performanceMetrics && (
        <PerformanceDashboard 
          subject={subject} 
          metrics={performanceMetrics} 
          onClose={() => setIsDashboardOpen(false)} 
        />
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
      <input type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />

      <header className="bg-white border-b border-slate-200 px-3 py-3 md:px-6 md:py-4 flex justify-between items-center shadow-sm shrink-0 z-10 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-all hover:scale-105 active:scale-95 shrink-0">
            <ChevronRight size={24} className="md:w-7 md:h-7" />
          </button>
          <div className="min-w-0">
             <h1 className="text-lg md:text-2xl font-bold text-slate-800 truncate leading-tight">{subject}</h1>
             <p className="text-xs md:text-sm text-slate-500 font-medium truncate">{grade}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <button 
              onClick={handleMeasureLevel} 
              disabled={isEvaluating}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-black text-xs md:text-sm transition-all shadow-sm ${
                isEvaluating ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
              }`}
            >
              {isEvaluating ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
              <span>{isEvaluating ? 'جاري التحليل...' : 'قياس مستواي'}</span>
            </button>
            {apiKeyWarning && (
                <div className="hidden lg:flex items-center gap-1.5 text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-bold">عقل الـ AI غير مفعل</span>
                </div>
            )}
            {onSubscribe && (
                <button onClick={onSubscribe} className="bg-amber-400 hover:bg-amber-500 text-amber-900 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm flex items-center gap-1 transition-all shadow-[0_0_15px_rgba(251,191,36,0.6)]">
                    <BadgePercent size={16} className="md:w-5 md:h-5" />
                    <span className="hidden sm:inline">اشترك الآن</span>
                </button>
            )}
            <button onClick={() => setIsLessonBrowserOpen(true)} className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
               <List size={22} className="md:w-6 md:h-6" />
            </button>
            <button onClick={handlePrint} className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
               <Printer size={20} className="md:w-6 md:h-6" />
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id}>
             {msg.sender === Sender.USER && msg.attachment && (
                 <div className="flex justify-end mb-2 pop-in">
                     <div className="bg-indigo-600 p-2 rounded-2xl rounded-br-none max-w-[200px] border-4 border-indigo-500">
                         {msg.attachment.type === 'image' ? (
                             <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="attachment" className="rounded-xl w-full h-auto" />
                         ) : msg.attachment.type === 'audio' ? (
                             <div className="flex items-center gap-2 text-white"><Mic size={18} /> <span className="text-sm">تسجيل صوتي</span></div>
                         ) : (
                             <div className="flex items-center gap-2 text-white"><Paperclip size={18} /> <span className="text-sm truncate">{msg.attachment.name}</span></div>
                         )}
                     </div>
                 </div>
             )}
             <MessageBubble message={msg} subject={subject} onQuote={handleQuoteClick} />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full pop-in">
            <div className="bg-white border border-slate-200 px-5 py-4 rounded-3xl rounded-tr-none shadow-sm flex items-center gap-3">
               <Bot size={20} className={`text-indigo-600 ${isThinkingMode ? 'animate-bounce' : 'animate-pulse'}`} />
               <div className="flex flex-col">
                  <div className="flex gap-1.5 mb-1">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></span>
                  </div>
                  <span className="text-xs text-indigo-500 font-bold">لحظات، أقوم بتحضير إجابتك...</span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isLoading && !attachment && (
        <div className="px-3 md:px-4 py-2 flex flex-wrap gap-2 justify-center shrink-0 no-print pop-in pb-3">
          {SUGGESTIONS.map((suggestion, index) => (
            <button key={index} onClick={() => handleSuggestionClick(suggestion)} className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 px-4 py-2 rounded-2xl text-xs md:text-base font-bold text-slate-700 transition-all shadow-sm">
              <span className="text-indigo-500">{suggestion.icon}</span> {suggestion.label}
            </button>
          ))}
        </div>
      )}

      {attachment && (
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between pop-in">
            <div className="flex items-center gap-4">
                {attachment.type === 'image' ? <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt="preview" className="h-14 w-14 object-cover rounded-xl border-2 border-indigo-200" /> : attachment.type === 'audio' ? <div className="h-14 w-14 bg-red-100 rounded-xl flex items-center justify-center text-red-500 border-2 border-red-200"><Mic size={24} /></div> : <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 border-2 border-blue-200"><FileText size={24} /></div>}
                <div className="text-sm text-slate-700 font-bold max-w-[200px] truncate">{attachment.name || 'مرفق'}</div>
            </div>
            <button onClick={() => setAttachment(null)} className="p-2 bg-white rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all hover:rotate-90"><X size={20} /></button>
        </div>
      )}

      <div className="p-3 md:p-4 bg-white border-t border-slate-200 shrink-0 input-area">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2">
          <div className="flex items-center gap-1.5 pb-2">
             <button onClick={() => setIsLiveMode(true)} className="p-2.5 md:p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm ring-1 ring-indigo-100 hidden sm:flex"><AudioLines size={22} /></button>
             <button onClick={toggleThinking} className={`p-2.5 md:p-3 rounded-full transition-all border ${isThinkingMode ? 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-100' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-indigo-100'}`}><BrainCircuit size={22} /></button>
             <button onClick={toggleSearch} className={`p-2.5 md:p-3 rounded-full transition-all border ${isSearchMode ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-indigo-100'}`}><Globe size={22} /></button>
             <button onClick={() => cameraInputRef.current?.click()} className="p-2.5 md:p-3 rounded-full bg-slate-100 text-slate-500 hover:bg-indigo-100 hidden sm:flex"><Camera size={22} /></button>
             <button onClick={() => fileInputRef.current?.click()} className="p-2.5 md:p-3 rounded-full bg-slate-100 text-slate-500 hover:bg-indigo-100"><Paperclip size={22} /></button>
          </div>
          <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={isRecording ? "جاري التسجيل..." : isThinkingMode ? "اكتب مسألة صعبة للتفكير بها..." : isSearchMode ? "ابحث عن معلومة حديثة..." : "اكتب سؤالك هنا..."} className={`flex-1 bg-slate-50 text-slate-900 border rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 resize-none h-[56px] md:h-[64px] text-base md:text-lg shadow-inner font-medium leading-normal transition-all ${isThinkingMode ? 'border-amber-300 focus:ring-amber-500' : isSearchMode ? 'border-emerald-300 focus:ring-emerald-500' : 'border-slate-300 focus:ring-indigo-500'}`} disabled={isRecording} />
          <button onClick={handleRecordToggle} className={`p-2.5 rounded-2xl transition-all h-[56px] md:h-[64px] w-[56px] md:w-[64px] flex items-center justify-center shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500'}`}>{isRecording ? <StopCircleIcon /> : <Mic size={24} />}</button>
          <button onClick={() => handleSend()} disabled={(!inputValue.trim() && !attachment) || isLoading || isRecording} className={`p-3 rounded-2xl flex items-center justify-center transition-all h-[56px] md:h-[64px] w-[56px] md:w-[64px] shrink-0 ${ (inputValue.trim() || attachment) && !isLoading && !isRecording ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed' }`}><Send size={24} /></button>
        </div>
      </div>
    </div>
  );
};

const StopCircleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>
);
