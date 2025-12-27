
import React from 'react';
import { PerformanceMetrics, Subject } from '../types';
import { Target, Brain, Zap, LineChart, Award, ChevronLeft, CheckCircle2, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';

interface PerformanceDashboardProps {
  subject: Subject;
  metrics: PerformanceMetrics;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ subject, metrics, onClose }) => {
  const MetricCard = ({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
          {icon}
        </div>
        <span className="text-2xl font-black text-slate-800">{value}%</span>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-500">{title}</p>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${color.replace('text-', 'bg-')}`} 
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border border-white animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
            <Award size={160} />
          </div>
          <div className="relative z-10 flex flex-col gap-2">
            <button onClick={onClose} className="flex items-center gap-1 text-indigo-100 hover:text-white transition-colors text-sm font-bold mb-4">
              <ChevronLeft size={18} />
              العودة للدرس
            </button>
            <h2 className="text-3xl font-black">مقياس التفوق الذكي 🚀</h2>
            <p className="text-indigo-100 font-medium">تحليل الأداء لمادة: {subject}</p>
            <div className="mt-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl inline-flex items-center gap-2 self-start border border-white/20">
              <Sparkles size={16} className="text-amber-300" />
              <span className="text-sm font-bold">مستواك الحالي: {metrics.overallLevel}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Main Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="الدقة العلمية" value={metrics.accuracy} icon={<Target size={20} />} color="text-emerald-500" />
            <MetricCard title="سرعة الفهم" value={metrics.comprehension} icon={<Brain size={20} />} color="text-blue-500" />
            <MetricCard title="التحليل" value={metrics.analyticalSkills} icon={<LineChart size={20} />} color="text-violet-500" />
            <MetricCard title="الاستمرارية" value={metrics.consistency} icon={<Zap size={20} />} color="text-amber-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recommendations */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                توصيات المعلم الذكي
              </h3>
              <ul className="space-y-3">
                {metrics.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-50">
                    <CheckCircle2 size={16} className="text-indigo-600 mt-1 shrink-0" />
                    <span className="text-sm text-slate-700 font-medium leading-[1.8]">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Analysis */}
            <div className="space-y-4">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <h4 className="font-black text-emerald-800 text-sm mb-3 flex items-center gap-2">
                  <CheckCircle2 size={18} /> نقاط القوة
                </h4>
                <div className="flex flex-wrap gap-2">
                  {metrics.strongPoints?.map((p, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-emerald-600 border border-emerald-200">{p}</span>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                <h4 className="font-black text-amber-800 text-sm mb-3 flex items-center gap-2">
                  <AlertCircle size={18} /> يحتاج لتطوير
                </h4>
                <div className="flex flex-wrap gap-2">
                  {metrics.weakPoints?.map((p, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-amber-600 border border-amber-200">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">تحليل فوري دقيق مدعوم بتقنيات Gemini 3 Pro 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};
