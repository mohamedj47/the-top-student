
import React, { useState, useEffect } from 'react';
import { GradeLevel, Subject } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminGenerator } from './components/AdminGenerator';
import { TutorialModal } from './components/TutorialModal';
import { GraduationCap, School, LockKeyhole, Clock, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { ensureApiKey } from './utils/apiKeyManager';
import { checkSubscriptionStatus } from './utils/subscriptionManager';

const App: React.FC = () => {
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  // تحسين: التحقق من الهاش مباشرة عند بداية التشغيل
  const [isAdmin, setIsAdmin] = useState(typeof window !== 'undefined' && window.location.hash === '#admin');
  const [isManualSubscriptionOpen, setIsManualSubscriptionOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState({ isSubscribed: false, daysLeft: 0 });

  useEffect(() => {
    ensureApiKey();
    
    // مستمع دقيق لتغيرات الهاش لضمان الدخول للوحة الإدارة في أي وقت
    const handleHashChange = () => {
      setIsAdmin(window.location.hash === '#admin');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // تحديث حالة الاشتراك عند اختيار صف أو عند نجاح التفعيل
  useEffect(() => {
    if (grade) {
      setSubscriptionInfo(checkSubscriptionStatus(grade));
    }
  }, [grade, isManualSubscriptionOpen]);

  const handleGradeSelect = (selectedGrade: GradeLevel) => {
    setGrade(selectedGrade);
  };

  const handleSubjectSelect = (selectedSubject: Subject) => {
    if (!subscriptionInfo.isSubscribed) {
      setIsManualSubscriptionOpen(true);
      return;
    }
    setSubject(selectedSubject);
  };

  // أولوية العرض للوحة الإدارة إذا كان الهاش موجوداً
  if (isAdmin) return <AdminGenerator />;

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

      {/* تنبيه حالة الاشتراك */}
      {grade && !subscriptionInfo.isSubscribed && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white p-2 text-center text-xs font-black animate-pulse flex items-center justify-center gap-3">
          <AlertTriangle size={14} />
          <span>هذا الصف غير مفعّل. اشترك الآن للوصول لجميع المواد والشروحات.</span>
          <button onClick={() => setIsManualSubscriptionOpen(true)} className="bg-white text-red-600 px-3 py-1 rounded-full text-[10px] hover:bg-slate-100">اشترك الآن</button>
        </div>
      )}

      {grade && subscriptionInfo.isSubscribed && subscriptionInfo.daysLeft <= 3 && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-amber-500 text-white p-2 text-center text-xs font-black flex items-center justify-center gap-3">
          <Clock size={14} />
          <span>تنبيه: متبقي {subscriptionInfo.daysLeft} أيام على انتهاء اشتراكك.</span>
        </div>
      )}

      {grade && subject ? (
        <ChatInterface 
            grade={grade} 
            subject={subject} 
            onBack={() => setSubject(null)} 
            onSubscribe={!subscriptionInfo.isSubscribed ? () => setIsManualSubscriptionOpen(true) : undefined}
        />
      ) : grade ? (
        <div className={`min-h-screen bg-slate-50 flex flex-col ${!subscriptionInfo.isSubscribed ? 'pt-10' : ''}`}>
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setGrade(null)}>
              <div className="bg-indigo-600 p-2 rounded-xl text-white">
                <School size={24} />
              </div>
              <h1 className="text-xl font-black text-slate-900">نظام الثانوية الذكي</h1>
            </div>
            
            <div className="flex items-center gap-3">
                <button onClick={() => setGrade(null)} className="text-sm text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">تغيير الصف</button>
            </div>
          </header>

          <main className="flex-1 max-w-5xl mx-auto w-full p-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-800 mb-2">اختر المادة الدراسية</h2>
              <p className="text-slate-500 font-bold">أنت الآن في {grade}</p>
              
              {subscriptionInfo.isSubscribed && (
                <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100 text-xs font-black">
                   <CheckCircle size={14} />
                   <span>الاشتراك مفعل (متبقي {subscriptionInfo.daysLeft} يوم)</span>
                </div>
              )}
            </div>
            
            <div className={!subscriptionInfo.isSubscribed ? 'opacity-50 grayscale pointer-events-none' : ''}>
              <SubjectGrid grade={grade} onSelect={handleSubjectSelect} />
            </div>

            {!subscriptionInfo.isSubscribed && (
               <div className="mt-8 bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl text-center max-w-lg mx-auto">
                  <Lock size={48} className="mx-auto text-indigo-600 mb-4" />
                  <h3 className="text-xl font-black text-slate-800 mb-2">المحتوى مقفل</h3>
                  <p className="text-slate-500 text-sm font-medium mb-6">يرجى تفعيل اشتراك هذا الصف لتتمكن من الوصول للمواد والبدء في المذاكرة مع المعلم الذكي.</p>
                  <button 
                    onClick={() => setIsManualSubscriptionOpen(true)}
                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"
                  >
                    تفعيل الصف الآن
                  </button>
               </div>
            )}
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white">
            <div className="bg-indigo-600 p-12 text-center text-white relative">
               <GraduationCap size={60} className="mx-auto mb-6 opacity-20 absolute top-4 left-4" />
               <div className="bg-white/20 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                 <GraduationCap size={48} />
               </div>
               <h1 className="text-4xl font-black mb-2">مُعلمي الذكي</h1>
               <p className="text-indigo-100 font-bold">رفيقك الذكي للتفوق في الثانوية</p>
            </div>

            <div className="p-10 space-y-4">
              <h2 className="text-center text-slate-800 font-black text-xl mb-6">اختر صفك الدراسي</h2>
              
              {[GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12].map((g, idx) => (
                <button
                  key={g}
                  onClick={() => handleGradeSelect(g)}
                  className="w-full p-6 rounded-3xl border-2 border-slate-100 hover:border-indigo-600 bg-white hover:bg-indigo-50 flex items-center justify-between group transition-all duration-300"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${idx === 0 ? 'bg-indigo-100 text-indigo-600' : idx === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {idx + 1}
                    </div>
                    <div className="text-right">
                      <h3 className="font-black text-lg text-slate-900">{g}</h3>
                      <p className="text-xs text-slate-500 font-bold">اضغط للاختيار والتفعيل</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
               <button onClick={() => window.location.hash = '#admin'} className="text-slate-300 hover:text-indigo-400 p-2 transition-colors">
                 <LockKeyhole size={18} />
               </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
