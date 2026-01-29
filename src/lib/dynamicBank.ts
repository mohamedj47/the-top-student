import type { Subject, GradeLevel } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

export const ACTIVATION_SALT = 'SMART_EDU_EGYPT_2026';

/**
 * توليد كود التفعيل (آمن للـ Browser و Vercel)
 */
export function generateActivationCode(deviceId: string): string {
  if (!deviceId) return '';

  const cleanId = deviceId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');

  const input = cleanId + ACTIVATION_SALT;

  // بديل آمن لـ btoa
  const encoded =
    typeof window !== 'undefined'
      ? window.btoa(input)
      : Buffer.from(input).toString('base64');

  return encoded
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .substring(0, 12);
}

/* ===================== TYPES ===================== */

export interface DynamicQuestion {
  id?: string;
  question: string;
  answer: string;
  subject: string;
  grade: string;
  timestamp: number;
  timesAsked: number;
  askedBy: string[];
  category: 'explanation' | 'exam' | 'summary' | 'general';
}

/* ===================== BANK ===================== */

export class DynamicQuestionBank {
  private static STORAGE_KEY = 'edu_dynamic_bank_v2';

  static getAll(): DynamicQuestion[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /* ---------- Sync ---------- */
  static async syncWithCloud() {
    if (!isSupabaseConfigured() || !supabase) return;

    const localData = this.getAll();
    if (!localData.length) return;

    try {
      const { error } = await supabase
        .from('dynamic_questions')
        .upsert(
          localData.map(q => ({
            question: q.question,
            answer: q.answer,
            subject: q.subject,
            grade: q.grade,
            category: q.category,
            times_asked: q.timesAsked,
            metadata: { askedBy: q.askedBy }
          })),
          { onConflict: 'question' }
        );

      if (error) throw error;
      console.log('✅ Cloud Sync Successful');
    } catch (e) {
      console.error('❌ Cloud Sync Failed', e);
    }
  }

  /* ---------- Search ---------- */
  static async search(
    query: string,
    subject: string
  ): Promise<DynamicQuestion | null> {
    const bank = this.getAll();
    const normalized = query.trim().toLowerCase();

    const localMatch = bank.find(
      q =>
        q.subject === subject &&
        (q.question.toLowerCase().includes(normalized) ||
          normalized.includes(q.question.toLowerCase()))
    );

    if (localMatch) return localMatch;

    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('dynamic_questions')
        .select('*')
        .eq('subject', subject)
        .ilike('question', `%${normalized}%`)
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        question: data.question,
        answer: data.answer,
        subject: data.subject,
        grade: data.grade,
        timestamp: new Date(data.created_at).getTime(),
        timesAsked: data.times_asked,
        askedBy: data.metadata?.askedBy || [],
        category: data.category
      };
    } catch {
      return null;
    }
  }

  /* ---------- Add ---------- */
  static async add(
    question: string,
    answer: string,
    subject: string,
    grade: string,
    deviceId: string
  ) {
    const bank = this.getAll();

    let category: DynamicQuestion['category'] = 'general';
    const q = question.toLowerCase();
    if (q.includes('امتحان') || q.includes('نموذج')) category = 'exam';
    else if (q.includes('ملخص') || q.includes('مذكرة')) category = 'summary';
    else if (q.includes('اشرح') || q.includes('شرح')) category = 'explanation';

    const idx = bank.findIndex(
      i => i.question === question && i.subject === subject
    );

    if (idx !== -1) {
      if (!bank[idx].askedBy.includes(deviceId)) {
        bank[idx].askedBy.push(deviceId);
        bank[idx].timesAsked++;
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
    }

    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(bank.slice(0, 100))
    );

    if (!isSupabaseConfigured() || !supabase) return;

    await supabase.from('dynamic_questions').upsert(
      {
        question,
        answer,
        subject,
        grade,
        category,
        times_asked: idx !== -1 ? bank[idx].timesAsked : 1,
        metadata: {
          askedBy: idx !== -1 ? bank[idx].askedBy : [deviceId]
        }
      },
      { onConflict: 'question' }
    );
  }

  /* ---------- Stats ---------- */
  static getStats() {
    const bank = this.getAll();
    return {
      totalQuestions: bank.length,
      examsCount: bank.filter(q => q.category === 'exam').length,
      summariesCount: bank.filter(q => q.category === 'summary').length,
      popularCount: bank.filter(q => q.timesAsked > 1).length
    };
  }

  static getPopular(limit = 8): DynamicQuestion[] {
    return [...this.getAll()]
      .sort((a, b) => b.timesAsked - a.timesAsked)
      .slice(0, limit);
  }
}
