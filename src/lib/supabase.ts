
// استيراد مباشر من CDN لضمان التوافق مع المتصفح (Vite)
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع Supabase
 * تم التحديث لدعم كافة صيغ المفاتيح:
 * 1. الصيغة القديمة (Legacy): تبدأ بـ eyJ
 * 2. الصيغة الجديدة (Modern): تبدأ بـ sb_publishable
 */

// القراءة من المتغيرات المحقونة
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

/**
 * التحقق من الرابط
 */
const isUrlValid =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 10 &&
  supabaseUrl.startsWith('http') &&
  supabaseUrl.includes('.supabase.co');

/**
 * التحقق من المفتاح (دعم الصيغتين eyJ و sb_)
 */
const isKeyValid =
  typeof supabaseAnonKey === 'string' &&
  (
    supabaseAnonKey.startsWith('eyJ') || 
    supabaseAnonKey.startsWith('sb_publishable') ||
    supabaseAnonKey.startsWith('sb_') // دعم إضافي لأي مفتاح يبدأ بـ sb
  );

/**
 * إنشاء عميل Supabase
 */
export const supabase: SupabaseClient | null =
  isUrlValid && isKeyValid
    ? createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: { eventsPerSecond: 10 }
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      })
    : null;

/**
 * فحص الاتصال
 */
export const isSupabaseConnected = (): boolean => {
  return isUrlValid && isKeyValid && supabase !== null;
};

/**
 * تقرير حالة مفصل يظهر في واجهة المستخدم للمساعدة في التشخيص
 */
export const getSupabaseStatus = () => {
  return {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    isUrlValid,
    isKeyFormatCorrect: isKeyValid,
    // Fix: Add isSecretKeyDetected to match expected type in ChatInterface.tsx
    isSecretKeyDetected: typeof supabaseAnonKey === 'string' && supabaseAnonKey.startsWith('sb_secret'),
    // إظهار تلميح للمستخدم بناءً على الرابط الذي أرسله في الشات
    urlHint: "hqaozutxjfvbrplorxhv",
    isConnected: isSupabaseConnected()
  };
};
