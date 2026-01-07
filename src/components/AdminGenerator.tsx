
import React, { useState } from 'react';
import { ShieldCheck, Copy, RefreshCw, Lock, Home, Smartphone, AlertCircle } from 'lucide-react';
import { generateActivationCode } from '../lib/dynamicBank'; 

const ADMIN_PASS = "202625";

export const AdminGenerator: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentDeviceId, setStudentDeviceId] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASS) {
      setIsAuthenticated(true);
    } else {
      alert("كلمة المرور غير صحيحة");
      setPassword('');
    }
  };

  const handleGenerate = () => {
    if (!studentDeviceId.trim()) return;
    const code = generateActivationCode(studentDeviceId.trim());
    // تنسيق الكود لشكل 4-4-4 للعرض فقط
    const formatted = code.match(/.{1,4}/g)?.join(' - ') || code;
    setGeneratedCode(formatted);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode.replace(/\s-\s/g, ''));
    alert("تم نسخ كود التفعيل الأصلي بنجاح!");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-6">منطقة الإدارة</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white focus:border-indigo-500 focus:outline-none text-center text-lg tracking-widest"
              autoFocus
            />
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all">
              دخول
            </button>
          </form>
          <button onClick={() => window.location.hash = ''} className="block w-full mt-6 text-slate-500 hover:text-white text-sm transition-colors">
            العودة للتطبيق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-mono" dir="rtl">
      <div className="max-w-xl w-full space-y-6">
        <div className="flex items-center justify-between text-slate-400 mb-4">
           <div className="flex items-center gap-2">
             <ShieldCheck size={20} className="text-emerald-500" />
             <span className="font-bold text-white uppercase tracking-tighter">Admin Panel v2.0</span>
           </div>
           <button onClick={() => setIsAuthenticated(false)} className="text-xs hover:text-white bg-slate-800 px-3 py-1 rounded-full">خروج</button>
        </div>

        <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8">
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
               <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
               <p className="text-xs text-blue-200 leading-relaxed font-sans">
                 <b>طريقة العمل:</b> الكود يتم إنشاؤه بناءً على معرف الجهاز الخاص بالطالب حصراً. تأكد من كتابة الـ ID كما يظهر في جهاز الطالب بالضبط (مثال: STD-A28AEC6B).
               </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-3 text-right font-sans">معرف جهاز الطالب (Device ID):</label>
              <div className="relative">
                <input 
                    type="text" 
                    value={studentDeviceId}
                    onChange={(e) => setStudentDeviceId(e.target.value.toUpperCase())}
                    placeholder="STD-XXXXXXXX"
                    className="w-full bg-black/40 border-2 border-slate-700 rounded-2xl px-4 py-5 text-white focus:border-emerald-500 outline-none font-mono text-center text-2xl tracking-widest transition-all"
                    dir="ltr"
                />
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={24} />
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={!studentDeviceId.trim()}
              className={`w-full font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl text-lg ${
                  studentDeviceId.trim() 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <RefreshCw size={22} className={studentDeviceId.trim() ? '' : 'opacity-20'} />
              توليد كود التفعيل
            </button>

            {generatedCode && (
              <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/20 text-center animate-in zoom-in-95 duration-300">
                <p className="text-xs text-emerald-400 mb-4 font-bold uppercase tracking-widest">كود التفعيل جاهز للإرسال</p>
                <div className="bg-black/60 p-5 rounded-xl border border-slate-700 mb-5 group cursor-pointer" onClick={copyToClipboard}>
                  <code className="text-3xl md:text-4xl font-black text-white tracking-widest block">{generatedCode}</code>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="w-full bg-white text-slate-900 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black hover:bg-emerald-50 transition-colors"
                >
                  <Copy size={18} />
                  نسخ الكود الأصلي
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-center pt-4">
           <button onClick={() => window.location.hash = ''} className="text-slate-600 hover:text-white flex items-center justify-center gap-2 transition-colors text-sm font-bold">
             <Home size={16} />
             العودة للواجهة الرئيسية
           </button>
        </div>
      </div>
    </div>
  );
};
