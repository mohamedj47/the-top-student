
import React, { useState } from 'react';
import { ClipboardList, Presentation, Printer, Loader2, Sparkles, ChevronRight, BookOpen, GraduationCap, X, FileText, Send, Database, Copy, CheckCircle } from 'lucide-react';
import { GradeLevel, Subject } from '../types';
import { generateTeacherPrep } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TeacherPreparationProps {
  onClose: () => void;
}

const SUBJECTS_BY_GRADE: Record<GradeLevel, Subject[]> = {
  [GradeLevel.GRADE_10]: [Subject.ARABIC, Subject.ENGLISH, Subject.MATH, Subject.INTEGRATED_SCIENCES, Subject.HISTORY, Subject.GEOGRAPHY],
  [GradeLevel.GRADE_11]: [Subject.ARABIC, Subject.ENGLISH, Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY, Subject.BIOLOGY],
  [GradeLevel.GRADE_12]: [Subject.ARABIC, Subject.ENGLISH, Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY, Subject.BIOLOGY, Subject.GEOLOGY]
};

export const TeacherPreparation: React.FC<TeacherPreparationProps> = ({ onClose }) => {
  const [step, setStep] = useState<'selection' | 'generating' | 'result'>('selection');
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lesson, setLesson] = useState('');
  const [prepContent, setPrepContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerate = async () => {
    if (!grade || !subject || !lesson) return;
    setStep('generating');
    try {
      const content = await generateTeacherPrep(grade, subject, lesson);
      setPrepContent(content);
      setStep('result');
    } catch (e) {
      alert("عذراً، حدث خطأ.");
      setStep('selection');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prepContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-0 md:p-6" dir="rtl">
      <div className="bg-white w-full max-w-5xl h-full md:h-[92vh] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative">
        <div className="bg-indigo-900 p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <Presentation size={24} className="text-emerald-400" />
            <h2 className="text-xl font-black">ركن المعلم الذكي 🍎</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
          {step === 'selection' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
               <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-600">اختر الصف:</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       {[GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12].map(g => (
                         <button key={g} onClick={() => { setGrade(g); setSubject(null); }} className={`p-4 rounded-2xl border-2 font-black text-xs ${grade === g ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>{g}</button>
                       ))}
                    </div>
                  </div>
                  {grade && (
                    <select value={subject || ''} onChange={(e) => setSubject(e.target.value as Subject)} className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold">
                       <option value="">-- اختر المادة --</option>
                       {SUBJECTS_BY_GRADE[grade].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  )}
                  {subject && (
                    <div className="relative">
                       <input type="text" value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="اسم الدرس..." className="w-full p-4 rounded-2xl border-2 border-slate-100 font-bold" />
                       <button onClick={handleGenerate} className="absolute left-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-xl font-black text-sm">ابدأ التحضير</button>
                    </div>
                  )}
               </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
               <Loader2 size={60} className="text-indigo-600 animate-spin" />
               <p className="font-black text-slate-700">جاري استدعاء البيانات...</p>
            </div>
          )}

          {step === 'result' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <button onClick={() => setStep('selection')} className="text-indigo-600 font-black flex items-center gap-1"><ChevronRight /> تحضير آخر</button>
                  <div className="flex gap-2">
                    <button onClick={handleCopy} className={`px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white border text-slate-700'}`}>
                       {isCopied ? <CheckCircle size={20} /> : <Copy size={20} />}
                       <span>{isCopied ? 'تم!' : 'نسخ'}</span>
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg"><Printer size={20} /> طباعة</button>
                  </div>
               </div>
               <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-sm border border-slate-100 text-right" dir="rtl">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{prepContent}</ReactMarkdown>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
