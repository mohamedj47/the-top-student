import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * جلب متغيرات البيئة (يعمل مع Vite و Vercel)
 */
const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    return env[key] || env[`VITE_${key}`] || ''; 
  }

  // fallback
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }

  return '';
};

const supabaseUrl =
  getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');

const supabaseAnonKey =
  getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * ✅ الدالة اللي كانت ناقصة وسببت الخطأ
 */
export const getSupabaseStatus = () => {
  return {
    connected: !!supabase,
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  };
};

/**
 * اختصار
 */
export const isSupabaseConnected = (): boolean => !!supabase;

/**
 * وظائف التخزين السحابي
 */
export const CloudStorage = {
  async saveMessage(studentId: string, message: any) {
    if (!supabase) return;
    await supabase.from('messages').insert([
      { student_id: studentId, ...message }
    ]);
  },

  async getStudentProgress(studentId: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error) return null;
    return data;
  }
};
