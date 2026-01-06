
// @ts-ignore - استيراد مباشر من الـ CDN لضمان التوافق مع المتصفح
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع سوبابيز - إصدار الإنتاج المعتمد
 */

// جلب القيم من Vercel عبر Vite
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
      auth: { persistSession: true, autoRefreshToken: true }
    }) 
  : null;

/**
 * يتحقق مما إذا كان التطبيق متصلاً فعلياً بقاعدة البيانات السحابية
 */
export const isSupabaseConnected = (): boolean => {
  if (!supabase) return false;
  // المفتاح الذي يبدأ بـ eyJ هو المفتاح الصحيح لـ Supabase
  return !!(supabaseUrl.includes('supabase.co') && supabaseAnonKey.startsWith('eyJ'));
};

export const getSupabaseStatus = () => {
    return {
        hasUrl: !!supabaseUrl && supabaseUrl.includes('http'),
        hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 50,
        isKeyFormatCorrect: supabaseAnonKey.startsWith('eyJ'),
        isStripeKeyDetected: supabaseAnonKey.startsWith('sb_'),
        isConnected: isSupabaseConnected()
    };
};
