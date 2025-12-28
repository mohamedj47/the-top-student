
import React, { useState } from 'react';
import { ShieldCheck, Copy, RefreshCw, Smartphone, Layers, CheckCircle, Home, Send } from 'lucide-react';
import { generateValidCode } from '../utils/subscriptionManager';
import { GradeLevel } from '../types';

export const AdminGenerator: React.FC = () => {
  const [studentDeviceId, setStudentDeviceId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>(GradeLevel.GRADE_12);
  const [generatedCode, setGeneratedCode] = useState('');

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
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
      <div className="max-w-md w-full space-y-4 animate-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex items-center justify-between text-slate-400 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xl">
           <div className="flex items-center gap-3">
             <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500">
               <ShieldCheck size={24} />
             </div>
             <span className="font-black text-white text-base">نظام التوليد المركزي</span>
           </div>
           <button onClick={goBackToApp} className="text-xs font-black hover:text-white bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 transition-all hover:bg-red-900/20 hover:border-red-500/30">خروج</button>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 p-8 space-y-8">
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2 pr-1">
                <Layers size={14} /> الصف الدراسي المستهدف:
              </label>
              <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-white font-black outline-none focus:border-indigo-500 appearance-none text-lg transition-all"
              >
                <option value={GradeLevel.GRADE_10}>{GradeLevel.GRADE_10}</option>
                <option value={GradeLevel.GRADE_11}>{GradeLevel.GRADE_11}</option>
                <option value={GradeLevel.GRADE_12}>{GradeLevel.GRADE_12}</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2 pr-1">
                <Smartphone size={14} /> معرف جهاز الطالب (STD-ID):
              </label>
              <input 
                  type="text" 
                  value={studentDeviceId}
                  onChange={(e) => setStudentDeviceId(e.target.value.toUpperCase())}
                  placeholder="STD-XXXXXXXX"
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-5 text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-center text-2xl tracking-widest transition-all"
                  dir="ltr"
              />
            </div>

            <button 
              onClick={handleGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 text-xl group"
            >
              <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
              توليد الكود الآن
            </button>

            {generatedCode && (
              <div className="bg-emerald-500/5 p-8 rounded-[2rem] border-2 border-emerald-500/20 text-center space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-center gap-2 text-emerald-500">
                  <CheckCircle size={20} />
                  <p className="text-sm font-black uppercase tracking-widest">تم التوليد بنجاح</p>
                </div>
                <div className="bg-black/60 p-6 rounded-2xl border-2 border-emerald-500/30 shadow-inner">
                  <code className="text-3xl font-black text-white tracking-[0.15em]">{generatedCode}</code>
                </div>
                <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCode);
                        alert("تم نسخ الكود");
                      }}
                      className="flex-1 bg-white text-slate-900 py-4 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all hover:bg-slate-100 active:scale-95 shadow-lg"
                    >
                      <Copy size={20} />
                      نسخ الكود
                    </button>
                    <button 
                      onClick={() => {
                        const msg = `كود التفعيل الخاص بك لصف ${selectedGrade} هو: ${generatedCode}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="bg-emerald-600 text-white p-4 rounded-xl hover:bg-emerald-500 transition-all shadow-lg"
                      title="إرسال عبر واتساب"
                    >
                      <Send size={20} />
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={goBackToApp} 
          className="w-full text-slate-600 hover:text-slate-400 flex items-center justify-center gap-2 transition-colors font-black text-xs py-6"
        >
          <Home size={16} /> العودة لنظام الطلاب
        </button>
      </div>
    </div>
  );
};
