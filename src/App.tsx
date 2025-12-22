
import React, { useState, useEffect } from 'react';
import { GradeLevel, Subject } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminGenerator } from './components/AdminGenerator';
import { TutorialModal } from './components/TutorialModal';
import { GraduationCap, School, Printer, LockKeyhole, Clock, AlertTriangle, HelpCircle, BadgePercent, Sparkles } from 'lucide-react';
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
    const initKey = async () => {
      await ensureApiKey();
    };
    initKey();

    const checkHash = () => {
        setIsAdmin(window.location.hash === '#admin');
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    
    if (!localStorage.getItem('trial_start_date')) {
        localStorage.setItem('trial_start_date', new Date().toISOString());
    }

    const timer = setInterval(() => {
        let startStr = localStorage.getItem('trial_start_date');
        if (startStr) {
            const startDate = new Date(startStr);
            // العرض لمدة 48 ساعة فقط
            const endDate = new Date(startDate.getTime() + 48 * 60 * 60 * 1000); 
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff > 0) {
                setIsTrialActive(true);
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                // تنسيق وقت مختصر جداً
                const timeString = days > 0 
                    ? `${days}ي و ${hours}س` 
                    : `${hours}:${minutes}:${seconds}`;
                setTrialTimeLeft(timeString);
            } else {
                setIsTrialActive(false);
                setTrialTimeLeft("");
            }
        }
    }, 1000);

    return () => {
        window.removeEventListener('hashchange', checkHash);
        clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (grade) {
        const subscriptionKey = `subscription_expiry_${grade}`;
        const expiryStr = localStorage.getItem(subscriptionKey);
        if (expiryStr) {
            const expiryDate = new Date(expiryStr);
            if (new Date() < expiryDate) {
                setIsCurrentGradeSubscribed(true);
            } else {
                setIsCurrentGradeSubscribed(false);
            }
        } else {
            setIsCurrentGradeSubscribed(false);
        }
    } else {
        setIsCurrentGradeSubscribed(false); 
    }
  }, [grade, isManualSubscriptionOpen]);

  const handleGradeSelect = (selectedGrade: GradeLevel) => {
    setGrade(selectedGrade);
  };

  const handleSubjectSelect = (selectedSubject: Subject) => {
    setSubject(selectedSubject);
  };

  const handleReset = () => {
    setSubject(null);
  };

  const handleFullReset = () => {
    setSubject(null);
    setGrade(null);
  };
  
  const handlePrint = () => {
    window.print();
  };

  const toggleAdmin = () => {
    window.location.hash = '#admin';
  };

  if (isAdmin) {
    return <AdminGenerator />;
  }

  return (
    <>
      <SubscriptionModal 
        forceOpen={isManualSubscriptionOpen}
        onClose={() => setIsManualSubscriptionOpen(false)}
        currentGrade={grade}
      />
      
      <TutorialModal 
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
      
      {/* شريط الاشتراك المختصر (Compact Banner) */}
      {isTrialActive && !isCurrentGradeSubscribed && trialTimeLeft && (
          <div className="sticky top-0 z-[100] w-full no-print">
            <button 
              onClick={() => setIsManualSubscriptionOpen(true)}
              className="w-full bg-slate-900 text-white py-1.5 px-4 flex items-center justify-center gap-4 hover:bg-slate-800 transition-all border-b border-indigo-500/30"
            >
              <div className="flex items-center gap-1.5">
                <BadgePercent size={16} className="text-yellow-400" />
                <span className="text-xs md:text-sm font-black">🎁 خصم 20% لفترة محدودة! اشترك الآن</span>
              </div>
              
              <div className="h-4 w-px bg-white/20"></div>

              <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-400" />
                <span className="font-mono text-xs md:text-sm font-bold text-indigo-300">
                  ينتهي خلال: {trialTimeLeft}
                </span>
                <Sparkles size={12} className="text-yellow-400 animate-pulse" />
              </div>
            </button>
          </div>
      )}

      {grade && subject ? (
        <ChatInterface 
            grade={grade} 
            subject={subject} 
            onBack={handleReset} 
            onSubscribe={!isCurrentGradeSubscribed ? () => setIsManualSubscriptionOpen(true) : undefined}
        />
      ) : grade ? (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm gap-2">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer overflow-hidden min-w-0" onClick={handleFullReset}>
              <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg text-white shrink-0">
                <School size={24} className="md:w-7 md:h-7" />
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight truncate min-w-0">نظام الثانوية الذكي</h1>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => setIsTutorialOpen(true)}
                  className="text-slate-600 hover:text-indigo-600 hover:bg-slate-50 p-2 rounded-lg transition-colors flex items-center gap-1"
                  title="كيف أستخدم التطبيق؟"
                >
                   <HelpCircle size={20} />
                   <span className="text-xs font-bold hidden sm:inline">شرح الاستخدام</span>
                </button>
                <button 
                  onClick={handlePrint}
                  className="text-slate-600 hover:text-indigo-600 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                  title="حفظ PDF / طباعة"
                >
                  <Printer size={20} />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <button 
                  onClick={() => setGrade(null)}
                  className="text-sm md:text-base text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  تغيير الصف
                </button>
            </div>
          </header>

          <main className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col">
            <div className="text-center mb-8 mt-4">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3">اختر المادة الدراسية</h2>
              <p className="text-base md:text-lg text-slate-500 font-medium">أنت الآن في {grade}</p>
              {!isCurrentGradeSubscribed && (
                 <button onClick={() => setIsManualSubscriptionOpen(true)} className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full animate-bounce">
                    اضغط هنا للاشتراك في هذا الصف
                 </button>
              )}
            </div>
            
            <SubjectGrid grade={grade} onSelect={handleSubjectSelect} />
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4 relative">
          <button 
             onClick={() => setIsTutorialOpen(true)}
             className="absolute top-4 right-4 py-2 px-4 bg-white/80 backdrop-blur-sm text-slate-600 rounded-full shadow-sm hover:bg-white hover:text-indigo-600 transition-all z-20 flex items-center gap-2 font-bold text-sm"
          >
             <HelpCircle size={20} />
             <span>كيف أستخدم التطبيق؟</span>
          </button>

          <button 
             onClick={handlePrint}
             className="absolute top-4 left-4 p-3 bg-white/80 backdrop-blur-sm text-slate-600 rounded-full shadow-sm hover:bg-white hover:text-indigo-600 transition-all z-20"
          >
             <Printer size={20} />
          </button>

          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10">
            <div className="bg-indigo-600 p-10 text-center">
               <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm text-white">
                 <GraduationCap size={40} />
               </div>
               <h1 className="text-4xl font-black text-white mb-3">مُعلمي الذكي</h1>
               <p className="text-indigo-100 text-base font-medium">رفيقك الذكي للتفوق في الثانوية العامة</p>
            </div>

            <div className="p-8 space-y-5">
              <h2 className="text-center text-slate-800 font-bold text-xl mb-8">اختر الصف الدراسي للبدء</h2>
              
              <button
                onClick={() => handleGradeSelect(GradeLevel.GRADE_10)}
                className="w-full p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 bg-white hover:bg-indigo-50 flex items-center justify-between group transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">
                    1
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-xl text-slate-900 group-hover:text-indigo-700">الصف الأول الثانوي</h3>
                    <p className="text-sm text-slate-500 mt-1 font-medium">النظام الجديد 2026</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-slate-300 group-hover:bg-indigo-500"></div>
              </button>

              <button
                onClick={() => handleGradeSelect(GradeLevel.GRADE_11)}
                className="w-full p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 bg-white hover:bg-indigo-50 flex items-center justify-between group transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xl">
                    2
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-xl text-slate-900 group-hover:text-indigo-700">الصف الثاني الثانوي</h3>
                    <p className="text-sm text-slate-500 mt-1 font-medium">الشعبة العامة / علمي / أدبي</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-slate-300 group-hover:bg-indigo-500"></div>
              </button>

              <button
                onClick={() => handleGradeSelect(GradeLevel.GRADE_12)}
                className="w-full p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 bg-white hover:bg-indigo-50 flex items-center justify-between group transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xl">
                    3
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-xl text-slate-900 group-hover:text-indigo-700">الصف الثالث الثانوي</h3>
                    <p className="text-sm text-slate-500 mt-1 font-medium">علمي علوم / رياضة / أدبي</p>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-slate-300 group-hover:bg-indigo-500"></div>
              </button>
            </div>
            
            <div className="bg-amber-50 p-4 border-t border-amber-100 text-center">
               <div className="flex items-start justify-center gap-2 text-amber-800 text-xs leading-relaxed font-medium">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>
                    <strong>إخلاء مسؤولية:</strong> هذا التطبيق مساعد تعليمي ذكي لتبسيط المعلومات وزيادة الفهم. رغم دقة النماذج، نوصي دائماً بالرجوع للكتاب المدرسي والمصادر الرسمية للتحقق النهائي.
                  </p>
               </div>
            </div>

            <div className="bg-slate-50 p-5 text-center text-sm font-medium text-slate-400 border-t border-slate-100 flex justify-center items-center gap-2 relative">
              <span>مدعوم بتقنية Gemini 3 Flash للذكاء الاصطناعي</span>
              
              <button 
                onClick={toggleAdmin}
                className="opacity-50 hover:opacity-100 transition-opacity p-2 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
              >
                <LockKeyhole size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
