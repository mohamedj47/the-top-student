
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع Supabase (الإصدار الذهبي المطور)
 * تم التحديث لضمان التقاط المفاتيح من Vercel Env بكافة الطرق الممكنة.
 */

// تعريف المتغيرات المحقونة من Vite بشكل صريح
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_KEY__: string;

const getSupabaseUrl = () => {
  let url = "";
  // 1. المحاولة الأولى: المتغير العالمي المحقون من vite.config
  try { url = __SUPABASE_URL__; } catch (e) {}
  
  // 2. المحاولة الثانية: البحث في process.env بكافة الصيغ
  if (!url) {
    url = (
      process.env.VITE_SUPABASE_URL || 
      process.env.NEXT_PUBLIC_SUPABASE_URL || 
      process.env.SUPABASE_URL || 
      ""
    ).trim();
  }
  return url;
};

const getSupabaseKey = () => {
  let key = "";
  // 1. المحاولة الأولى: المتغير العالمي المحقون من vite.config
  try { key = __SUPABASE_KEY__; } catch (e) {}
  
  // 2. المحاولة الثانية: البحث في process.env بكافة الصيغ
  if (!key) {
    key = (
      process.env.VITE_SUPABASE_ANON_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.SUPABASE_ANON_KEY || 
      ""
    ).trim();
  }
  return key;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseKey();

/**
 * التحقق من صحة الرابط
 */
const isUrlValid =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 10 &&
  supabaseUrl.startsWith('http') &&
  supabaseUrl.includes('.supabase.co');

/**
 * التحقق من صحة المفتاح (دعم الصيغة القديمة والجديدة)
 */
const isKeyValid =
  typeof supabaseAnonKey === 'string' &&
  (
    supabaseAnonKey.startsWith('eyJ') || 
    supabaseAnonKey.startsWith('sb_publishable') ||
    supabaseAnonKey.startsWith('sb_')
  );

/**
 * إنشاء العميل
 */
export const supabase: SupabaseClient | null =
  isUrlValid && isKeyValid
    ? createClient(supabaseUrl, supabaseAnonKey, {
        realtime: { params: { eventsPerSecond: 10 } },
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

/**
 * فحص الاتصال
 */
export const isSupabaseConnected = (): boolean => {
  return isUrlValid && isKeyValid && supabase !== null;
};

/**
 * تشخيص الحالة للواجهة الأمامية
 */
export const getSupabaseStatus = () => {
  return {
    hasUrl: !!supabaseUrl && supabaseUrl.length > 5,
    hasKey: !!supabaseAnonKey && supabaseAnonKey.length > 5,
    isUrlValid,
    isKeyFormatCorrect: isKeyValid,
    isSecretKeyDetected: typeof supabaseAnonKey === 'string' && (supabaseAnonKey.includes('secret') || supabaseAnonKey.startsWith('sb_secret')),
    // تلميح أمان: نظهر أجزاء فقط للتأكد من وصول البيانات
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 15) : "Missing",
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 8) : "Missing",
    isConnected: isSupabaseConnected()
  };
};
