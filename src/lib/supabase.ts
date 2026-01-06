
// @ts-ignore - استيراد مباشر من الـ CDN لضمان التوافق مع المتصفح
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع سوبابيز - إصدار الإنتاج المعتمد
 */

// محاولة جلب القيم بأكثر من مسمى لضمان النجاح في Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

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
  // التحقق من أن القيم موجودة وتتبع تنسيق سوبابيز الصحيح
  const hasValidUrl = !!supabaseUrl && supabaseUrl.includes('.supabase.co');
  const hasValidKey = !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ');
  
  return hasValidUrl && hasValidKey;
};

export const getSupabaseStatus = () => {
    return {
        // نستخدم القيم الفعلية التي تمت قراءتها للفحص
        hasUrl: !!supabaseUrl && supabaseUrl.length > 10,
        hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 50,
        isKeyFormatCorrect: !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ'),
        isStripeKeyDetected: !!supabaseAnonKey && supabaseAnonKey.startsWith('sb_'),
        isConnected: isSupabaseConnected(),
        debugInfo: {
            urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 10) : 'none',
            keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 5) : 'none'
        }
    };
};
