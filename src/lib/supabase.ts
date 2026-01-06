
// @ts-ignore - استيراد مباشر من الـ CDN لضمان التوافق مع المتصفح
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع سوبابيز
 */

// جلب القيم المحقونة من Vite
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
      auth: { persistSession: true, autoRefreshToken: true }
    }) 
  : null;

/**
 * فحص الاتصال الحقيقي
 */
export const isSupabaseConnected = (): boolean => {
  return !!(supabaseUrl && supabaseUrl.includes('.supabase.co') && supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'));
};

export const getSupabaseStatus = () => {
    return {
        // فحص وجود الرابط
        hasUrl: !!supabaseUrl && supabaseUrl.length > 10,
        // فحص وجود المفتاح وطوله (مفاتيح سوبابيز دائماً طويلة جداً)
        hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 50,
        // فحص التنسيق (يجب أن يبدأ بـ eyJ)
        isKeyFormatCorrect: !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'),
        // فحص ما إذا كان المستخدم وضع مفتاح Stripe بالخطأ
        isStripeKeyDetected: !!supabaseAnonKey && supabaseAnonKey.startsWith('sb_'),
        // الحالة النهائية
        isConnected: isSupabaseConnected()
    };
};
