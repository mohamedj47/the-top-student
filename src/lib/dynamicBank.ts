
import { Subject, GradeLevel } from '../types';

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

  static async save(data: DynamicQuestion) {
    const bank = this.getAll();
    bank.push(data);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bank.slice(-500))); // حفظ آخر 500 إجابة
  }

  static getAll(): DynamicQuestion[] {
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
      const newItem: DynamicQuestion = {
        question,
        answer,
        subject,
        grade,
        timestamp: Date.now(),
        timesAsked: 1,
        askedBy: [deviceId]
      };
      bank.push(newItem);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bank));
    }
  }
  
  static async getStats() {
      const bank = this.getAll();
      return {
          totalQuestions: bank.length,
          popularCount: bank.filter(q => q.timesAsked > 5).length
      };
  }

  static async getPopular(limit = 5) {
      const bank = this.getAll();
      return bank.sort((a, b) => b.timesAsked - a.timesAsked).slice(0, limit);
  }
}
