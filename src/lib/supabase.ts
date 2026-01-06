
// @ts-ignore - استيراد مباشر من الـ CDN لضمان التوافق مع المتصفح
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع سوبابيز
 * يتم حقن هذه القيم أثناء عملية الـ Build بواسطة vite.config.ts
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
  const urlValid = !!supabaseUrl && supabaseUrl.includes('.supabase.co');
  const keyValid = !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ');
  return urlValid && keyValid;
};

export const getSupabaseStatus = () => {
    return {
        // فحص وجود الرابط
        hasUrl: !!supabaseUrl && supabaseUrl.length > 10,
        // فحص وجود المفتاح
        hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 50,
        // فحص التنسيق
        isKeyFormatCorrect: !!supabaseAnonKey && supabaseAnonKey.trim().startsWith('eyJ'),
        // فحص ما إذا كان المستخدم وضع مفتاح Stripe بالخطأ
        isStripeKeyDetected: !!supabaseAnonKey && supabaseAnonKey.startsWith('sb_'),
        // الحالة النهائية
        isConnected: isSupabaseConnected()
    };
};
