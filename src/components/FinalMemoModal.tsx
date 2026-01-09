
import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Loader2, Copy, CheckCircle } from 'lucide-react';
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
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      generateFinalMemo(subject, grade).then(content => {
        setMemoContent(content);
        setIsLoading(false);
      });
    }
  }, [isOpen, subject, grade]);

  const handleCopy = () => {
    navigator.clipboard.writeText(memoContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 flex items-center justify-center p-0 md:p-6" dir="rtl">
      <div className="bg-white w-full max-w-5xl h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <FileText size={24} className="text-amber-600" />
            <h2 className="text-xl font-black">عصارة الامتحان: {subject}</h2>
          </div>
          <div className="flex gap-2">
            {!isLoading && (
              <>
                <button onClick={handleCopy} className={`px-4 py-2 rounded-xl font-black flex items-center gap-2 ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white border'}`}>
                  {isCopied ? <CheckCircle size={18} /> : <Copy size={18} />} {isCopied ? 'تم!' : 'نسخ'}
                </button>
                <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black flex items-center gap-2"><Printer size={18} /> طباعة</button>
              </>
            )}
            <button onClick={onClose} className="p-2"><X size={24} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-10 bg-white text-right" dir="rtl">
          {isLoading ? <div className="h-full flex flex-col items-center justify-center gap-4"><Loader2 size={40} className="animate-spin" /><p>جاري التجهيز...</p></div> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{memoContent}</ReactMarkdown>}
        </div>
      </div>
    </div>
  );
};
