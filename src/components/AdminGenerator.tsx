
import React, { useState } from 'react';
import { ShieldCheck, Copy, RefreshCw, Home, Smartphone, Layers, CheckCircle, ArrowLeft } from 'lucide-react';
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
        
        <div className="flex items-center justify-between text-slate-400 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
           <div className="flex items-center gap-2">
             <ShieldCheck size={20} className="text-emerald-500" />
             <span className="font-black text-white text-sm">مولد أكواد التفعيل الرسمي</span>
           </div>
           <button onClick={goBackToApp} className="text-[10px] font-black hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">خروج</button>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 p-8 space-y-6">
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <Layers size={14} /> الصف الدراسي المراد تفعيله:
              </label>
              <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-indigo-500 appearance-none text-base"
              >
                <option value={GradeLevel.GRADE_10}>{GradeLevel.GRADE_10}</option>
                <option value={GradeLevel.GRADE_11}>{GradeLevel.GRADE_11}</option>
                <option value={GradeLevel.GRADE_12}>{GradeLevel.GRADE_12}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 flex items-center gap-2">
                <Smartphone size={14} /> معرف جهاز الطالب (ID):
              </label>
              <input 
                  type="text" 
                  value={studentDeviceId}
                  onChange={(e) => setStudentDeviceId(e.target.value.toUpperCase())}
                  placeholder="STD-XXXXXXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-center text-xl tracking-wider"
                  dir="ltr"
              />
            </div>

            <button 
              onClick={handleGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 text-lg"
            >
              <RefreshCw size={20} />
              توليد كود التفعيل الفوري
            </button>

            {generatedCode && (
              <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 text-center space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-center gap-2 text-emerald-500">
                  <CheckCircle size={16} />
                  <p className="text-xs font-black uppercase tracking-widest">الكود جاهز للإرسال</p>
                </div>
                <div className="bg-black/40 p-4 rounded-2xl border border-emerald-500/20">
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
          className="w-full text-slate-600 hover:text-slate-400 flex items-center justify-center gap-2 transition-colors font-black text-xs py-4"
        >
          <Home size={14} /> العودة للواجهة الرئيسية للطلاب
        </button>
      </div>
    </div>
  );
};
