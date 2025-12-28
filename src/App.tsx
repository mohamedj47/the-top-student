
import React, { useState, useEffect } from 'react';
import { GradeLevel, Subject } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminGenerator } from './components/AdminGenerator';
import { TutorialModal } from './components/TutorialModal';
import { School, Printer, LockKeyhole, Clock, AlertTriangle, HelpCircle, BadgePercent, Sparkles, ChevronLeft, GraduationCap, Zap } from 'lucide-react';
import { ensureApiKey } from './utils/apiKeyManager';

const App: React.FC = () => {
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trialTimeLeft, setTrialTimeLeft] = useState<string>("25:38:55");
  const [isTrialActive, setIsTrialActive] = useState(true);
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
            const endDate = new Date(startDate.getTime() + 48 * 60 * 60 * 1000); 
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTrialTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
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
            setIsCurrentGradeSubscribed(new Date() < expiryDate);
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
      
      {/* Top Discount Banner - Fixed at the top */}
      <div className="w-full bg-[#4834d4] text-white py-2 px-4 no-print flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md z-[100]">
        <div className="flex items-center gap-2">
           <div className="bg-white/10 px-3 py-1 rounded-md flex items-center gap-1.5 border border-white/20">
              <Clock size={16} className="text-yellow-300" />
              <span className="font-mono font-black text-sm">{trialTimeLeft}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-center">
          <BadgePercent size={20} className="text-yellow-400 shrink-0" />
          <span>خصم 70% بمناسبة الإطلاق! اشترك الآن لجميع المواد بـ 90ج فقط.</span>
        </div>

        <button 
          onClick={() => setIsManualSubscriptionOpen(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-4 py-1 rounded-full text-xs font-black transition-all transform hover:scale-105"
        >
          اشترك الآن
        </button>
      </div>

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
              <div className="bg-[#4834d4] p-1.5 md:p-2 rounded-lg text-white shrink-0">
                <School size={24} className="md:w-7 md:h-7" />
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight truncate min-w-0">نظام الثانوية الذكي</h1>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setIsTutorialOpen(true)} className="text-slate-600 hover:text-indigo-600 p-2 rounded-lg flex items-center gap-1">
                   <HelpCircle size={20} />
                   <span className="text-xs font-bold hidden sm:inline">شرح الاستخدام</span>
                </button>
                <button onClick={handlePrint} className="text-slate-600 hover:text-indigo-600 p-2 rounded-lg">
                  <Printer size={20} />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <button onClick={() => setGrade(null)} className="text-sm md:text-base text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg">
                  تغيير الصف
                </button>
            </div>
          </header>

          <main className="flex-1 max-w-6xl mx-auto w-full p-4 flex flex-col">
            <div className="text-center mb-8 mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">اختر المادة الدراسية</h2>
              <p className="text-lg text-slate-500 font-bold">أنت الآن في {grade}</p>
              {!isCurrentGradeSubscribed && (
                 <button onClick={() => setIsManualSubscriptionOpen(true)} className="mt-4 text-xs font-black text-amber-700 bg-amber-100 border border-amber-200 px-6 py-2 rounded-full hover:bg-amber-200 transition-all">
                    تفعيل الاشتراك لهذا الصف الدراسي
                 </button>
              )}
            </div>
            <SubjectGrid grade={grade} onSelect={handleSubjectSelect} />
          </main>
        </div>
      ) : (
        /* New Landing Page Design matching the Reference Image */
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-x-hidden" dir="rtl">
          
          {/* Landing Header */}
          <header className="w-full max-w-7xl mx-auto flex justify-between items-center p-6 md:px-12">
            <div className="flex items-center gap-3">
              <div className="bg-[#4834d4] p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <School size={28} />
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black text-[#1e293b] leading-tight tracking-tight">المُعلم الذكي</h1>
                <p className="text-[10px] font-black text-slate-400 tracking-[0.2em]">SMART TUTOR 2026</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="p-3 bg-white text-slate-400 rounded-2xl shadow-sm border border-slate-100 hover:text-indigo-600 transition-all">
                <Printer size={22} />
              </button>
              <button onClick={() => setIsTutorialOpen(true)} className="p-3 bg-white text-slate-400 rounded-2xl shadow-sm border border-slate-100 hover:text-indigo-600 transition-all">
                <HelpCircle size={22} />
              </button>
            </div>
          </header>

          {/* Hero Section Container */}
          <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between px-6 py-8 lg:py-12 gap-12">
            
            {/* Right Side: Hero Text & Stats */}
            <div className="lg:w-1/2 flex flex-col items-start text-right animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-[#4834d4] px-4 py-1.5 rounded-full text-xs font-black mb-6 border border-indigo-100">
                <Sparkles size={14} />
                <span>الجيل القادم من التعليم</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-black text-[#1e293b] leading-[1.1] mb-6">
                رفيقك الذكي<br/>
                <span className="text-[#4834d4] relative">
                  للتفوق النهائي
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-indigo-100/50 rounded-full"></span>
                </span>
              </h2>
              
              <p className="text-lg md:text-xl text-slate-500 font-bold leading-relaxed max-w-xl mb-10">
                أول نظام تعليمي في مصر مدعوم بتقنيات Gemini 2.5 لشرح المنهج بالصوت والصورة وفيديو اليوتيوب فوراً.
              </p>
              
              <div className="flex items-center gap-12">
                <div className="text-right">
                  <div className="text-3xl font-black text-[#1e293b]">95%</div>
                  <div className="text-xs font-bold text-slate-400">دقة الشرح</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-[#1e293b]">+12K</div>
                  <div className="text-xs font-bold text-slate-400">طالب نشط</div>
                </div>
              </div>
            </div>

            {/* Left Side: Grade Selection Cards */}
            <div className="lg:w-[45%] w-full flex flex-col gap-4 animate-in fade-in slide-in-from-left-8 duration-700">
              
              {/* Grade 1 */}
              <button 
                onClick={() => handleGradeSelect(GradeLevel.GRADE_10)}
                className="group w-full bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-500 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    1
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-black text-[#1e293b] group-hover:text-indigo-700 transition-colors">الصف الأول الثانوي</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">النظام الجديد 2026</p>
                  </div>
                </div>
                <div className="p-2 text-slate-200 group-hover:text-indigo-300 transition-colors">
                  <Sparkles size={24} />
                </div>
              </button>

              {/* Grade 2 */}
              <button 
                onClick={() => handleGradeSelect(GradeLevel.GRADE_11)}
                className="group w-full bg-white p-6 rounded-3xl border-2 border-transparent hover:border-emerald-500 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    2
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-black text-[#1e293b] group-hover:text-emerald-700 transition-colors">الصف الثاني الثانوي</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">علمي / أدبي / عام</p>
                  </div>
                </div>
                <div className="p-2 text-slate-200 group-hover:text-emerald-300 transition-colors">
                  <Sparkles size={24} />
                </div>
              </button>

              {/* Grade 3 */}
              <button 
                onClick={() => handleGradeSelect(GradeLevel.GRADE_12)}
                className="group w-full bg-white p-6 rounded-3xl border-2 border-transparent hover:border-amber-500 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    3
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-black text-[#1e293b] group-hover:text-amber-700 transition-colors">الصف الثالث الثانوي</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">شهادة الثانوية العامة</p>
                  </div>
                </div>
                <div className="p-2 text-slate-200 group-hover:text-amber-300 transition-colors">
                  <Sparkles size={24} />
                </div>
              </button>
            </div>
          </main>

          {/* Footer Area */}
          <footer className="w-full max-w-7xl mx-auto p-6 md:px-12 mt-auto border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
               <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
               <span className="text-[10px] font-black text-indigo-600">مدعوم بتقنية Gemini 3 Flash AI</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold text-center max-w-md">
              <AlertTriangle size={14} className="shrink-0" />
              <p>إخلاء مسؤولية: يرجى دائماً التحقق من المصادر الرسمية لوزارة التربية والتعليم.</p>
            </div>

            <button onClick={toggleAdmin} className="opacity-30 hover:opacity-100 p-2 text-slate-400">
              <LockKeyhole size={16} />
            </button>
          </footer>
        </div>
      )}
    </>
  );
};

export default App;
