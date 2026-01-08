
import React, { useState, useEffect } from 'react';
import { Lock, Clock, CheckCircle, Send, AlertTriangle, Copy, BadgePercent, X, ShieldCheck } from 'lucide-react';
import { GradeLevel } from '../types';
import { generateActivationCode } from '../lib/dynamicBank';

const ADMIN_PHONE_NUMBER = "201221746554"; 

interface SubscriptionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  currentGrade?: GradeLevel | null;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ forceOpen, onClose, currentGrade }) => {
  const [viewState, setViewState] = useState<'loading' | 'hidden' | 'locked' | 'manual'>('loading');
  const [deviceId, setDeviceId] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  useEffect(() => {
    if (currentGrade) setSelectedGrade(currentGrade);
  }, [currentGrade]);

  useEffect(() => {
    const id = ensureDeviceId();
    if (forceOpen) {
        setViewState('manual');
    } else {
        checkStatus();
    }
  }, [forceOpen, currentGrade]);

  const ensureDeviceId = () => {
    let storedId = localStorage.getItem('device_id');
    if (!storedId) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      storedId = 'STD-' + array[0].toString(16).toUpperCase().padStart(8, '0');
      localStorage.setItem('device_id', storedId);
    }
    setDeviceId(storedId);
    return storedId;
  };

  const checkStatus = () => {
    const grades = [GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12];
    let hasAnySubscription = false;
    for (const g of grades) {
      const expiry = localStorage.getItem(`subscription_expiry_${g}`);
      if (expiry && new Date(expiry) > new Date()) {
        hasAnySubscription = true;
        break;
      }
    }
    if (hasAnySubscription) {
        setViewState('hidden');
        return;
    }
    const trialStartStr = localStorage.getItem('trial_start_date') || new Date().toISOString();
    if (!localStorage.getItem('trial_start_date')) localStorage.setItem('trial_start_date', trialStartStr);
    const diffHours = (new Date().getTime() - new Date(trialStartStr).getTime()) / (1000 * 60 * 60);
    setViewState(diffHours >= 48 ? 'locked' : 'hidden');
  };

  const handleWhatsAppRequest = () => {
    const gradeName = selectedGrade || currentGrade || "غير محدد";
    const message = `طلب تفعيل "المعلم الذكي" (عرض الـ 90 ج)%0A%0Aالمعرف الفريد للجهاز: ${deviceId}%0Aالصف الدراسي: ${gradeName}%0A%0Aأرغب في الاستفادة من خصم الـ 70% وتفعيل جميع المواد لمدة 30 يوم بسعر 90 ج.م فقط بدلاً من 300 ج.م.`;
    window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${message}`, '_blank');
  };

  const handleActivate = () => {
    setError('');
    const cleanInput = inputCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const expected = generateActivationCode(deviceId);

    if (cleanInput === expected && cleanInput.length === 12) {
      const gradeToActivate = selectedGrade || currentGrade || GradeLevel.GRADE_12;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); 
      localStorage.setItem(`subscription_expiry_${gradeToActivate}`, expiryDate.toISOString());
      alert(`تم التفعيل بنجاح! شكراً لاشتراكك في المعلم الذكي.`);
      window.location.reload(); 
    } else {
      setError("كود التفعيل غير مطابق لهذا الجهاز. تأكد من إرسال المعرف الصحيح للأدمن.");
    }
  };

  if (viewState === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 font-sans text-right" dir="rtl">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        {viewState === 'manual' && onClose && (
            <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
            </button>
        )}

        <div className="pt-10 pb-6 px-6 text-center">
           <h2 className="text-3xl font-black text-slate-800 mb-1">تفعيل المعلم الذكي</h2>
           <p className="text-slate-500 text-sm font-bold">نظام التشفير الفردي للجهاز (صلاحية 30 يوم)</p>
        </div>

        <div className="px-8 pb-10 space-y-6">
           <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex flex-col">
                 <span className="text-[10px] text-slate-400 font-bold line-through decoration-red-400">300 جنيه</span>
                 <span className="text-xl font-black text-amber-700">90 ج.م / 30 يوم</span>
              </div>
              <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5">
                 <BadgePercent size={14} />
                 <span>خصم 70% مؤقت</span>
              </div>
           </div>

           <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 mr-2">معرف الجهاز الخاص بك:</label>
              <div className="bg-[#1e293b] p-4 rounded-2xl flex items-center justify-between shadow-inner">
                  <code className="text-xl font-mono font-black text-emerald-400 tracking-wider">
                    {deviceId}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(deviceId); alert("تم نسخ المعرف!"); }} className="p-2.5 bg-slate-700 text-white hover:bg-slate-600 rounded-xl transition-all">
                    <Copy size={18}/>
                  </button>
              </div>
           </div>

           <button 
             onClick={handleWhatsAppRequest} 
             className="w-full bg-[#2ecc71] hover:bg-[#27ae60] text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg"
           >
            <Send size={22} className="rotate-[-20deg]" />
            <span>طلب كود التفعيل بـ 90 ج</span>
          </button>
           
           <div className="space-y-4 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-4 text-xs font-bold text-slate-300">أدخل الكود المستلم بالأسفل</span></div>
              </div>

              <input 
                type="text" 
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className={`block w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl text-center font-mono text-2xl uppercase tracking-[0.2em] outline-none transition-all ${error ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-100 text-slate-700 focus:bg-white focus:border-indigo-500'}`}
                placeholder="XXXX - XXXX - XXXX"
              />

              <button 
                onClick={handleActivate}
                disabled={inputCode.replace(/[^A-Z0-9]/gi, '').length < 12}
                className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-lg ${inputCode.replace(/[^A-Z0-9]/gi, '').length >= 12 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                تفعيل الاشتراك الآن
              </button>
              
              {error && (
                <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                    {error}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
