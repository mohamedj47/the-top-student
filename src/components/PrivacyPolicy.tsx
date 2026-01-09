import React from 'react';
import { Shield, X, Lock, Eye, Database, Globe } from 'lucide-react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 font-sans text-right" dir="rtl">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Shield size={24} />
            <h2 className="text-xl font-black">سياسة الخصوصية - المعلم الذكي</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 text-slate-700 leading-relaxed">
          <section>
            <div className="flex items-center gap-2 mb-4 text-indigo-600">
              <Eye size={20} />
              <h3 className="text-lg font-black">1. ما هي البيانات التي نجمعها؟</h3>
            </div>
            <p className="text-sm font-bold">
              نقوم بجمع معرف الجهاز الفريد (Device ID) فقط لضمان تفعيل الاشتراك على جهازك وحمايته من السرقة. لا نقوم بالوصول إلى رسائلك، صورك الشخصية، أو جهات اتصالك.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-indigo-600">
              <Database size={20} />
              <h3 className="text-lg font-black">2. كيف نستخدم بياناتك؟</h3>
            </div>
            <p className="text-sm font-bold">
              تُستخدم البيانات فقط لـ:
              <ul className="list-disc mr-6 mt-2 space-y-1">
                <li>تفعيل ميزات الذكاء الاصطناعي المدفوعة.</li>
                <li>توفير ميزة "بنك الطالب" للعمل بدون إنترنت.</li>
                <li>تحسين جودة الردود التعليمية.</li>
              </ul>
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-indigo-600">
              <Lock size={20} />
              <h3 className="text-lg font-black">3. أمان البيانات</h3>
            </div>
            <p className="text-sm font-bold">
              بياناتك مشفرة بالكامل ولا يتم مشاركتها مع أي طرف ثالث أو شركات إعلانية. نحن نلتزم بأعلى معايير حماية البيانات التعليمية.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-indigo-600">
              <Globe size={20} />
              <h3 className="text-lg font-black">4. حقوق المستخدم</h3>
            </div>
            <p className="text-sm font-bold">
              يمكنك في أي وقت مسح بياناتك المخزنة محلياً من خلال إعدادات التطبيق أو حذف ذاكرة التخزين المؤقت للمتصفح.
            </p>
          </section>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all"
          >
            فهمت وأوافق
          </button>
        </div>
      </div>
    </div>
  );
};
