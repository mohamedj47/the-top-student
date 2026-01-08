
import React, { useState, useEffect } from 'react';
import { X, BookText, FileText, Search, Database, MessageSquare, Plus, Trash2, LayoutGrid, Sparkles } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'sources' | 'chat'>('sources');

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
    // Fixed: Added explicit type annotation (idx: number) to fix 'unknown' type error
    const context = Array.from(selectedSources)
      .map((idx: number) => `المصدر ${idx + 1}: ${sources[idx].answer}`)
      .join('\n\n');
    
    onUseSource(`بناءً على المصادر المختارة بالأسفل، أريد ملخصاً شاملاً يربط بينهم جميعاً:\n\n${context}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20">
        
        {/* Sidebar - Sources List */}
        <div className="w-full md:w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-6 bg-white border-b border-slate-200">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-indigo-600" />
                مصادر التعلم (Sources)
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">اختر المصادر التي تريد تحليلها</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sources.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                    <FileText size={40} />
                    <p className="text-xs font-bold">لا توجد مصادر بعد</p>
                </div>
            ) : (
                sources.map((src, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => toggleSource(idx)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer group relative ${
                            selectedSources.has(idx) 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                            : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <FileText size={14} className={selectedSources.has(idx) ? 'text-indigo-200' : 'text-indigo-600'} />
                            <span className="text-[10px] font-black opacity-70">مصدر #{idx + 1}</span>
                        </div>
                        <p className="text-xs font-bold line-clamp-2 leading-relaxed">{src.question}</p>
                        {selectedSources.has(idx) && (
                            <div className="absolute top-2 left-2 w-4 h-4 bg-white text-indigo-600 rounded-full flex items-center justify-center">
                                <Plus size={10} strokeWidth={4} />
                            </div>
                        )}
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                    <BookText size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800">دفتر تحضير الطالب الذكي</h2>
                    <p className="text-xs text-slate-500 font-medium">مستوحى من NotebookLM لمذاكرة أذكى</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={24} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {selectedSources.size === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 animate-bounce">
                        <Sparkles size={48} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-800 mb-2">ابدأ المذاكرة المتعمقة</h4>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            قم باختيار المصادر من القائمة الجانبية (شروحات الدكتور السابقة)، ثم اضغط على "تحليل المصادر" ليقوم الذكاء الاصطناعي بربط المعلومات ببعضها واستخراج الخلاصة.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-indigo-600 font-black text-sm mb-4">
                        <LayoutGrid size={18} />
                        تم اختيار {selectedSources.size} مصادر للتحليل
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fixed: Added explicit type annotation (idx: number) to fix 'unknown' type error */}
                        {Array.from(selectedSources).map((idx: number) => (
                            <div key={idx} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-2">
                                <h5 className="font-black text-indigo-600 text-xs">محتوى المصدر #{idx + 1}</h5>
                                <p className="text-xs text-slate-600 font-bold leading-relaxed line-clamp-4 italic">"{sources[idx].answer}"</p>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={handleAskSelected}
                        className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95"
                    >
                        <Sparkles size={20} />
                        تحليل المصادر المختارة وربطها ببعضها
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
