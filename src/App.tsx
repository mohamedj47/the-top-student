
import { Subject, GradeLevel } from '../types';
import { supabase, isSupabaseConfigured } from "./supabase";
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

export class DynamicQuestionBank {
  private static STORAGE_KEY = 'edu_dynamic_bank_v2';

  static getAll(): DynamicQuestion[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * مزامنة البيانات المحلية مع Supabase
   */
  static async syncWithCloud() {
    if (!isSupabaseConfigured()) return;
    
    const localData = this.getAll();
    if (localData.length === 0) return;

    try {
      // رفع الأسئلة الجديدة التي لم ترفع بعد
      const { data, error } = await supabase
        .from('dynamic_questions')
        .upsert(localData.map(q => ({
          question: q.question,
          answer: q.answer,
          subject: q.subject,
          grade: q.grade,
          category: q.category,
          times_asked: q.timesAsked,
          metadata: { askedBy: q.askedBy }
        })), { onConflict: 'question' });
        
      if (error) throw error;
      console.log('✅ Cloud Sync Successful');
    } catch (e) {
      console.error('❌ Cloud Sync Failed:', e);
    }
  }

  static async search(query: string, subject: string): Promise<DynamicQuestion | null> {
    const bank = this.getAll();
    const normalizedQuery = query.trim().toLowerCase();
    
    // أولاً: البحث المحلي للسرعة
    const exactMatch = bank.find(item => 
      item.subject === subject && 
      (normalizedQuery.includes(item.question.toLowerCase()) || item.question.toLowerCase().includes(normalizedQuery))
    );
    if (exactMatch) return exactMatch;

    // ثانياً: إذا كان السحاب مهيأ، ابحث فيه
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase
                .from('dynamic_questions')
                .select('*')
                .eq('subject', subject)
                .ilike('question', `%${normalizedQuery}%`)
                .limit(1)
                .single();
            
            if (data && !error) {
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
            }
        } catch (e) {}
    }

    return null;
  }

  static async add(question: string, answer: string, subject: string, grade: string, deviceId: string) {
    const bank = this.getAll();
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
      }
    } else {
      bank.unshift({ 
        question, answer, subject, grade, 
        timestamp: Date.now(), timesAsked: 1, askedBy: [deviceId], category
      });
    }
    
    const limitedBank = bank.slice(0, 100);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedBank));

    // محاولة الحفظ في السحابة فوراً
    if (isSupabaseConfigured()) {
        await supabase.from('dynamic_questions').upsert({
            question, answer, subject, grade, category,
            times_asked: existingIdx !== -1 ? bank[existingIdx].timesAsked : 1,
            metadata: { askedBy: existingIdx !== -1 ? bank[existingIdx].askedBy : [deviceId] }
        }, { onConflict: 'question' });
    }
  }

  static async getStats() {
      const bank = this.getAll();
      return { 
          totalQuestions: bank.length, 
          examsCount: bank.filter(q => q.category === 'exam').length,
          summariesCount: bank.filter(q => q.category === 'summary').length,
          popularCount: bank.filter(q => q.timesAsked > 1).length
      };
  }

  static async getPopular(limit: number = 8): Promise<DynamicQuestion[]> {
      const bank = this.getAll();
      return [...bank].sort((a, b) => b.timesAsked - a.timesAsked).slice(0, limit);
  }
}
