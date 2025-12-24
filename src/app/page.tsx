
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Sparkles, Key, HelpCircle, Zap, 
  Image as ImageIcon, CheckCircle2, AlertCircle, 
  BrainCircuit, GraduationCap, Info, Lightbulb, Clock, ArrowRight, Share2, Copy, Users, TrendingUp, BarChart3
} from 'lucide-react';
import { MessageBubble } from '../components/MessageBubble';
import { questionsBank } from '../lib/questionsBank';
import { searchInStaticBank, generateStreamResponse } from '../services/geminiService';
import { DynamicQuestionBank, DynamicQuestion } from '../lib/dynamicBank';
import { GradeLevel, Subject, Sender, Message } from '../types';

interface ChatMessage extends Message {
  type?: 'cached' | 'dynamic' | 'ai' | 'guide';
  metadata?: {
    subject: string;
    difficulty?: string;
    readingTime?: string;
    timesAsked?: number;
    askedByCount?: number;
  };
}

export default function SmartTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'init',
      sender: Sender.BOT,
      timestamp: new Date(),
      text: "أهلاً بك يا بطل! أنا **المعلم الذكي**. جاهز لمساعدتك في فهم أي جزء من منهج الثانوية العامة. تفضل بسؤالك!" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // إحصائيات محسنة (محاكاة لبيانات الاستخدام الضخمة)
  const [stats, setStats] = useState({
    totalQuestions: 10450,
    studentsCount: 1250,
    coverage: '95%',
    popularCount: 156
  });

  const [popularQuestions, setPopularQuestions] = useState<DynamicQuestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined') {
        if ((window as any).aistudio) {
          const active = await (window as any).aistudio.hasSelectedApiKey();
          setHasApiKey(active);
        }
        
        // جلب البيانات الديناميكية الحقيقية
        const dStats = await DynamicQuestionBank.getStats();
        const popular = await DynamicQuestionBank.getPopular(8);
        
        setStats(prev => ({
          ...prev,
          totalQuestions: 10000 + dStats.totalQuestions,
          popularCount: dStats.popularCount
        }));
        setPopularQuestions(popular);
      }
    };
    init();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getStudentId = () => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = 'std_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('device_id', id);
    }
    return id;
  };

  const handleOpenKey = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { 
      id: Date.now().toString(),
      sender: Sender.USER, 
      text: textToSend, 
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // 1. استراتيجية البنك الثابت (مجاني وسريع)
    const staticResult = searchInStaticBank(textToSend);
    if (staticResult) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(),
          sender: Sender.BOT, 
          type: 'cached',
          text: staticResult.answer,
          timestamp: new Date(),
          metadata: {
            subject: staticResult.subject,
            difficulty: staticResult.difficulty === 'easy' ? 'سهل' : 'متوسط',
            readingTime: staticResult.readingTime
          }
        }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    // 2. استراتيجية البنك الديناميكي (إجابات سابقة)
    const dynamicResult = await DynamicQuestionBank.search(textToSend, 'الفيزياء'); 
    if (dynamicResult) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        sender: Sender.BOT, 
        type: 'dynamic',
        text: dynamicResult.answer,
        timestamp: new Date(),
        metadata: {
          subject: dynamicResult.subject,
          timesAsked: dynamicResult.timesAsked,
          askedByCount: dynamicResult.askedBy.length
        }
      }]);
      setIsLoading(false);
      return;
    }

    // 3. استراتيجية AI Pro (إذا لم يوجد في البنوك)
    const apiKey = process.env.API_KEY;
    if (!hasApiKey && !apiKey) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        sender: Sender.BOT, 
        type: 'guide',
        text: `🤔 **سؤالك فريد من نوعه!**\n\nلم يتم العثور على إجابة جاهزة لهذا السؤال في بنك المعرفة الخاص بنا.\n\n💡 **للحصول على شرح ذكي فوراً:**\n1. فعل مفتاح **Gemini API** الخاص بك (مجاني).\n2. سؤالك هذا سيتم حفظه تلقائياً ليفيد مئات الطلاب غيرك!\n\n🚀 *أنت تساهم الآن في بناء أكبر بنك أسئلة تعليمي في مصر.*`,
        timestamp: new Date()
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { 
        id: botMsgId, 
        sender: Sender.BOT, 
        text: '', 
        type: 'ai', 
        timestamp: new Date() 
      }]);

      // Fix: Removed the extra getStudentId() argument to correctly call generateStreamResponse with its 7 parameters.
      await generateStreamResponse(
        textToSend,
        GradeLevel.GRADE_12,
        Subject.PHYSICS,
        messages,
        (chunk) => {
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: chunk } : m));
        },
        undefined,
        undefined
      );
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: 'err', sender: Sender.BOT, text: "عذراً، حدث خطأ فني. تأكد من جودة الاتصال.", timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineExplain = (line: string) => {
    setInput(`اشرح أكثر: ${line.trim()}`);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans" dir="rtl">
      {/* Top Professional Header */}
      <header className="bg-edu-blue-800 text-white px-6 py-3 flex items-center justify-between shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
            <GraduationCap className="text-edu-green-400" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">المعلم الذكي 2026</h1>
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest flex items-center gap-1">
              <Zap size={10} className="fill-current text-yellow-400" /> نظام التوزيع الذكي الفوري
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 text-sm font-bold">
            <div className="flex items-center gap-2 text-indigo-100">
               <Users size={18} className="text-edu-green-400" />
               <span>{stats.studentsCount} طالب أونلاين</span>
            </div>
          </div>
          <button 
            onClick={handleOpenKey}
            className={`px-5 py-2 rounded-full flex items-center gap-2 transition-all font-black text-xs shadow-md ${
              hasApiKey ? 'bg-edu-green-600' : 'bg-amber-400 text-slate-900 hover:bg-amber-500 hover:scale-105'
            }`}
          >
            <Key size={14} />
            <span>{hasApiKey ? 'الذكاء الاصطناعي مفعل' : 'تفعيل الأسئلة المتقدمة'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Smart Knowledge Bank */}
        <aside className="hidden lg:flex w-96 bg-white border-l border-slate-200 flex-col shadow-xl z-10">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BrainCircuit className="text-edu-blue-600" size={24} />
              بنك المعرفة التفاعلي
            </h3>
            
            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
               <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">إجمالي الشروح</span>
                  <span className="text-xl font-black text-edu-blue-700">{stats.totalQuestions.toLocaleString()}</span>
               </div>
               <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">نسبة التغطية</span>
                  <span className="text-xl font-black text-edu-green-600">{stats.coverage}</span>
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {/* Trending Now */}
            <section className="space-y-3">
              <h4 className="text-[11px] font-black text-slate-400 px-2 flex items-center gap-2 uppercase tracking-widest">
                <TrendingUp size={14} className="text-amber-500" /> يطرحه زملائك الآن
              </h4>
              <div className="space-y-2">
                {popularQuestions.length > 0 ? (
                  popularQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q.question)}
                      className="w-full text-right p-4 rounded-2xl border border-amber-100 bg-amber-50/20 hover:bg-amber-50 transition-all flex flex-col gap-1 group shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users size={10} /> {q.timesAsked} طالب سأل هذا
                        </span>
                        <Zap size={10} className="text-amber-400 opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 leading-relaxed truncate">{q.question}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-300">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">جاري تحليل الأسئلة الأكثر طلباً...</p>
                  </div>
                )}
              </div>
            </section>

            {/* Static Core Questions */}
            <section className="space-y-3">
              <h4 className="text-[11px] font-black text-slate-400 px-2 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-edu-blue-500" /> شروح نموذجية (مجانية)
              </h4>
              <div className="space-y-2">
                {questionsBank.slice(0, 15).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q.question)}
                    disabled={isLoading}
                    className="w-full text-right p-4 rounded-2xl border border-transparent hover:border-edu-blue-200 hover:bg-edu-blue-50/50 text-slate-700 transition-all flex flex-col gap-1 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        q.subject === 'الفيزياء' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>{q.subject}</span>
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">فوري ⚡</span>
                    </div>
                    <span className="text-xs font-bold leading-relaxed">{q.question}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          
          <div className="p-4 bg-slate-900 text-center">
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">جميع الشروح محدثة لعام 2026</p>
          </div>
        </aside>

        {/* Chat Main Area */}
        <main className="flex-1 flex flex-col relative bg-white">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
            <div className="max-w-4xl mx-auto w-full space-y-8">
              {messages.map((m, idx) => (
                <div key={m.id}>
                   <MessageBubble 
                    message={m} 
                    onQuote={handleLineExplain} 
                  />
                  {m.metadata && (
                    <div className="flex flex-wrap items-center gap-4 mt-2 px-14 text-[11px] text-slate-400 font-bold animate-fade-in">
                       {m.metadata.subject && <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-slate-600">{m.metadata.subject}</span>}
                       {m.metadata.timesAsked && <span className="flex items-center gap-1 text-amber-600"><TrendingUp size={12} /> سُئل {m.metadata.timesAsked} مرة</span>}
                       {m.metadata.askedByCount && <span className="flex items-center gap-1 text-edu-blue-600"><Users size={12} /> أفاد {m.metadata.askedByCount} طالب</span>}
                       {m.metadata.readingTime && <span className="flex items-center gap-1"><Clock size={12} /> {m.metadata.readingTime} قراءة</span>}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start animate-pulse px-4">
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-edu-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-edu-blue-500 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2.5 h-2.5 bg-edu-blue-500 rounded-full animate-bounce delay-150"></div>
                    </div>
                    <span className="text-xs font-black text-slate-400">المعلم الذكي يجهز الشرح التفصيلي...</span>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Interaction Area */}
          <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.08)]">
            <div className="max-w-4xl mx-auto relative">
              
              {/* Contextual Suggestion Pills */}
              <div className="absolute -top-12 right-0 flex gap-2 overflow-x-auto scrollbar-hide w-full">
                <button className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 hover:border-edu-blue-500 hover:text-edu-blue-600 transition-all shadow-sm flex items-center gap-2 shrink-0">
                  <ImageIcon size={14} className="text-indigo-500" /> حل مسألة مصورة
                </button>
                <button className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 hover:border-edu-blue-500 hover:text-edu-blue-600 transition-all shadow-sm flex items-center gap-2 shrink-0">
                  <ArrowRight size={14} className="text-edu-green-500" /> نواتج التعلم
                </button>
                <button className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 hover:border-edu-blue-500 hover:text-edu-blue-600 transition-all shadow-sm flex items-center gap-2 shrink-0">
                  <Sparkles size={14} className="text-amber-500" /> توقعات الامتحان
                </button>
              </div>

              <div className="relative flex items-center gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e. shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="اسأل المعلم الذكي عن أي جزء في المنهج..."
                  rows={1}
                  className="flex-1 bg-slate-100/50 border-2 border-slate-200/50 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-edu-blue-100 focus:bg-white focus:border-edu-blue-500 resize-none h-[62px] text-sm md:text-base font-bold shadow-inner transition-all"
                />
                
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className={`p-4 rounded-2xl shadow-xl transition-all flex items-center justify-center ${
                    input.trim() 
                    ? 'bg-edu-blue-600 text-white hover:bg-edu-blue-700 hover:scale-105 active:scale-95' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Send size={24} />
                </button>
              </div>
              
              <div className="flex justify-center gap-6 mt-4 opacity-40 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                 <span className="flex items-center gap-1"><CheckCircle2 size={10} /> بنك أسئلة مجاني 100%</span>
                 <span className="flex items-center gap-1"><Zap size={10} /> استجابة فورية 0.1ث</span>
                 <span className="flex items-center gap-1"><GraduationCap size={10} /> منهج 2026 المعتمد</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
