import React, { useState, useEffect } from 'react';
import { GradeLevel, Subject } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminGenerator } from './components/AdminGenerator';
import { TutorialModal } from './components/TutorialModal';
import { GraduationCap, School, Printer, LockKeyhole, Clock, AlertTriangle, HelpCircle, BadgePercent, Sparkles, ChevronLeft } from 'lucide-react';
import { ensureApiKey } from './utils/apiKeyManager';

const App: React.FC = () => {
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trialTimeLeft, setTrialTimeLeft] = useState<string>("");
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [isCurrentGradeSubscribed, setIsCurrentGradeSubscribed] = useState(false);
  const [isManualSubscriptionOpen, setIsManualSubscriptionOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    const initKey = async () => { await ensureApiKey(); };
    initKey();
    const checkHash = () => { setIsAdmin(window.location.hash === '#admin'); };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    
    if (!localStorage.getItem('trial_start_date')) {
        localStorage.setItem('trial_start_date', new Date().toISOString());
    }

    const timer = setInterval(() => {
        let startStr = localStorage.getItem('trial_start_date');
        if (startStr) {
            const startDate = new Date(startStr);
            const endDate = new Date(startDate.getTime() + 48 * 60 * 60 * 1000); 
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();
            if (diff > 0) {
                setIsTrialActive(true);
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTrialTimeLeft(`${h}:${m}:${s}`);
            } else {
                setIsTrialActive(false);
            }
        }
    }, 1000);

    return () => { window.removeEventListener('hashchange', checkHash); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (grade) {
        const expiryStr = localStorage.getItem(`subscription_expiry_${grade}`);
        if (expiryStr && new Date() < new Date(expiryStr)) {
            setIsCurrentGradeSubscribed(true);
        } else {
            setIsCurrentGradeSubscribed(false);
        }
    }
  }, [grade, isManualSubscriptionOpen]);

  if (isAdmin) return <AdminGenerator />;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SubscriptionModal forceOpen={isManualSubscriptionOpen} onClose={() => setIsManualSubscriptionOpen(false)} currentGrade={grade} />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      
      {/* Smart Notification Banner */}
      {isTrialActive && !isCurrentGradeSubscribed && (
        <div className="bg-gradient-to-l from-indigo-700 to-indigo-900 text-white py-2 px-4 shadow-lg z-50 overflow-hidden group">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 p-1 rounded-md animate-pulse">
                <BadgePercent size={18} className="text-indigo-900" />
              </div>
              <p className="text-xs md:text-sm font-bold">خصم 70% بمناسبة الإطلاق! اشترك الآن لجميع المواد بـ 90ج فقط.</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
              <Clock size={14} className="text-amber-400" />
              <span className="text-[10px] md:text-xs font-mono font-black">{trialTimeLeft}</span>
            </div>
          </div>
        </div>
      )}

      {grade && subject ? (
        <ChatInterface grade={grade} subject={subject} onBack={() => setSubject(null)} onSubscribe={() => setIsManualSubscriptionOpen(true)} />
      ) : (
        <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          {/* Header */}
          <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setGrade(null); setSubject(null); }}>
              <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform">
                <School className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900">المُعلم الذكي</h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Smart Tutor 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsTutorialOpen(true)} className="p-3 bg-white text-slate-600 rounded-2xl shadow-sm hover:shadow-md hover:text-indigo-600 transition-all">
                <HelpCircle size={22} />
              </button>
              <button onClick={() => window.print()} className="p-3 bg-white text-slate-600 rounded-2xl shadow-sm hover:shadow-md transition-all">
                <Printer size={22} />
              </button>
            </div>
          </header>

          <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col items-center justify-center z-10 animate-fade-in">
            {grade ? (
              <>
                <div className="text-center mb-10">
                  <button onClick={() => setGrade(null)} className="mb-4 inline-flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                    <ChevronLeft size={20} /> تراجع لاختيار الصف
                  </button>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">اختر المادة الدراسية</h2>
                  <p className="text-slate-500 font-medium">أنت الآن في {grade}</p>
                </div>
                <div className="w-full max-w-6xl">
                  <SubjectGrid grade={grade} onSelect={setSubject} />
                </div>
              </>
            ) : (
              <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 text-center md:text-right">
                  <div className="inline-block bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black tracking-wide mb-2">الجيل القادم من التعليم</div>
                  <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
                    رفيقك الذكي <br/> <span className="text-indigo-600 underline decoration-indigo-200">للتفوق النهائي</span>
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto md:mx-0">
                    أول نظام تعليمي في مصر مدعوم بتقنيات Gemini 2.5 لشرح المنهج بالصوت والصورة وفيديو اليوتيوب فوراً.
                  </p>
                  <div className="flex items-center gap-6 justify-center md:justify-start">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-slate-900">12K+</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">طالب نشط</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-slate-900">95%</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">دقة الشرح</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { level: GradeLevel.GRADE_10, title: 'الصف الأول الثانوي', desc: 'النظام الجديد 2026', color: 'indigo' },
                    { level: GradeLevel.GRADE_11, title: 'الصف الثاني الثانوي', desc: 'علمي / أدبي / عام', color: 'emerald' },
                    { level: GradeLevel.GRADE_12, title: 'الصف الثالث الثانوي', desc: 'شهادة الثانوية العامة', color: 'amber' }
                  ].map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setGrade(g.level)}
                      className="group relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all duration-300 flex items-center justify-between text-right overflow-hidden"
                    >
                      <div className={`absolute top-0 right-0 w-2 h-full bg-${g.color}-500 transition-all group-hover:w-3`}></div>
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl bg-${g.color}-50 text-${g.color}-600 flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform`}>
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600">{g.title}</h3>
                          <p className="text-sm text-slate-400 font-medium">{g.desc}</p>
                        </div>
                      </div>
                      <Sparkles size={20} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>

          <footer className="p-8 text-center border-t border-slate-100 bg-white/50 backdrop-blur-md">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-400">
                <AlertTriangle size={14} className="text-amber-500" />
                <span>إخلاء مسؤولية: يرجى دائماً التحقق من المصادر الرسمية لوزارة التربية والتعليم.</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
                <span>مدعوم بتقنية Gemini 3 Flash AI</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
            </div>
            <button onClick={() => window.location.hash = '#admin'} className="mt-4 opacity-10 hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-opacity">
              <LockKeyhole size={16} />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};

export default App;
