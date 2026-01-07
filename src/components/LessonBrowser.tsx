
import React, { useState } from 'react';
import { X, PlayCircle, BookOpen, Sparkles, Calendar, AlertCircle } from 'lucide-react';
import { GradeLevel, Subject, StudyLanguage } from '../types';
import { getCurriculumFor } from '../data/curriculum';
import { getVideoForLesson, VideoResult } from '../data/videoData'; 

interface LessonBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  grade: GradeLevel;
  subject: Subject;
  studyLanguage?: StudyLanguage;
  onPlayVideo: (lesson: string, data: VideoResult) => void;
  onExplain: (lesson: string) => void;
}

export const LessonBrowser: React.FC<LessonBrowserProps> = ({ 
  isOpen, onClose, grade, subject, studyLanguage = StudyLanguage.ARABIC, onPlayVideo, onExplain 
}) => {
  const [activeTab, setActiveTab] = useState<'term1' | 'term2'>('term1');

  if (!isOpen) return null;

  const curriculum = getCurriculumFor(grade, subject);
  const term1Lessons = curriculum.term1 || [];
  const term2Lessons = curriculum.term2 || [];

  const handleVideoClick = (lesson: string) => {
    const videoData = getVideoForLesson(grade, subject, lesson);
    onPlayVideo(lesson, videoData);
  };

  const currentLessons = activeTab === 'term1' ? term1Lessons : term2Lessons;

  // Localization Map
  const t = {
    title: studyLanguage === StudyLanguage.ARABIC ? "فهرس الدروس" : "Lesson Index",
    term1: studyLanguage === StudyLanguage.ARABIC ? "الترم الأول" : "Term 1",
    term2: studyLanguage === StudyLanguage.ARABIC ? "الترم الثاني" : "Term 2",
    explainBtn: studyLanguage === StudyLanguage.ARABIC ? "شرح AI" : "AI Explain",
    videoBtn: studyLanguage === StudyLanguage.ARABIC ? "فيديو" : "Video",
    noLessons: studyLanguage === StudyLanguage.ARABIC ? "لا توجد دروس حالياً" : "No lessons available",
    footerMsg: studyLanguage === StudyLanguage.ARABIC 
      ? "تم تحديث المنهج وفقاً لأحدث مقررات وزارة التربية والتعليم" 
      : "Curriculum updated according to the latest Ministry guidelines"
  };

  return (
    <div className={`fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm flex ${studyLanguage === StudyLanguage.ARABIC ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`} dir={studyLanguage === StudyLanguage.ARABIC ? 'rtl' : 'ltr'}>
      <div className={`bg-slate-50 w-full max-w-md h-full shadow-2xl flex flex-col animate-in ${studyLanguage === StudyLanguage.ARABIC ? 'slide-in-from-right' : 'slide-in-from-left'} duration-300`}>
        
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-3 ${studyLanguage === StudyLanguage.ARABIC ? 'flex-row' : 'flex-row-reverse'}`}>
              <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                <X size={20} />
              </button>
              <div className={studyLanguage === StudyLanguage.ARABIC ? 'text-right' : 'text-left'}>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="text-indigo-600" size={24} />
                  {t.title}
                </h2>
                <p className="text-sm text-slate-500">{subject} - {grade}</p>
              </div>
            </div>
          </div>

          {/* Term Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
                onClick={() => setActiveTab('term1')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'term1' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
             >
                {t.term1}
             </button>
             <button 
                onClick={() => setActiveTab('term2')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'term2' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
             >
                {t.term2}
             </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {currentLessons.length > 0 ? (
            currentLessons.map((lesson, idx) => (
              <div key={idx} className="group bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-bottom-2 fade-in fill-mode-backwards" style={{animationDelay: `${idx * 50}ms`}}>
                <div className={`flex-1 w-full ${studyLanguage === StudyLanguage.ARABIC ? 'text-right' : 'text-left'}`}>
                  <p className="font-bold text-slate-800 text-sm md:text-base leading-relaxed">
                    {lesson}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <button 
                    onClick={() => onExplain(lesson)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-lg transition-all active:scale-95 border border-indigo-100"
                  >
                    <Sparkles size={16} />
                    <span className="text-xs font-bold">{t.explainBtn}</span>
                  </button>

                  <button 
                    onClick={() => handleVideoClick(lesson)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition-all active:scale-95 border border-red-100"
                  >
                    <PlayCircle size={16} />
                    <span className="text-xs font-bold">{t.videoBtn}</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-70">
              <Calendar size={40} className="text-slate-400 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">{t.noLessons}</h3>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center shrink-0">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
             {t.footerMsg}
          </p>
        </div>
      </div>
    </div>
  );
};
