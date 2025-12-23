
import React, { useState, useEffect } from 'react';
import { Lock, Clock, CheckCircle, Send, AlertTriangle, Copy, BadgePercent, X, Star, Smartphone } from 'lucide-react';
import { GradeLevel } from '../types';

const SALT = "SMART_EDU_EGYPT_2026"; 
const ADMIN_PHONE_NUMBER = "201221746554"; // رقمك

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
      const array = new Uint32Array(2);
      window.crypto.getRandomValues(array);
      storedId = 'APP-' + array[0].toString(16).toUpperCase().padStart(4, '0') + '-' + array[1].toString(16).toUpperCase().padStart(4, '0');
      localStorage.setItem('device_id', storedId);
    }
    setDeviceId(storedId);
    return storedId;
  };

  const checkStatus = () => {
    ensureDeviceId();
    if (!currentGrade) {
        setViewState('hidden');
        return;
    }

    const subscriptionKey = `subscription_expiry_${currentGrade}`;
    const subscriptionExpiry = localStorage.getItem(subscriptionKey);
    
    if (subscriptionExpiry) {
        const expiryDate = new Date(subscriptionExpiry);
        const now = new Date();
        
        if (now < expiryDate) {
            setViewState('hidden');
            return;
        } else {
            setLockReason('subscription_ended');
            setViewState('locked');
            return;
        }
    }

    let trialStartStr = localStorage.getItem('trial_start_date');
    if (!trialStartStr) {
        trialStartStr = new Date().toISOString();
        localStorage.setItem('trial_start_date', trialStartStr);
    }

    const trialStartDate = new Date(trialStartStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);

    // التحقق من انتهاء الـ 48 ساعة
    if (diffHours >= 48) {
        setLockReason('trial_ended');
        setViewState('locked');
    } else {
        setViewState('hidden');
    }
  };

  const handleActivate = () => {
    const code = inputCode.trim().toUpperCase();
    const expectedCode = btoa(deviceId + SALT).substring(0, 12).toUpperCase();

    if (code === expectedCode) {
      if (!selectedGrade) {
          setError("يرجى اختيار الصف الدراسي أولاً");
          return;
      }
      const now = new Date();
      now.setDate(now.getDate() + 30); 
      const subscriptionKey = `subscription_expiry_${selectedGrade}`;
      localStorage.setItem(subscriptionKey, now.toISOString());
      alert(`تم التفعيل بنجاح!`);
      window.location.reload(); 
    } else {
      setError("كود التفعيل غير صحيح لهذا الجهاز.");
    }
  };

  const handleWhatsAppClick = () => {
    if (!selectedGrade) {
        alert("من فضلك اختر الصف الدراسي أولاً");
        return;
    }
    const message = `طلب اشتراك جديد%0aالصف: ${selectedGrade}%0aرقم الجهاز: ${deviceId}`;
    window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${message}`, '_blank');
  };

  if (viewState === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 font-sans dir-rtl text-right overflow-hidden" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300 relative">
        
        {viewState === 'manual' && onClose && (
            <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
            </button>
        )}

        <div className={`p-6 text-center border-b ${
            lockReason === 'trial_ended' ? 'bg-amber-50' : 'bg-indigo-50'
        }`}>
           <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
               lockReason === 'trial_ended' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
           }`}>
             {lockReason === 'trial_ended' ? <Clock size={24} /> : <Star size={24} />}
           </div>
           
           <h2 className="text-xl font-black text-slate-800">
               {lockReason === 'trial_ended' ? 'انتهت الفترة التجريبية' : 'تفعيل الحساب الممتاز'}
           </h2>
           <p className="text-slate-500 text-sm mt-1">
               {lockReason === 'trial_ended' 
                ? 'انتهت الـ 48 ساعة المجانية. اشترك الآن لمتابعة التفوق.' 
                : 'استمتع بكافة مميزات المعلم الذكي بلا حدود.'}
           </p>
        </div>

        <div className="p-6 space-y-5">
           <div>
               <label className="block text-xs font-bold text-slate-700 mb-1.5">1. اختر الصف الدراسي:</label>
               <select 
                  value={selectedGrade} 
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700"
               >
                   <option value="">-- اختر الصف --</option>
                   <option value="الصف الأول الثانوي">الصف الأول الثانوي (خصم 70%)</option>
                   <option value="الصف الثاني الثانوي">الصف الثاني الثانوي (خصم 70%)</option>
                   <option value="الصف الثالث الثانوي">الصف الثالث الثانوي (خصم 70%)</option>
               </select>
           </div>

           <div>
               <label className="block text-xs font-bold text-slate-700 mb-1.5">2. أرسل رقم جهازك للمسؤول:</label>
               <div className="bg-slate-800 p-3 rounded-xl flex items-center justify-between mb-3 shadow-inner">
                  <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 font-bold block">رقم الجهاز (System ID):</span>
                      <code className="text-xs font-mono font-black text-emerald-400 block truncate">{deviceId}</code>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(deviceId)} className="p-2 text-white hover:bg-slate-700 rounded-lg"><Copy size={16}/></button>
               </div>

               <button 
                onClick={handleWhatsAppClick}
                disabled={!selectedGrade}
                className={`w-full font-bold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                    !selectedGrade ? 'bg-slate-300 text-slate-500' : 'bg-[#25D366] text-white'
                }`}
              >
                <Send size={18} />
                <span>إرسال طلب التفعيل (واتساب)</span>
              </button>
           </div>
           
           <div className="border-t border-slate-100 pt-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">3. أدخل كود التفعيل:</label>
              <div className="space-y-3">
                 <input 
                   type="text" 
                   value={inputCode}
                   onChange={(e) => setInputCode(e.target.value)}
                   className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-center font-mono text-lg uppercase tracking-widest"
                   placeholder="XXXX-XXXX-XXXX"
                 />
                 <button 
                    onClick={handleActivate}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg"
                 >
                    تفعيل الاشتراك الآن
                 </button>
              </div>
              {error && (
                    <div className="mt-2 text-red-600 text-[10px] font-bold text-center bg-red-50 p-1.5 rounded-lg border border-red-100 flex items-center justify-center gap-1">
                        <AlertTriangle size={12} />
                        {error}
                    </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};
