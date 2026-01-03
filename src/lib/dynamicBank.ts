
import { Subject, GradeLevel } from '../types';

export const ACTIVATION_SALT = "SMART_EDU_EGYPT_2026";

export function generateActivationCode(deviceId: string): string {
  if (!deviceId) return "";
  const cleanId = deviceId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const input = cleanId + ACTIVATION_SALT;
  const base64 = btoa(input);
  const code = base64.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 12);
  return code;
}

export interface DynamicQuestion {
  question: string;
  answer: string;
  subject: string;
  grade: string;
  timestamp: number;
  timesAsked: number;
  askedBy: string[];
  category: 'explanation' | 'exam' | 'summary' | 'general';
}

export class DynamicQuestionBank {
  private static STORAGE_KEY = 'edu_dynamic_bank_v2';

  static getAll(): DynamicQuestion[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async search(query: string, subject: string): Promise<DynamicQuestion | null> {
    const bank = this.getAll();
    const normalizedQuery = query.trim().toLowerCase();
    
    // محاولة المطابقة التامة أولاً
    const exactMatch = bank.find(item => 
      item.subject === subject && 
      (normalizedQuery.includes(item.question.toLowerCase()) || item.question.toLowerCase().includes(normalizedQuery))
    );
    if (exactMatch) return exactMatch;

    // محاولة مطابقة الكلمات المفتاحية (للامتحانات والملخصات)
    if (normalizedQuery.includes('امتحان') || normalizedQuery.includes('نموذج') || normalizedQuery.includes('عصارة') || normalizedQuery.includes('ملخص')) {
        return bank.find(item => 
            item.subject === subject && 
            (item.question.toLowerCase().includes('امتحان') || item.question.toLowerCase().includes('عصارة'))
        ) || null;
    }

    return null;
  }

  static async add(question: string, answer: string, subject: string, grade: string, deviceId: string) {
    const bank = this.getAll();
    
    // تحديد الفئة بناءً على محتوى السؤال أو الإجابة
    let category: DynamicQuestion['category'] = 'general';
    const q = question.toLowerCase();
    if (q.includes('امتحان') || q.includes('نموذج')) category = 'exam';
    else if (q.includes('عصارة') || q.includes('ملخص') || q.includes('مذكرة')) category = 'summary';
    else if (q.includes('اشرح') || q.includes('شرح')) category = 'explanation';

    const existingIdx = bank.findIndex(i => i.question === question && i.subject === subject);
    
    if (existingIdx !== -1) {
      if (!bank[existingIdx].askedBy.includes(deviceId)) {
        bank[existingIdx].askedBy.push(deviceId);
        bank[existingIdx].timesAsked++;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bank));
      }
    } else {
      bank.unshift({ 
        question, 
        answer, 
        subject, 
        grade, 
        timestamp: Date.now(), 
        timesAsked: 1, 
        askedBy: [deviceId],
        category
      });
      // الاحتفاظ بآخر 100 عنصر فقط لتوفير المساحة
      const limitedBank = bank.slice(0, 100);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedBank));
    }
  }
  
  // Fix: Added popularCount to stats object for dashboard analytics
  static async getStats() {
      const bank = this.getAll();
      return { 
          totalQuestions: bank.length, 
          examsCount: bank.filter(q => q.category === 'exam').length,
          summariesCount: bank.filter(q => q.category === 'summary').length,
          popularCount: bank.filter(q => q.timesAsked > 1).length
      };
  }

  // Fix: Implemented getPopular method to retrieve trending questions
  static async getPopular(limit: number = 8): Promise<DynamicQuestion[]> {
      const bank = this.getAll();
      return [...bank]
        .sort((a, b) => b.timesAsked - a.timesAsked)
        .slice(0, limit);
  }

  static async getByCategory(category: string): Promise<DynamicQuestion[]> {
      const bank = this.getAll();
      return bank.filter(q => q.category === category);
  }
}
