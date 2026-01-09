import React, { useState, useEffect } from 'react';
import { GradeLevel, Subject } from './types';
import { SubjectGrid } from './components/SubjectGrid';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminGenerator } from './components/AdminGenerator';
import { TutorialModal } from './components/TutorialModal';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TeacherPreparation } from './components/TeacherPreparation';
import { 
  Home, Star, LayoutDashboard, User, Settings, Bell, Zap, Trophy,
  BrainCircuit, Database, GraduationCap, Clock, ShieldCheck, Hourglass, Lock, Presentation,
  Cloud, CloudOff, RefreshCw
} from 'lucide-react';
import { isGradeActivated, getTrialStatus } from './utils/apiKeyManager';
import { isSupabaseConfigured } from './lib/supabase';
import { DynamicQuestionBank } from './lib/dynamicBank';

// NavItem component for the bottom navigation
const NavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 group relative">
    <div className={`p-2.5 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-125 -translate-y-2' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
      <Icon size={22} />
    </div>
    <span className={`text-[10px] font-black transition-all ${active ? 'text-indigo-600 opacity-100 translate-y-0' : 'text-slate-400 opacity-0 translate-y-2'}`}>{label}</span>
  </button>
);

export default function App() {
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'bank' | 'teacher' | 'more'>('home');
  const [trialTimeRemaining, setTrialTimeRemaining] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTeacherHubOpen, setIsTeacherHubOpen] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const trial = getTrialStatus();
      if (trial.isActive) {
        const hours = Math.floor(trial.remaining / (1000 * 60 * 60));
        const mins = Math.floor((trial.remaining % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((trial.remaining % (1000 * 60)) / 1000);
        setTrialTimeRemaining(`${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else {
        setTrialTimeRemaining(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    
    const checkHash = () => setIsAdmin(window.location.hash.includes('admin'));
    checkHash();
    window.addEventListener('hashchange', checkHash);

    // Initial cloud sync
    if (isSupabaseConfigured()) {
        DynamicQuestionBank.syncWithCloud()
          .then(() => setIsCloudSynced(true))
          .catch(() => setIsCloudSynced(false));
    }

    return () => clearInterval(interval);
  }, []);

  if (isAdmin) return <AdminGenerator />;

  if (grade && !isGradeActivated(grade)) {
    return <SubscriptionModal grade={grade} onBack={() => setGrade(null)} />;
  }

  if (grade && subject) return <ChatInterface grade={grade} subject={subject} onBack={() => setSubject(null)} />;

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans flex flex-col pb-24" dir="rtl">
      {trialTimeRemaining && (
        <div className="bg-indigo-700 text-white py-1.5 px-4 text-center text-[10px] font-black flex items-center justify-center gap-2 sticky top-0 z-[60] shadow-md border-b border-indigo-600 animate-pulse">
           <Hourglass size={12} />
           <span>الفترة التجريبية تنتهي خلال: {trialTimeRemaining}</span>
           <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px] uppercase">Free Pass</span>
        </div>
      )}

      <PrivacyPolicy isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      {isTeacherHubOpen && <TeacherPreparation onClose={() => setIsTeacherHubOpen(false)} />}

      <header className={`sticky ${trialTimeRemaining ? 'top-[29px]' : 'top-0'} z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex justify-between items-center safe-top transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
            <GraduationCap size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 leading-none">المعلم الذكي</h1>
                {isSupabaseConfigured() && (
                    <div title={isCloudSynced ? "متصل بالسحابة" : "جاري المزامنة..."}>
                        {isCloudSynced ? 
                            <Cloud size={16} className="text-emerald-500 fill-emerald-50" /> : 
                            <RefreshCw size={14} className="text-amber-500 animate-spin" />
                        }
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 mt-1">
                <ShieldCheck size={10} className="text-indigo-500" />
                <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">
                  {isCloudSynced ? 'Cloud Synced Platform' : 'Cloud Secured Platform'}
                </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={() => setIsTeacherHubOpen(true)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full active:scale-90 transition-all border border-emerald-100"><Presentation size={20} /></button>
           <button onClick={() => setIsTutorialOpen(true)} className="p-2.5 bg-slate-100 rounded-full text-slate-600 active:scale-90 transition-all"><Bell size={20} /></button>
        </div>
      </header>

      <main className="flex-1 p-6 animate-app max-w-2xl mx-auto w-full">
        {!grade ? (
          <div className="space-y-8">
            <div className="bg-indigo-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200 border-b-8 border-indigo-800">
               <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Zap size={140} /></div>
               <div className="relative z-10">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                    Egypt Education 2026
                  </span>
                  <h2 className="text-4xl font-black mb-3 leading-[1.1]">المنهج بين <br/>إيديك يا بطل!</h2>
                  <p className="text-indigo-100 text-sm font-bold opacity-80 mb-8 max-w-[200px]">اختر صفك الدراسي وابدأ رحلة التفوق مع المعلم الذكي.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setIsTeacherHubOpen(true)} className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <Presentation size={18} />
                        ركن المعلم
                    </button>
                    <button onClick={() => setIsTutorialOpen(true)} className="bg-white text-indigo-600 px-6 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">
                        شرح التطبيق
                    </button>
                  </div>
               </div>
            </div>

            <div className="space-y-5">
               <h3 className="text-xl font-black text-slate-800 px-4 flex items-center gap-2">
                  <LayoutDashboard className="text-indigo-600" size={24} />
                  اختر سنتك الدراسية
               </h3>
               {[GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12].map((g, idx) => {
                  const isActivated = isGradeActivated(g);
                  return (
                    <button 
                      key={g} 
                      onClick={() => setGrade(g)} 
                      className={`w-full bg-white p-6 rounded-[2.5rem] border transition-all flex items-center justify-between group active:scale-[0.98] ${isActivated ? 'border-emerald-100 shadow-sm hover:border-indigo-600' : 'border-slate-100'}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-3xl transition-all shadow-inner ${isActivated ? 'bg-emerald-50 text-emerald-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {idx + 10}
                        </div>
                        <div className="text-right">
                           <span className={`text-xl font-black block ${isActivated ? 'text-slate-800' : 'text-slate-500'}`}>{g}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                             {isActivated ? '✅ متوفر الآن' : '🔒 يحتاج تفعيل'}
                           </span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-full transition-all ${isActivated ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                          {isActivated ? <Star size={20} className="fill-current" /> : <Lock size={20} />}
                      </div>
                    </button>
                  );
               })}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-app">
             <div className="flex items-center justify-between px-4 bg-white p-6 rounded-[2.5rem] shadow-sm">
                <div>
                   <h3 className="text-2xl font-black text-slate-900">{grade}</h3>
                   <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em] mt-1">مفعل سحابياً لهذا الجهاز</p>
                </div>
                <button onClick={() => setGrade(null)} className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 active:scale-90 transition-all"><Home size={22} /></button>
             </div>
             <SubjectGrid grade={grade} onSelect={setSubject} />
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200 px-8 py-5 flex justify-between items-center shadow-[0_-15px_40px_rgba(0,0,0,0.05)] safe-bottom z-50 rounded-t-[3rem]">
          <NavItem icon={Home} label="الرئيسية" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={Database} label="بنك الطالب" active={activeTab === 'bank'} onClick={() => setActiveTab('bank')} />
          <NavItem icon={Presentation} label="ركن المعلم" active={activeTab === 'teacher'} onClick={() => { setActiveTab('teacher'); setIsTeacherHubOpen(true); }} />
          <NavItem icon={User} label="حسابي" active={activeTab === 'more'} onClick={() => setActiveTab('more')} />
      </nav>
    </div>
  );
}
