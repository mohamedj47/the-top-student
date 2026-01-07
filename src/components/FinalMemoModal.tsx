
import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Loader2, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateFinalMemo } from '../services/geminiService';
import { Subject, GradeLevel } from '../types';

interface FinalMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  grade: GradeLevel;
}

export const FinalMemoModal: React.FC<FinalMemoModalProps> = ({ isOpen, onClose, subject, grade }) => {
  const [memoContent, setMemoContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      generateFinalMemo(subject, grade)
        .then(content => {
          setMemoContent(content);
          setIsLoading(false);
        })
        .catch(() => {
          setMemoContent("عذراً، حدث خطأ أثناء تجهيز المذكرة. يرجى المحاولة لاحقاً.");
          setIsLoading(false);
        });
    }
  }, [isOpen, subject, grade]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-0 md:p-6 no-print" dir="rtl">
      <div className="bg-white w-full max-w-5xl h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 shadow-sm">
                <FileText size={24} />
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-800">عصارة ليلة الامتحان: {subject}</h2>
                <p className="text-xs text-slate-500 font-bold">الصف {grade} - تم الاستخراج بدقة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && (
                <button 
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 border-b-4 border-indigo-800"
                >
                    <Printer size={18} />
                    <span>حفظ كـ PDF / طباعة</span>
                </button>
            )}
            <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={24} /></button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100/30 p-4 md:p-10 relative">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 size={48} className="text-indigo-600 animate-spin" />
                <p className="font-black text-slate-800 text-lg animate-pulse">جاري تجهيز الخلاصة الذهبية للامتحان...</p>
            </div>
          ) : (
            <div id="memo-to-print" className="max-w-4xl mx-auto bg-white shadow-xl rounded-[2rem] p-8 md:p-16 border border-slate-100 relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none rotate-[-35deg]">
                    <span className="text-8xl font-black text-slate-900">المعلم الذكي</span>
                </div>

                <div className="border-b-4 border-indigo-600 pb-6 mb-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 mb-2">عصارة ليلة الامتحان</h1>
                        <p className="text-indigo-600 font-bold">مادة {subject} - {grade}</p>
                    </div>
                    <div className="text-left">
                        <ShieldCheck className="text-indigo-600 mb-1 inline-block" size={32} />
                        <p className="text-[10px] font-black text-slate-400">الطالب المتفوق 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate prose-lg max-w-none font-bold text-slate-800 leading-relaxed text-right" dir="rtl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{memoContent}</ReactMarkdown>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center opacity-50 text-[10px] font-black italic">
                    <p>تم استخراج المذكرة بواسطة الذكاء الاصطناعي - نظام الطالب المتفوق</p>
                    <p>ليلة الامتحان {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media print {
            body * { visibility: hidden !important; }
            .no-print { display: none !important; }
            #memo-to-print, #memo-to-print * { 
                visibility: visible !important; 
                display: block !important;
            }
            #memo-to-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 40px !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
            }
            @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};
