
import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, Send, AlertTriangle, Copy, X, BadgePercent } from 'lucide-react';
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
    if (!selectedGrade) { setError("يرجى اختيار الصف الدراسي"); return; }
    const result = activateGrade(selectedGrade, inputCode);
    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setError(result.message);
    }
  };

  const handleWhatsAppClick = () => {
    if (!selectedGrade) { alert("اختر الصف الدراسي أولاً"); return; }
    const message = `طلب تفعيل مادة (نظام 30 يوم)%0aالصف: ${selectedGrade}%0aرقم الجهاز: ${deviceId}`;
    window.open(`https://wa.me/${ADMIN_PHONE_NUMBER}?text=${message}`, '_blank');
  };

  if (!forceOpen && !currentGrade) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300 relative">
        
        {onClose && (
          <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 z-10 transition-colors">
            <X size={20} />
          </button>
        )}

        <div className="p-10 text-center bg-gradient-to-b from-indigo-50 to-white border-b border-slate-100">
             <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-4 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
               <Lock size={40} />
             </div>
             <h2 className="text-3xl font-black text-slate-800">تفعيل المعلم الذكي</h2>
             <p className="text-slate-500 text-sm mt-2 font-bold">نظام التشفير الفردي للجهاز (صلاحية 30 يوم)</p>
        </div>

        <div className="p-8 space-y-6">
             <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <BadgePercent className="text-amber-600" size={24} />
                  </div>
                  <span className="text-sm font-black text-amber-900">عرض خاص (خصم 70%):</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xs line-through block">300 جنيه</span>
                  <span className="text-xl font-black text-amber-700">90 ج.م / 30 يوم</span>
                </div>
             </div>

             <div className="space-y-3">
                 <label className="text-xs font-black text-slate-700 block pr-1">معرف الجهاز الخاص بك:</label>
                 <div className="bg-slate-900 p-5 rounded-2xl flex items-center justify-between shadow-xl border border-slate-800">
                    <code className="text-base font-mono font-black text-emerald-400 tracking-wider truncate">{deviceId}</code>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(deviceId); alert("تم نسخ معرف الجهاز"); }} 
                      className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all active:scale-90"
                    >
                      <Copy size={20}/>
                    </button>
                 </div>
             </div>

             <div className="pt-2 space-y-5">
                <button onClick={handleWhatsAppClick} className="w-full bg-[#25D366] hover:bg-[#1eb956] text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]">
                  <Send size={22} />
                  <span className="text-lg">طلب كود التفعيل (90 جنيه)</span>
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black tracking-widest uppercase">أدخل الكود بالأسفل</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <div className="space-y-4">
                   <input 
                     type="text" 
                     value={inputCode}
                     onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                     className="block w-full px-6 py-5 border-2 border-slate-200 rounded-2xl text-center font-mono text-2xl uppercase tracking-[0.3em] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-inner"
                     placeholder="XXXX-XXXX-XXXX"
                   />
                   <button onClick={handleActivate} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl shadow-2xl text-xl transition-all active:scale-95">
                      تفعيل الاشتراك الآن
                   </button>
                </div>

                {error && <div className="text-red-600 text-sm font-black text-center bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-center gap-2 animate-shake"><AlertTriangle size={18} />{error}</div>}
                {success && <div className="text-emerald-600 text-sm font-black text-center bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-center gap-2"><CheckCircle size={18} />{success}</div>}
             </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
           <p className="text-[10px] text-slate-400 font-bold">نظام تأمين الطالب المتفوق - جميع الحقوق محفوظة 2026</p>
        </div>
      </div>
    </div>
  );
};
