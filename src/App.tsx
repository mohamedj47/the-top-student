
import React, { useState, useEffect } from 'react';
import { GradeLevel, Subject } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminGenerator } from './components/AdminGenerator';
import { TutorialModal } from './components/TutorialModal';
import { GraduationCap, School, Lock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { ensureApiKey } from './utils/apiKeyManager';
import { checkSubscriptionStatus } from './utils/subscriptionManager';

const ADMIN_PASSWORD_REQUIRED = "202625";

const App: React.FC = () => {
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  
  // نظام الإدارة السري
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(sessionStorage.getItem('is_admin_auth') === 'true');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminError, setAdminError] = useState(false);
  
  const [isManualSubscriptionOpen, setIsManualSubscriptionOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState({ isSubscribed: false, daysLeft: 0 });

  useEffect(() => {
    ensureApiKey();
    // التحقق من الرابط فوراً عند التحميل
    if (window.location.hash.includes('admin')) {
      setShowAdminLogin(true);
    }
  }, []);

  useEffect(() => {
    if (grade) {
      setSubscriptionInfo(checkSubscriptionStatus(grade));
    }
  }, [grade, isManualSubscriptionOpen]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassInput === ADMIN_PASSWORD_REQUIRED) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('is_admin_auth', 'true');
      setAdminError(false);
    } else {
      setAdminError(true);
      setAdminPassInput('');
    }
  };

  // Fix: Added handleGradeSelect to set the grade state
  const handleGradeSelect = (g: GradeLevel) => {
    setGrade(g);
  };

  // Fix: Added handleSubjectSelect to set the subject state
  const handleSubjectSelect = (s: Subject) => {
    setSubject(s);
  };

  // شاشة دخول الأدمن لها الأولوية القصوى
  if (showAdminLogin) {
    if (isAdminAuthenticated) {
      return <AdminGenerator />;
    }
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans z-[99999]" dir="rtl">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-500 shadow-xl border border-indigo-500/20">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">لوحة التحكم</h2>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input 
              type="password" 
              value={adminPassInput}
              onChange={(e) => setAdminPassInput(e.target.value)}
              placeholder="أدخل كلمة السر"
              className={`w-full px-6 py-4 rounded-2xl bg-slate-800 border ${adminError ? 'border-red-500' : 'border-slate-700'} text-white focus:outline-none text-center text-xl tracking-widest transition-all`}
              autoFocus
            />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg text-lg">
              دخول النظام
            </button>
          </form>
          <button onClick={() => { setShowAdminLogin(false); window.location.hash = ''; }} className="mt-6 text-slate-500 hover:text-white text-xs font-bold">إلغاء والعودة للطلاب</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* مشغل الإدارة المخفي في الأسفل */}
      <div 
        onClick={() => setShowAdminLogin(true)}
        className="fixed bottom-0 right-0 w-8 h-8 z-[999999] opacity-0 cursor-default"
      ></div>

      <SubscriptionModal 
        forceOpen={isManualSubscriptionOpen}
        onClose={() => setIsManualSubscriptionOpen(false)}
        currentGrade={grade}
      />
      
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

      {grade && !subscriptionInfo.isSubscribed && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white p-2 text-center text-xs font-black animate-pulse flex items-center justify-center gap-3">
          <AlertTriangle size={14} />
          <span>هذا الصف غير مفعّل. يرجى تفعيل القفل للوصول للمواد.</span>
          <button onClick={() => setIsManualSubscriptionOpen(true)} className="bg-white text-red-600 px-3 py-1 rounded-full text-[10px]">تفعيل الآن</button>
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
        <div className="min-h-screen bg-slate-50 flex flex-col pt-10">
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setGrade(null)}>
              <div className="bg-indigo-600 p-2 rounded-xl text-white"><School size={24} /></div>
              <h1 className="text-xl font-black text-slate-900">نظام الثانوية الذكي</h1>
            </div>
            <button onClick={() => setGrade(null)} className="text-sm text-indigo-600 font-bold px-4 py-2 rounded-xl transition-all">تغيير الصف</button>
          </header>

          <main className="flex-1 max-w-5xl mx-auto w-full p-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-800 mb-2">اختر المادة الدراسية</h2>
              <p className="text-slate-500 font-bold">{grade}</p>
            </div>
            
            <div className={!subscriptionInfo.isSubscribed ? 'opacity-40 grayscale pointer-events-none' : ''}>
              <SubjectGrid grade={grade} onSelect={handleSubjectSelect} />
            </div>

            {!subscriptionInfo.isSubscribed && (
               <div className="mt-8 bg-white p-8 rounded-[2.5rem] border-2 border-indigo-100 shadow-xl text-center max-w-lg mx-auto">
                  <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-indigo-200 shadow-lg">
                    <Lock size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">المحتوى مقفل</h3>
                  <p className="text-slate-500 mb-6 font-bold">يرجى تفعيل هذا الصف الدراسي لفتح جميع المواد والشروحات.</p>
                  <button onClick={() => setIsManualSubscriptionOpen(true)} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg hover:scale-105 transition-transform">تفعيل القفل الآن</button>
               </div>
            )}
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="bg-indigo-600 p-12 text-center text-white">
               <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                 <GraduationCap size={48} />
               </div>
               <h1 className="text-4xl font-black mb-2">مُعلمي الذكي</h1>
               <p className="text-indigo-100 font-bold">رفيقك للتفوق في الثانوية</p>
            </div>
            <div className="p-10 space-y-4">
              {[GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12].map((g, idx) => (
                <button key={g} onClick={() => handleGradeSelect(g)} className="w-full p-6 rounded-3xl border-2 border-slate-100 hover:border-indigo-600 bg-white hover:bg-indigo-50 flex items-center gap-5 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">{idx + 1}</div>
                  <h3 className="font-black text-lg text-slate-900">{g}</h3>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
