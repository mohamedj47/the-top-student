
import { Subject, GradeLevel } from '../types';

export const ACTIVATION_SALT = "SMART_EDU_EGYPT_2026";

/**
 * الخوارزمية الموحدة لتوليد كود التفعيل
 */
export function generateActivationCode(deviceId: string): string {
  if (!deviceId) return "";
  // 1. تنظيف المعرف تماماً (حروف كبيرة، حذف مسافات، حذف أي رموز غريبة)
  const cleanId = deviceId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  // 2. دمج المعرف مع الملح السري
  const input = cleanId + ACTIVATION_SALT;
  // 3. التشفير باستخدام Base64
  const base64 = btoa(input);
  // 4. استخراج أول 12 حرف ورقم فقط (بدون رموز)
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
  askedBy: string[]; // Device IDs
}

export class DynamicQuestionBank {
  private static STORAGE_KEY = 'edu_dynamic_bank';

  static getAll(): DynamicQuestion[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static async search(query: string, subject: string): Promise<DynamicQuestion | null> {
    const bank = this.getAll();
    const normalizedQuery = query.trim().toLowerCase();
    return bank.find(item => 
      item.subject === subject && 
      (normalizedQuery.includes(item.question.toLowerCase()) || item.question.toLowerCase().includes(normalizedQuery))
    ) || null;
  }

  static async searchPartial(query: string, subject: string): Promise<DynamicQuestion | null> {
    const bank = this.getAll();
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return null;
    return bank.find(item => 
      item.subject === subject && words.some(word => item.question.toLowerCase().includes(word))
    ) || null;
  }

  static async add(question: string, answer: string, subject: string, grade: string, deviceId: string) {
    const bank = this.getAll();
    const existing = bank.find(i => i.question === question);
    if (existing) {
      if (!existing.askedBy.includes(deviceId)) {
        existing.askedBy.push(deviceId);
        existing.timesAsked++;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bank));
      }
    } else {
      bank.push({ question, answer, subject, grade, timestamp: Date.now(), timesAsked: 1, askedBy: [deviceId] });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bank));
    }
  }
  
  static async getStats() {
      const bank = this.getAll();
      return { totalQuestions: bank.length, popularCount: bank.filter(q => q.timesAsked > 5).length };
  }

  static async getPopular(limit = 5) {
      const bank = this.getAll();
      return bank.sort((a, b) => b.timesAsked - a.timesAsked).slice(0, limit);
  }
}
