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
  private static STORAGE_KEY = 'edu_dynamic_bank_v2';

  /**
   * استرجاع جميع البيانات المخزنة محلياً (Safe)
   */
  static getAll(): DynamicQuestion[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * بحث دقيق (Exact + Includes + Reverse Includes)
   */
  static async search(
    query: string,
    subject: string
  ): Promise<DynamicQuestion | null> {
    const bank = this.getAll();
    const normalizedQuery = query.trim().toLowerCase();

    return (
      bank.find(
        item =>
          item.subject === subject &&
          (
            normalizedQuery === item.question.toLowerCase() ||
            item.question.toLowerCase().includes(normalizedQuery) ||
            normalizedQuery.includes(item.question.toLowerCase())
          )
      ) || null
    );
  }

  /**
   * بحث جزئي ذكي (Offline Friendly – Best Match)
   */
  static async searchPartial(
    query: string,
    subject: string
  ): Promise<DynamicQuestion | null> {
    const bank = this.getAll();
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (words.length === 0) return null;

    let bestMatch: DynamicQuestion | null = null;
    let maxMatches = 0;

    for (const item of bank) {
      if (item.subject !== subject) continue;

      const matchCount = words.filter(word =>
        item.question.toLowerCase().includes(word)
      ).length;

      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestMatch = item;
      }
    }

    // كلمة واحدة كفاية للأوفلاين عشان يفضل التطبيق usable
    return maxMatches >= 1 ? bestMatch : null;
  }

  /**
   * إضافة / تحديث سؤال (Aggressive Learning Cache)
   */
  static async add(
    question: string,
    answer: string,
    subject: string,
    grade: string,
    deviceId: string
  ) {
    const bank = this.getAll();

    const existingIdx = bank.findIndex(
      i =>
        i.subject === subject &&
        i.question.toLowerCase() === question.toLowerCase()
    );

    if (existingIdx !== -1) {
      const existing = bank[existingIdx];

      if (!existing.askedBy.includes(deviceId)) {
        existing.askedBy.push(deviceId);
        existing.timesAsked++;
        localStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(bank)
        );
      }
    } else {
      const newItem: DynamicQuestion = {
        question,
        answer,
        subject,
        grade,
        timestamp: Date.now(),
        timesAsked: 1,
        askedBy: [deviceId],
      };

      // الحفاظ على الأداء: آخر 500 سؤال فقط
      const updatedBank = [newItem, ...bank].slice(0, 500);

      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedBank)
      );
    }
  }

  /**
   * إحصائيات عامة
   */
  static async getStats() {
    const bank = this.getAll();
    return {
      totalQuestions: bank.length,
      popularCount: bank.filter(q => q.timesAsked > 2).length,
    };
  }

  /**
   * أكثر الأسئلة شيوعًا
   */
  static async getPopular(limit = 5) {
    const bank = this.getAll();
    return [...bank]
      .sort((a, b) => b.timesAsked - a.timesAsked)
      .slice(0, limit);
  }
}
