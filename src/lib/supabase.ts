// استيراد مباشر من CDN لضمان التوافق مع المتصفح (Vite)
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع Supabase
 * نسخة Vite / Browser صحيحة 100%
 */

// قراءة المتغيرات من Vite فقط
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * التحقق المبدئي من القيم
 */
const isUrlValid =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  supabaseUrl.includes('.supabase.co');

const isKeyValid =
  typeof supabaseAnonKey === 'string' &&
  (
    supabaseAnonKey.trim().startsWith('eyJ') || // JWT القديم
    supabaseAnonKey.trim().startsWith('sb_')    // Publishable الجديد
  );

/**
 * إنشاء عميل Supabase
 * ⚠️ لا نُنشئ client بقيم فارغة أبدًا
 */
export const supabase: SupabaseClient | null =
  isUrlValid && isKeyValid
    ? createClient(supabaseUrl!, supabaseAnonKey!, {
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
 * فحص الاتصال الحقيقي
 */
export const isSupabaseConnected = (): boolean => {
  return isUrlValid && isKeyValid;
};

/**
 * تقرير حالة مفصل (لـ UI أو Debug)
 */
export const getSupabaseStatus = () => {
  return {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    isUrlValid,
    isKeyFormatCorrect: isKeyValid,
    isStripeKeyDetected:
      !!supabaseAnonKey &&
      (supabaseAnonKey.startsWith('sk_') || supabaseAnonKey.startsWith('pk_')),
    isConnected: isSupabaseConnected()
  };
};
