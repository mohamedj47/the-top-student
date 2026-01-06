
// @ts-ignore - استيراد مباشر من الـ CDN لضمان التوافق مع المتصفح
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع سوبابيز المطور
 * يدعم التنسيقات التقليدية والحديثة لمفاتيح Supabase
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
 * تم التحديث ليدعم مفاتيح (eyJ) و (sb_publishable)
 */
export const isSupabaseConnected = (): boolean => {
  const urlValid = !!supabaseUrl && (supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('localhost'));
  // يقبل التنسيق القديم eyJ أو التنسيق الجديد sb_
  const keyValid = !!supabaseAnonKey && (supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.startsWith('sb_'));
  return urlValid && keyValid;
};

export const getSupabaseStatus = () => {
    return {
        // فحص وجود الرابط
        hasUrl: !!supabaseUrl && supabaseUrl.length > 10,
        // فحص وجود المفتاح
        hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 20,
        // فحص التنسيق - يدعم كلا النوعين الآن
        isKeyFormatCorrect: !!supabaseAnonKey && (supabaseAnonKey.trim().startsWith('eyJ') || supabaseAnonKey.trim().startsWith('sb_')),
        // فحص ما إذا كان المستخدم وضع مفتاح Stripe بالخطأ (مفاتيح Stripe تبدأ بـ sk_ أو pk_)
        isStripeKeyDetected: !!supabaseAnonKey && (supabaseAnonKey.startsWith('sk_') || supabaseAnonKey.startsWith('pk_')),
        // الحالة النهائية
        isConnected: isSupabaseConnected()
    };
};
