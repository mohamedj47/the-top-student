
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * محرك الربط مع Supabase
 * مصمم للعمل في بيئة Vercel و Vite مع دعم المتغيرات NEXT_PUBLIC_
 */

const getEnv = (key: string): string => {
  // البحث في متغيرات Vite التعريفية (المحقونة عبر vite.config.ts)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  // البحث في import.meta.env الافتراضي لـ Vite
  // Fix: Use type casting (import.meta as any) to resolve "Property 'env' does not exist on type 'ImportMeta'" errors
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const metaEnv = (import.meta as any).env;
    return (metaEnv[key] || metaEnv[`VITE_${key}`] || "") as string;
  }
  return "";
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

const isUrlValid = typeof supabaseUrl === 'string' && supabaseUrl.startsWith('https://');
const isKeyValid = typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 20;

export const supabase: SupabaseClient | null = (isUrlValid && isKeyValid)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConnected = (): boolean => !!supabase;

export const getSupabaseStatus = () => {
  return {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    isUrlValid,
    isKeyFormatCorrect: isKeyValid,
    isConnected: isSupabaseConnected(),
    // إظهار بدايات المفاتيح للتشخيص فقط (أمنياً لا تظهر المفتاح كاملاً)
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 15) : "Missing",
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 8) : "Missing"
  };
};
