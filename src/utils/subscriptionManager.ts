
import React, { useState, useEffect } from 'react';
import { Lock, Clock, CheckCircle, Send, AlertTriangle, Copy, X, Smartphone, ShieldCheck, BadgePercent } from 'lucide-react';
import { GradeLevel } from '../types';
import { getStableDeviceId, activateGrade } from '../utils/subscriptionManager';

const ADMIN_PHONE_NUMBER = "201221746554";

interface SubscriptionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  currentGrade?: GradeLevel | null;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ forceOpen, onClose, currentGrade }) => {
  const [deviceId, setDeviceId] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  useEffect(() => {
    setDeviceId(getStableDeviceId());
    if (currentGrade) setSelectedGrade(currentGrade);
  }, [currentGrade]);

  const handleActivate = () => {
    setError('');
    setSuccess('');
    
    if (!selectedGrade) {
      setError("يرجى اختيار الصف الدراسي أولاً");
      return;
    }

    const result = activateGrade(selectedGrade, inputCode);
    
    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const handleWhatsAppClick = () => {
    if (!selectedGrade) {
      alert("من فضلك اختر الصف الدراسي أولاً");
      return;
    }
    const message = `طلب اشتراك جديد (نظام 30 يوم)%0aالصف: ${selectedGrade}%0aرقم الجهاز: ${deviceId}`;
    window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300 relative">
        
        {onClose && (
          <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        )}

        <div className="p-8 text-center bg-gradient-to-b from-indigo-50 to-white border-b border-slate-100">
           <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg rotate-3">
             <ShieldCheck size={32} />
           </div>
           
           <h2 className="text-2xl font-black text-slate-800">تفعيل المحتوى الممتاز</h2>
           <p className="text-slate-500 text-sm mt-2 font-medium">نظام اشتراك فردي - صالح لمدة 30 يوماً لهذا الجهاز</p>
        </div>

        <div className="p-8 space-y-5">
           <div className="space-y-2">
               <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                 <div className="w-5 h-5 bg-indigo-100 rounded text-indigo-600 flex items-center justify-center text-[10px]">1</div>
                 اختر الصف المراد تفعيله:
               </label>
               <select 
                  value={selectedGrade} 
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 focus:border-indigo-500 focus:ring-0 transition-all appearance-none"
               >
                   <option value="">-- اختر الصف الدراسي --</option>
                   <option value={GradeLevel.GRADE_10}>{GradeLevel.GRADE_10}</option>
                   <option value={GradeLevel.GRADE_11}>{GradeLevel.GRADE_11}</option>
                   <option value={GradeLevel.GRADE_12}>{GradeLevel.GRADE_12}</option>
               </select>

               <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BadgePercent className="text-amber-600" size={20} />
                    <span className="text-xs font-black text-amber-800">عرض خاص (خصم 70%):</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] line-through block">300 جنيه</span>
                    <span className="text-lg font-black text-amber-700">90 ج.م / 30 يوم</span>
                  </div>
               </div>
           </div>

           <div className="space-y-2">
               <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                 <div className="w-5 h-5 bg-indigo-100 rounded text-indigo-600 flex items-center justify-center text-[10px]">2</div>
                 معرف الجهاز الخاص بك:
               </label>
               <div className="bg-slate-900 p-4 rounded-2xl flex items-center justify-between shadow-inner group">
                  <code className="text-sm font-mono font-black text-emerald-400 truncate">{deviceId}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(deviceId);
                      alert("تم نسخ معرف الجهاز");
                    }} 
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Copy size={18}/>
                  </button>
               </div>
           </div>

           <div className="pt-2 space-y-4">
              <button 
                onClick={handleWhatsAppClick}
                className="w-full bg-[#25D366] hover:bg-[#1eb956] text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Send size={20} />
                <span>طلب كود التفعيل (90 جنيه)</span>
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[9px] font-bold uppercase tracking-widest">لديك كود؟ أدخله هنا</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <div className="space-y-3">
                 <input 
                   type="text" 
                   value={inputCode}
                   onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                   className="block w-full px-6 py-4 border-2 border-slate-200 rounded-2xl text-center font-mono text-xl uppercase tracking-[0.2em] focus:border-indigo-500 focus:bg-indigo-50/30 transition-all"
                   placeholder="XXXX-XXXX-XXXX"
                 />
                 <button 
                    onClick={handleActivate}
                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95"
                 >
                    تفعيل الاشتراك الآن
                 </button>
              </div>

              {error && (
                <div className="text-red-600 text-xs font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center gap-2 animate-shake">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {success && (
                <div className="text-emerald-600 text-xs font-bold text-center bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center justify-center gap-2">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
