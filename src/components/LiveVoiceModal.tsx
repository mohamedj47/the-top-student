// src/components/LiveVoiceModal.tsx
import React, { useEffect } from 'react';
import { GradeLevel, Subject } from '../types';
import { X } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade: GradeLevel;
  subject: Subject;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose, grade, subject }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-4">المعلم الذكي – الصف {grade}</h2>
        <p className="text-sm text-gray-600 mb-6">مادة: {subject}</p>

        <div className="flex flex-col gap-3">
          <p className="text-gray-800 font-medium">اضغط على الميكروفون للتحدث مباشرة مع المعلم.</p>
          <button className="bg-indigo-600 text-white py-3 rounded-xl shadow-md hover:bg-indigo-700 transition-all">
            🎤 بدء التحدث
          </button>
        </div>
      </div>
    </div>
  );
};
