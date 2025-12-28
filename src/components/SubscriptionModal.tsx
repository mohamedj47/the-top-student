
import React, { useState, useEffect } from 'react';
import { Lock, Clock, CheckCircle, Send, AlertTriangle, Copy, BadgePercent, X, Star, Smartphone, ShieldCheck } from 'lucide-react';
import { GradeLevel } from '../types';

const SALT = "SMART_EDU_EGYPT_2026"; 
const ADMIN_PHONE_NUMBER = "201221746554"; 

interface SubscriptionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  currentGrade?: GradeLevel | null;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ forceOpen, onClose, currentGrade }) => {
  const [viewState, setViewState] = useState<'loading' | 'hidden' | 'locked' | 'manual'>('loading');
  const [lockReason, setLockReason] = useState<'trial_ended' | 'subscription_ended' | 'manual_upgrade'>('trial_ended');
  
  const [deviceId, setDeviceId] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  useEffect(() => {
    if (currentGrade) {
        setSelectedGrade(currentGrade);
    }
  }, [currentGrade]);

  useEffect(() => {
    if (forceOpen) {
        setLockReason('manual_upgrade');
        setViewState('manual');
        ensureDeviceId();
    } else {
        checkStatus();
    }
  }, [forceOpen, currentGrade]);

  // منع السكرول عند القفل
  useEffect(() => {
    if (viewState === 'locked') {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
  }, [viewState]);

  const ensureDeviceId = () => {
    let storedId = localStorage.getItem('device_id');
    if (!storedId) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      // تنسيق STD مطابق للصورة
      storedId = 'STD-' + array[0].toString(16).toUpperCase().padStart(8, '0');
      localStorage.setItem('device_id', storedId);
    }
    setDeviceId(storedId);
    return storedId;
  };

  const checkStatus = () => {
    ensureDeviceId();
    
    // أولاً: تحقق من الاشتراك الفعلي
    const grades = [GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12];
    let hasAnySubscription = false;
    
    for (const g of grades) {
      const expiry = localStorage.getItem(`subscription_expiry_${g}`);
      if (expiry && new Date(expiry) > new Date()) {
        hasAnySubscription = true;
        break;
      }
    }

    // إذا كان هناك اشتراك لأي صف، نسمح بالدخول (أو يمكن تخصيصها لكل صف)
    if (currentGrade) {
      const specificExpiry = localStorage.getItem(`subscription_expiry_${currentGrade}`);
      if (specificExpiry && new Date(specificExpiry) > new Date()) {
        setViewState('hidden');
        return;
      }
    }

    // ثانياً: تحقق من الفترة التجريبية
    let trialStartStr = localStorage.getItem('trial_start_date');
    if (!trialStartStr) {
        trialStartStr = new Date().toISOString();
        localStorage.setItem('trial_start_date', trialStartStr);
    }

    const trialStartDate = new Date(trialStartStr);
    const now = new Date();
    const diffHours = (now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60);

    if (diffHours >= 48) {
        setLockReason('trial_ended');
        setViewState('locked');
    } else {
        setViewState('hidden');
    }
  };

  const handleActivate = () => {
    const code = inputCode.trim().toUpperCase().replace(/\s/g, '');
    const expectedCode = btoa(deviceId + SALT).substring(0, 12).toUpperCase();

    if (code === expectedCode) {
      const gradeToActivate = selectedGrade || currentGrade || GradeLevel.GRADE_12;
      const now = new Date();
      now.setDate(now.getDate() + 30); 
      localStorage.setItem(`subscription_expiry_${gradeToActivate}`, now.toISOString());
      alert(`تم تفعيل "المعلم الذكي" بنجاح لمدة 30 يوم!`);
      window.location.reload(); 
    } else {
      setError("كود التفعيل غير صحيح لهذا الجهاز.");
    }
  };

  const handleWhatsAppClick = () => {
    const message = `طلب كود تفعيل المعلم الذكي%0aالمعرف: ${deviceId}%0aالصف: ${selectedGrade || 'غير محدد'}`;
    window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${message}`, '_blank');
  };

  if (viewState === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 font-sans text-right" dir="rtl">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        {/* زر الإغلاق يظهر فقط في حالة الترقية اليدوية وليس القفل الإجباري */}
        {viewState === 'manual' && onClose && (
            <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
            </button>
        )}

        {/* الرأس - مطابق للصورة */}
        <div className="pt-10 pb-6 px-6 text-center">
           <h2 className="text-3xl font-black text-slate-800 mb-1">تفعيل المعلم الذكي</h2>
           <p className="text-slate-500 text-sm font-bold">نظام التشفير الفردي للجهاز (صلاحية 30 يوم)</p>
        </div>

        <div className="px-8 pb-10 space-y-6">
           {/* العرض الخاص - مطابق للصورة */}
           <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex flex-col">
                 <span className="text-[10px] text-slate-400 font-bold line-through decoration-red-400">300 جنيه</span>
                 <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-amber-700">90 ج.م / 30 يوم</span>
                 </div>
              </div>
              <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5">
                 <BadgePercent size={14} />
                 <span>عرض خاص (خصم 70%):</span>
              </div>
           </div>

           {/* معرف الجهاز - مطابق للصورة */}
           <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 mr-2">معرف الجهاز الخاص بك:</label>
              <div className="bg-[#1e293b] p-4 rounded-2xl flex items-center justify-between shadow-inner group">
                  <code className="text-xl font-mono font-black text-emerald-400 tracking-wider">
                    {deviceId}
                  </code>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(deviceId);
                        alert("تم نسخ المعرف!");
                    }} 
                    className="p-2.5 bg-slate-700 text-white hover:bg-slate-600 rounded-xl transition-all active:scale-90"
                  >
                    <Copy size={18}/>
                  </button>
              </div>
           </div>

           {/* زر الطلب الأخضر - مطابق للصورة */}
           <button 
            onClick={handleWhatsAppClick}
            className="w-full bg-[#2ecc71] hover:bg-[#27ae60] text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3 text-lg"
          >
            <Send size={22} className="rotate-[-20deg]" />
            <span>طلب كود التفعيل (90 جنيه)</span>
          </button>
           
           {/* إدخال الكود - مطابق للصورة */}
           <div className="space-y-4 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-4 text-xs font-bold text-slate-300">أدخل الكود بالأسفل</span></div>
              </div>

              <input 
                type="text" 
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="block w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-center font-mono text-2xl uppercase tracking-[0.3em] text-slate-700 placeholder:text-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                placeholder="X X X X - X X X X - X X X X"
              />

              <button 
                onClick={handleActivate}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-lg"
              >
                تفعيل الاشتراك الآن
              </button>
              
              {error && (
                <div className="text-red-500 text-xs font-bold text-center animate-bounce">
                    {error}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
