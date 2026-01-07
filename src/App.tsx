
import React, { useState, useEffect, useCallback } from 'react';
import { GradeLevel, Subject, StudyLanguage } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { School, GraduationCap, Globe, Zap, ShieldCheck, Timer, Sparkles, Youtube } from 'lucide-react';
import { ensureApiKey } from './utils/apiKeyManager';

const App: React.FC = () => {
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [trialTimeLeft, setTrialTimeLeft] = useState<string>("48:00:00");

  useEffect(() => {
    ensureApiKey();
    const expiry = localStorage.getItem(`subscription_expiry_${grade}`);
    if (expiry && new Date(expiry) > new Date()) setIsSubscribed(true);
    
    // Trial timer logic
    const timer = setInterval(() => {
        let startStr = localStorage.getItem('trial_start_date');
        if (!startStr) {
            startStr = new Date().toISOString();
            localStorage.setItem('trial_start_date', startStr);
        }
        const startDate = new Date(startStr);
        const endDate = new Date(startDate.getTime() + 48 * 60 * 60 * 1000); 
        const diff = endDate.getTime() - new Date().getTime();
        
        if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTrialTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
            setTrialTimeLeft("00:00:00");
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [grade]);

  if (grade && subject) {
    return <ChatInterface grade={grade} subject={subject} onBack={() => setSubject(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans overflow-x-hidden" dir="rtl">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center p-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-200">
            <School size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">المعلم الذكي</h1>
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Smart Tutor v4.0</p>
          </div>
        </div>
        
        {grade && (
          <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border ${isSubscribed ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
            <Timer size={18} />
            <span className="text-xs font-black">{isSubscribed ? 'مفعل' : trialTimeLeft}</span>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!grade ? (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="lg:w-1/2 text-right">
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-6">
                رفيقك الذكي <br/>
                <span className="text-indigo-600">للتفوق النهائي</span>
              </h2>
              <p className="text-lg text-slate-500 font-bold leading-relaxed mb-10 max-w-xl">
                نظام تعليمي خارق يعمل بـ 11 محرك ذكاء اصطناعي. صممناه لطلاب الثانوية في مصر ليعمل بكفاءة مع وبدون إنترنت في كل الظروف.
              </p>
              <div className="flex gap-8 items-center">
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <span className="block text-2xl font-black text-slate-800">+10k</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">طالب نشط</span>
                 </div>
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <span className="block text-2xl font-black text-slate-800">11</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">محرك ذكاء</span>
                 </div>
              </div>
            </div>

            <div className="lg:w-1/3 w-full space-y-4">
              {[GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12].map((g, idx) => (
                <button key={g} onClick={() => setGrade(g)} className="w-full bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-600 shadow-sm hover:shadow-xl transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl transition-all">{idx + 1}</div>
                    <span className="text-xl font-black text-slate-800">{g}</span>
                  </div>
                  <Sparkles size={20} className="text-slate-200 group-hover:text-indigo-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
             <div className="text-center mb-12">
                <h3 className="text-4xl font-black text-slate-900 mb-2">اختر المادة الدراسية</h3>
                <p className="text-slate-500 font-bold flex items-center justify-center gap-2">
                   أنت الآن في {grade} <button onClick={() => setGrade(null)} className="text-indigo-600 underline">تغيير الصف</button>
                </p>
             </div>
             <SubjectGrid grade={grade} onSelect={setSubject} />
          </div>
        )}
      </main>

      {!isSubscribed && grade && (
          <SubscriptionModal currentGrade={grade} />
      )}
    </div>
  );
};

export default App;
