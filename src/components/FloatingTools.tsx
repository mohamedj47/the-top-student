
import React, { useState } from 'react';
import { Printer, Volume2, VolumeX, Loader2, Play, Info } from 'lucide-react';
// Fix: Use exported 'speakLongTextGemini' instead of non-existent 'streamSpeech'
import { speakLongTextGemini } from '../services/geminiService';

export const FloatingTools: React.FC = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const stopAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleReadPage = async () => {
    if (isSpeaking) {
      stopAudio();
      return;
    }

    // استخراج النصوص من الرسائل فقط لضمان جودة المحتوى
    const messageContainers = document.querySelectorAll('.chat-container .rounded-2xl.text-right');
    let textToRead = "";
    
    if (messageContainers.length > 0) {
      messageContainers.forEach((container) => {
        // نأخذ النص فقط ونتجنب الأزرار أو الرموز
        const paragraphs = container.querySelectorAll('p, li, td');
        paragraphs.forEach(p => {
          textToRead += (p as HTMLElement).innerText + " . ";
        });
      });
    } else {
      textToRead = "مرحباً بك في نظام المتفوق الذكي. ابدأ بسؤال المعلمة عن أي شيء في المنهج.";
    }

    if (textToRead.trim().length < 10) return;

    setIsSpeaking(true);
    // تشغيل محرك النطق المتطور (Super-Teacher Engine)
    // Fix: Updated call to 'speakLongTextGemini' with correct parameter structure
    await speakLongTextGemini(textToRead, undefined, () => setIsSpeaking(false));
  };

  return (
    <div className="fixed top-24 left-4 z-[80] flex flex-col gap-4 no-print group">
      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={handleReadPage}
          className={`group/btn relative p-4 rounded-2xl shadow-xl transition-all border-2 flex items-center justify-center hover:scale-110 active:scale-95 ${
            isSpeaking 
            ? 'bg-red-500 border-red-400 text-white animate-pulse' 
            : 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-200'
          }`}
          title={isSpeaking ? "إيقاف القراءة" : "قراءة الصفحة بالكامل بصوت المعلمة"}
        >
          {isSpeaking ? <VolumeX size={24} /> : <Volume2 size={24} />}
          
          {/* Tooltip */}
          <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isSpeaking ? "إيقاف النطق" : "قراءة الصفحة (صوت معلمة)"}
          </span>
        </button>
        
        {isSpeaking && (
          <div className="bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100 flex items-center gap-1">
             <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
             <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
          </div>
        )}
      </div>

      <button
        onClick={() => window.print()}
        className="p-4 bg-white text-slate-700 rounded-2xl shadow-lg hover:bg-slate-50 transition-all border-2 border-slate-100 hover:scale-110 active:scale-95 group/print"
        title="حفظ الصفحة كـ PDF"
      >
        <Printer size={24} />
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/print:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          طباعة / حفظ PDF
        </span>
      </button>
    </div>
  );
};
