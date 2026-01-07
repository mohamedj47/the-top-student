
import { Subject, GradeLevel } from '../types';
import { supabase } from './supabase';

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
  isSynced?: boolean;
}

export class DynamicQuestionBank {
  private static STORAGE_KEY = 'edu_dynamic_bank_v2';

  static getAll(): DynamicQuestion[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // البحث في السحابة أولاً لخدمة الـ 10,000 طالب
  static async search(query: string, subject: string): Promise<DynamicQuestion | null> {
    const normalizedQuery = query.trim().toLowerCase();
    
    // 1. محاولة جلب الرد من Supabase (مشروع cloud-study-hub)
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('dynamic_questions')
                .select('*')
                .eq('subject', subject)
                .ilike('question', `%${normalizedQuery}%`)
                .order('times_asked', { ascending: false })
                .limit(1)
                .single();
            
            if (data && !error) {
                console.log("☁️ Found in Cloud Bank!");
                // تحديث العداد في السحابة
                await supabase.rpc('increment_question_asked', { q_id: data.id });
                return data as DynamicQuestion;
            }
        } catch (e) {
            console.debug("Cloud search skipped");
        }
    }

    // 2. البحث المحلي كاحتياطي
    const bank = this.getAll();
    const exactMatch = bank.find(item => 
      item.subject === subject && 
      (normalizedQuery.includes(item.question.toLowerCase()) || item.question.toLowerCase().includes(normalizedQuery))
    );
    return exactMatch || null;
  }

  static async add(question: string, answer: string, subject: string, grade: string, deviceId: string) {
    const bank = this.getAll();
    let category: DynamicQuestion['category'] = 'general';
    const q = question.toLowerCase();
    if (q.includes('امتحان') || q.includes('نموذج')) category = 'exam';
    else if (q.includes('عصارة') || q.includes('ملخص')) category = 'summary';
    else if (q.includes('اشرح')) category = 'explanation';

    // حفظ محلي سريع
    bank.unshift({ 
      question, answer, subject, grade, 
      timestamp: Date.now(), timesAsked: 1, 
      askedBy: [deviceId], category, isSynced: false
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bank.slice(0, 50)));

    // مزامنة مع cloud-study-hub في الخلفية
    if (supabase) {
        try {
            await supabase.from('dynamic_questions').upsert({
                question,
                answer,
                subject,
                grade,
                category,
                last_asked_at: new Date().toISOString()
            }, { onConflict: 'question,subject' });
        } catch (e) {
            console.error("Cloud sync failed");
        }
    }
  }

  static async getCloudStats() {
      if (!supabase) return { total: 0, students: 0 };
      const { count } = await supabase.from('dynamic_questions').select('*', { count: 'exact', head: true });
      return { total: count || 0, students: 10000 }; // الـ 10,000 طالب المستهدفين
  }

  // Added getStats to return question count and popular metrics for the landing page
  static async getStats(): Promise<{ totalQuestions: number; popularCount: number }> {
    const local = this.getAll();
    if (!supabase) return { totalQuestions: local.length, popularCount: local.filter(q => (q.timesAsked || 0) > 5).length };
    
    try {
      const { count: totalQuestions } = await supabase.from('dynamic_questions').select('*', { count: 'exact', head: true });
      const { count: popularCount } = await supabase.from('dynamic_questions').select('*', { count: 'exact', head: true }).gt('times_asked', 5);
      return { totalQuestions: totalQuestions || 0, popularCount: popularCount || 0 };
    } catch (e) {
      return { totalQuestions: local.length, popularCount: local.filter(q => (q.timesAsked || 0) > 5).length };
    }
  }

  // Added getPopular to retrieve trending questions across all users
  static async getPopular(limit: number): Promise<DynamicQuestion[]> {
    if (!supabase) {
      return this.getAll()
        .sort((a, b) => (b.timesAsked || 0) - (a.timesAsked || 0))
        .slice(0, limit);
    }
    
    try {
      const { data } = await supabase
        .from('dynamic_questions')
        .select('*')
        .order('times_asked', { ascending: false })
        .limit(limit);
      return (data as any) || [];
    } catch (e) {
      return this.getAll()
        .sort((a, b) => (b.timesAsked || 0) - (a.timesAsked || 0))
        .slice(0, limit);
    }
  }

  static async getGlobalFeed(subject: string): Promise<DynamicQuestion[]> {
      if (!supabase) return this.getAll().filter(q => q.subject === subject);
      const { data } = await supabase
        .from('dynamic_questions')
        .select('*')
        .eq('subject', subject)
        .order('last_asked_at', { ascending: false })
        .limit(20);
      return (data as any) || [];
  }
}
