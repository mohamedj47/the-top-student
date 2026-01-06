
// @ts-ignore - استيراد مباشر من الـ CDN لتجاوز مشاكل بناء الحزم في Vercel
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// محاولة جلب المفاتيح بكافة الصيغ الممكنة
const supabaseUrl = process.env.SUPABASE_URL || (window as any)._env_?.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || (window as any)._env_?.SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== "undefined" && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    }) 
  : null;

/**
 * دالة للتأكد من حالة الاتصال بـ Supabase
 */
export const isSupabaseConnected = (): boolean => {
  if (!supabase) return false;
  // فحص إضافي للتأكد من أن الرابط ليس فارغاً
  return (supabaseUrl && supabaseUrl.length > 10) ? true : false;
};
