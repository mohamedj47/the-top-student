
import React, { useState } from 'react';
import { ShieldCheck, Copy, RefreshCw, Lock, Home, Smartphone, AlertCircle, Layers, BadgePercent, CheckCircle } from 'lucide-react';
import { generateValidCode } from '../utils/subscriptionManager';
import { GradeLevel } from '../types';

const ADMIN_PASS = "202625";

export const AdminGenerator: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentDeviceId, setStudentDeviceId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>(GradeLevel.GRADE_12);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASS) setIsAuthenticated(true);
    else {
      alert("كلمة المرور غير صحيحة");
      setPassword('');
    }
  };

  const handleGenerate = () => {
    if (!studentDeviceId.trim()) {
      alert("يرجى إدخال Device ID الخاص بالطالب أولاً");
      return;
    }
    const code = generateValidCode(studentDeviceId.trim(), selectedGrade);
    setGeneratedCode(code);
  };

  const goBackToApp = () => {
    window.location.hash = '';
    // في بعض الأحيان قد يحتاج المتصفح لتحديث يدوي إذا لم يستجب الهاش
    if (window.location.hash === '#admin') {
      window.location.href = window.location.origin;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-md text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-500">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-6 tracking-tight">إدارة التفعيلات</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور السرية"
              className="w-full px-6 py-4 rounded-xl bg-slate-900 border border-slate-600 text-white focus:border-indigo-500 focus:outline-none text-center text-xl tracking-[0.3em]"
              autoFocus
            />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/20">
              دخول المدير
            </button>
          </form>
          <button onClick={goBackToApp} className="mt-6 text-slate-500 hover:text-white text-sm font-bold transition-colors">إلغاء والعودة</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="max-w-xl w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between text-slate-400 bg-slate-800/50 p-4 rounded-2xl border border-slate-700 backdrop-blur-md">
           <div className="flex items-center gap-2">
             <ShieldCheck size={20} className="text-emerald-500" />
             <span className="font-black text-white">لوحة تفعيل الفصول</span>
           </div>
           <button onClick={() => setIsAuthenticated(false)} className="text-xs font-bold hover:text-white bg-slate-700 px-3 py-1 rounded-lg transition-colors">خروج</button>
        </div>

        <div className="bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-700 p-8 space-y-6">
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                <Layers size={16} /> اختر الصف المراد تفعيله:
              </label>
              <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-indigo-500 appearance-none"
              >
                <option value={GradeLevel.GRADE_10}>{GradeLevel.GRADE_10}</option>
                <option value={GradeLevel.GRADE_11}>{GradeLevel.GRADE_11}</option>
                <option value={GradeLevel.GRADE_12}>{GradeLevel.GRADE_12}</option>
              </select>
              
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgePercent className="text-indigo-400" size={20} />
                  <span className="text-sm font-bold text-indigo-100">السعر المعروض للطلاب:</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xs line-through block">300 جنيه</span>
                  <span className="text-xl font-black text-white">90 جنيه / 30 يوم</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                <Smartphone size={16} /> رقم جهاز الطالب (Device ID):
              </label>
              <input 
                  type="text" 
                  value={studentDeviceId}
                  onChange={(e) => setStudentDeviceId(e.target.value.toUpperCase())}
                  placeholder="STD-XXXXXXXX"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-center text-xl tracking-wider"
                  dir="ltr"
              />
            </div>

            <button 
              onClick={handleGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw size={20} />
              توليد كود التفعيل (30 يوم)
            </button>

            {generatedCode && (
              <div className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/30 text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
                  <CheckCircle size={18} />
                  <p className="text-xs font-black uppercase tracking-widest">تم التوليد بنجاح!</p>
                </div>
                <div className="bg-black/40 p-5 rounded-2xl border-2 border-emerald-500/20">
                  <code className="text-2xl font-black text-white tracking-[0.1em]">{generatedCode}</code>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    alert("تم نسخ الكود بنجاح");
                  }}
                  className="w-full bg-white text-slate-900 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all hover:bg-slate-100 active:scale-95"
                >
                  <Copy size={18} />
                  نسخ الكود وإرساله للطالب
                </button>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={goBackToApp} 
          className="w-full text-slate-500 hover:text-white flex items-center justify-center gap-2 transition-colors font-bold text-sm py-4"
        >
          <Home size={18} /> العودة للتطبيق
        </button>
      </div>
    </div>
  );
};
