
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const metaEnv = (import.meta as any).env;
    return (metaEnv[key] || metaEnv[`VITE_${key}`] || "") as string;
  }
  return "";
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConnected = (): boolean => !!supabase;

/**
 * وظائف تخزين البيانات السحابية للطالب
 */
export const CloudStorage = {
  async saveMessage(studentId: string, message: any) {
    if (!supabase) return;
    await supabase.from('messages').insert([{ student_id: studentId, ...message }]);
  },
  async getStudentProgress(studentId: string) {
    if (!supabase) return null;
    const { data } = await supabase.from('progress').select('*').eq('student_id', studentId).single();
    return data;
  }
};
