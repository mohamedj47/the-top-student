
import React, { useState, useEffect, useCallback } from 'react';
import { GradeLevel, Subject, StudyLanguage } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminGenerator } from './components/AdminGenerator';
import { TutorialModal } from './components/TutorialModal';
// Added Youtube to the lucide-react imports
import { School, LockKeyhole, Clock, AlertTriangle, HelpCircle, BadgePercent, Sparkles, Zap, Settings, ShieldCheck, Timer, Globe, PlayCircle, Youtube } from 'lucide-react';
import { ensureApiKey } from './utils/apiKeyManager';

const App: React.FC = () => {
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(StudyLanguage.ARABIC);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trialTimeLeft, setTrialTimeLeft] = useState<string>("48:00:00");
  const [subscriptionTimeLeft, setSubscriptionTimeLeft] = useState<{days: number, hours: string, label: string} | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isManualSubscriptionOpen, setIsManualSubscriptionOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // دالة فحص الاشتراك للصف المختار حصراً
  const checkCurrentGradeSubscription = useCallback((currentGrade: GradeLevel | null) => {
    if (!currentGrade) {
      setIsSubscribed(false);
      setSubscriptionTimeLeft(null);
      return false;
    }

    const expiry = localStorage.getItem(`subscription_expiry_${currentGrade}`);
    if (expiry) {
      const diff = new Date(expiry).getTime() - new Date().getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setIsSubscribed(true);
        setSubscriptionTimeLeft({
          days,
          hours: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          label: currentGrade
        });
        return true;
      }
    }

    setIsSubscribed(false);
    setSubscriptionTimeLeft(null);
    return false;
  }, []);

  useEffect(() => {
    const init = async () => {
      await ensureApiKey();
      checkCurrentGradeSubscription(grade);
      const savedLang = localStorage.getItem('study_language') as StudyLanguage;
      if (savedLang) setStudyLanguage(savedLang);
    };
    init();

    const checkHash = () => {
        const hash = window.location.hash;
        setIsAdmin(hash === '#admin' || hash.includes('admin'));
    };
    
    checkHash();
    window.addEventListener('hashchange', checkHash);
    
    if (!localStorage.getItem('trial_start_date')) {
        localStorage.setItem('trial_start_date', new Date().toISOString());
    }

    const timer = setInterval(() => {
        const hasSub = checkCurrentGradeSubscription(grade);
        if (!hasSub) {
            let startStr = localStorage.getItem('trial_start_date');
            if (startStr) {
                const startDate = new Date(startStr);
                const endDate = new Date(startDate.getTime() + 48 * 60 * 60 * 1000); 
                const now = new Date();
                const diff = endDate.getTime() - now.getTime();
                if (diff > 0) {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTrialTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                } else {
                    setTrialTimeLeft("00:00:00");
                }
            }
        }
    }, 1000);

    return () => {
        window.removeEventListener('hashchange', checkHash);
        clearInterval(timer);
    };
  }, [grade, checkCurrentGradeSubscription]);

  const changeLanguage = (lang: StudyLanguage) => {
    setStudyLanguage(lang);
    localStorage.setItem('study_language', lang);
  };

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
  
  const toggleAdmin = () => {
    window.location.hash = '#admin';
    setIsAdmin(true);
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
      
      {grade && (
        <div className={`w-full text-white py-2.5 px-4 no-print flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl z-[100] transition-all duration-700 ${isSubscribed ? 'bg-emerald-600 border-b-2 border-emerald-400' : 'bg-indigo-700'}`}>
          {isSubscribed ? (
              <>
                  <div className="flex items-center gap-3">
                      <div className="bg-white/20 px-4 py-1.5 rounded-2xl flex items-center gap-2 border border-white/30 backdrop-blur-sm">
                          <ShieldCheck size={18} className="text-white fill-current" />
                          <span className="text-sm font-black tracking-tight">نظام مفعل: {subscriptionTimeLeft?.label}</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-5">
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-2xl border border-white/10">
                          <Timer size={20} className="text-emerald-200" />
                          <span className="text-xs font-bold text-emerald-100">متبقي لصفك الحالي:</span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono text-xl font-black">{subscriptionTimeLeft?.days}</span>
                            <span className="text-[10px] font-bold">يوم و</span>
                            <span className="font-mono text-xl font-black">{subscriptionTimeLeft?.hours}</span>
                          </div>
                      </div>
                  </div>
              </>
          ) : (
              <>
                  <div className="flex items-center gap-2">
                     <div className="bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/20">
                        <Clock size={16} className="text-yellow-300" />
                        <span className="font-mono font-black text-sm">{trialTimeLeft}</span>
                     </div>
                     <span className="text-[10px] font-bold text-indigo-100">تنتهي فترة التجربة</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-center">
                    <BadgePercent size={20} className="text-yellow-400 shrink-0 animate-bounce" />
                    <span>فعل جميع مواد {grade} بـ 90ج فقط!</span>
                  </div>
                  <button 
                    onClick={() => setIsManualSubscriptionOpen(true)}
                    className="bg-yellow-400 hover:bg-white text-slate-900 px-6 py-1.5 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 border-b-4 border-yellow-600"
                  >
                    تفعيل {grade} 🚀
                  </button>
              </>
          )}
        </div>
      )}

      {grade && subject ? (
        <ChatInterface 
            grade={grade} 
            subject={subject} 
            studyLanguage={studyLanguage}
            onBack={handleReset} 
            onSubscribe={!isSubscribed ? () => setIsManualSubscriptionOpen(true) : undefined}
        />
      ) : grade ? (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm gap-2">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={handleFullReset}>
              <div className="bg-[#4834d4] p-2 rounded-lg text-white">
                <School size={24} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">نظام الثانوية الذكي</h1>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsTutorialOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs border border-red-100 hover:bg-red-100 transition-all"
                >
                  <PlayCircle size={18} />
                  <span>دليل الاستخدام</span>
                </button>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                   <button onClick={() => changeLanguage(StudyLanguage.ARABIC)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${studyLanguage === StudyLanguage.ARABIC ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>عربي</button>
                   <button onClick={() => changeLanguage(StudyLanguage.ENGLISH)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${studyLanguage === StudyLanguage.ENGLISH ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>EN</button>
                   <button onClick={() => changeLanguage(StudyLanguage.FRENCH)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${studyLanguage === StudyLanguage.FRENCH ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>FR</button>
                   <button onClick={() => changeLanguage(StudyLanguage.GERMAN)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${studyLanguage === StudyLanguage.GERMAN ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>DE</button>
                </div>
                
                <button onClick={() => setGrade(null)} className="text-sm text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg">
                  تغيير الصف
                </button>
            </div>
          </header>

          <main className="flex-1 max-w-6xl mx-auto w-full p-4 flex flex-col">
            <div className="text-center mb-8 mt-6">
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">اختر المادة الدراسية</h2>
              <div className="flex items-center justify-center gap-2">
                 <p className="text-lg text-slate-500 font-bold">أنت الآن في {grade}</p>
                 <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                 <p className="text-sm text-indigo-600 font-black flex items-center gap-1"><Globe size={14} /> لغة الدراسة: {studyLanguage.toUpperCase()}</p>
              </div>
            </div>
            <SubjectGrid grade={grade} onSelect={handleSubjectSelect} />
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-x-hidden" dir="rtl">
          <header className="w-full max-w-7xl mx-auto flex justify-between items-center p-6 md:px-12">
            <div className="flex items-center gap-3">
              <div className="bg-[#4834d4] p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <School size={28} />
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black text-[#1e293b]">المُعلم الذكي</h1>
                <p className="text-[10px] font-black text-slate-400 tracking-[0.2em]">SMART TUTOR 2026</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsTutorialOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm group"
            >
              <Youtube size={20} className="text-red-600 group-hover:scale-110 transition-transform" />
              <span>فيديو الشرح</span>
            </button>
          </header>

          <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between px-6 py-8 lg:py-12 gap-12">
            <div className="lg:w-1/2 flex flex-col items-start text-right">
              <h2 className="text-5xl md:text-7xl font-black text-[#1e293b] leading-[1.1] mb-6">
                رفيقك الذكي<br/>
                <span className="text-[#4834d4]">للتفوق النهائي</span>
              </h2>
              <p className="text-lg text-slate-500 font-bold leading-relaxed max-w-xl mb-10">
                أول نظام تعليمي في مصر يدعم طلاب "اللغات" لشرح المنهج بالإنجليزية والفرنسية والألمانية فوراً.
              </p>
              <div className="flex items-center gap-12">
                <div className="text-right">
                  <div className="text-3xl font-black text-[#1e293b]">98%</div>
                  <div className="text-xs font-bold text-slate-400">دقة الترجمة</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-[#1e293b]">All Langs</div>
                  <div className="text-xs font-bold text-slate-400">دعم كامل للمدارس</div>
                </div>
              </div>
            </div>

            <div className="lg:w-[45%] w-full flex flex-col gap-4">
              <button onClick={() => handleGradeSelect(GradeLevel.GRADE_10)} className="group bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-500 shadow-sm transition-all flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl">1</div>
                  <h3 className="text-xl font-black text-[#1e293b]">الصف الأول الثانوي</h3>
                </div>
                <Sparkles size={24} className="text-slate-200 group-hover:text-indigo-300" />
              </button>
              <button onClick={() => handleGradeSelect(GradeLevel.GRADE_11)} className="group bg-white p-6 rounded-3xl border-2 border-transparent hover:border-emerald-500 shadow-sm transition-all flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl">2</div>
                  <h3 className="text-xl font-black text-[#1e293b]">الصف الثاني الثانوي</h3>
                </div>
                <Sparkles size={24} className="text-slate-200 group-hover:text-emerald-300" />
              </button>
              <button onClick={() => handleGradeSelect(GradeLevel.GRADE_12)} className="group bg-white p-6 rounded-3xl border-2 border-transparent hover:border-amber-500 shadow-sm transition-all flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-2xl">3</div>
                  <h3 className="text-xl font-black text-[#1e293b]">الصف الثالث الثانوي</h3>
                </div>
                <Sparkles size={24} className="text-slate-200 group-hover:text-amber-300" />
              </button>
            </div>
          </main>
console.log('URL =', import.meta.env.VITE_SUPABASE_URL);
console.log('KEY =', import.meta.env.VITE_SUPABASE_ANON_KEY);

          
          <footer className="w-full max-w-7xl mx-auto p-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex gap-4">
                <button onClick={toggleAdmin} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm">دخول الإدارة</button>
                <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-2xl text-xs font-bold border border-emerald-100">متاح الآن: مدارس اللغات 🇺🇸 🇫🇷 🇩🇪</div>
             </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default App;
