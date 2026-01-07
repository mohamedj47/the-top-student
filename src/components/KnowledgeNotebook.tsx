
import React, { useState, useEffect } from 'react';
import { X, BookText, FileText, Database, Plus, Sparkles } from 'lucide-react';
import { DynamicQuestion, DynamicQuestionBank } from '../lib/dynamicBank';
import { Subject } from '../types';

interface KnowledgeNotebookProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  onUseSource: (text: string) => void;
}

export const KnowledgeNotebook: React.FC<KnowledgeNotebookProps> = ({ isOpen, onClose, subject, onUseSource }) => {
  const [sources, setSources] = useState<DynamicQuestion[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const all = DynamicQuestionBank.getAll().filter(q => q.subject === subject);
      setSources(all);
    }
  }, [isOpen, subject]);

  const toggleSource = (idx: number) => {
    const next = new Set(selectedSources);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedSources(next);
  };

  const handleAskSelected = () => {
    const context = Array.from(selectedSources)
      .map((idx) => `المصدر ${idx + 1}: ${sources[idx].answer}`)
      .join('\n\n');
    
    onUseSource(`بناءً على المصادر المختارة بالأسفل، أريد ملخصاً شاملاً يربط بينهم جميعاً:\n\n${context}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20">
        <aside className="w-full md:w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-6 bg-white border-b border-slate-200">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-indigo-600" />
                مصادر التعلم
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sources.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                    <FileText size={40} />
                    <p className="text-xs font-bold">لا توجد مصادر</p>
                </div>
            ) : (
                sources.map((src, idx) => (
                    <div key={idx} onClick={() => toggleSource(idx)} className={`p-3 rounded-2xl border cursor-pointer transition-all ${selectedSources.has(idx) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-700'}`}>
                        <p className="text-xs font-bold line-clamp-2">{src.question}</p>
                    </div>
                ))
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-white">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <BookText size={24} className="text-indigo-600" />
                <h2 className="text-xl font-black text-slate-800">دفتر تحضير الطالب</h2>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            {selectedSources.size === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <Sparkles size={48} className="text-indigo-600 animate-bounce" />
                    <h4 className="text-lg font-black text-slate-800">اختر المصادر للتحليل</h4>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from(selectedSources).map((idx) => (
                            <div key={idx} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50">
                                <p className="text-xs text-slate-600 font-bold italic line-clamp-4">"{sources[idx].answer}"</p>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAskSelected} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3">
                        <Sparkles size={20} /> تحليل المصادر وربطها
                    </button>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default KnowledgeNotebook;
