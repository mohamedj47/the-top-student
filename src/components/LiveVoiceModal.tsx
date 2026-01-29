// src/components/LiveVoiceModal.tsx
import React from 'react';
import { GradeLevel, Subject } from '../types';
import { X } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade: GradeLevel;
  subject: Subject;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose, grade, subject }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <header className="flex justify-between items-center p-4 border-b border-slate-200">
          <h3 className="font-bold text-lg">الصوت الحي - {subject} {grade}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </header>
        <div className="p-4">
          <p className="text-sm text-slate-700">هنا سيكون التحكم بالصوت الحي وواجهة المعلم الذكي.</p>
          {/* يمكنك إضافة مكونات التحكم بالصوت أو Streaming هنا */}
        </div>
      </div>
    </div>
  );
};
