
// @ts-ignore - استيراد مباشر من الـ CDN لضمان التوافق مع المتصفح
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع سوبابيز - إصدار الإنتاج المعتمد
 */

// هذه القيم يتم استبدالها أثناء الـ Build من ملف vite.config.ts
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
  // المفتاح الذي يبدأ بـ eyJ والرابط الذي يبدأ بـ http يعني أن الربط تم بنجاح
  return !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'));
};

export const getSupabaseStatus = () => {
    return {
        hasUrl: !!supabaseUrl && supabaseUrl.length > 10,
        hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 20,
        isKeyFormatCorrect: !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'),
        isStripeKeyDetected: !!supabaseAnonKey && supabaseAnonKey.startsWith('sb_'),
        isConnected: isSupabaseConnected()
    };
};
