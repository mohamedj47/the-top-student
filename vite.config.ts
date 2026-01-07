
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // تحميل المتغيرات من كافة المصادر المتاحة
  const env = loadEnv(mode, process.cwd(), '');

  // استخراج القيم مع تنظيفها لضمان عدم وجود أخطاء في النسخ واللصق
  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const rawKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  
  const supabaseUrl = rawUrl.trim();
  const supabaseKey = rawKey.trim();

  return {
    plugins: [react()],
    
    define: {
      // حقن مفاتيح Gemini
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.API_KEY_1': JSON.stringify(env.API_KEY_1 || ''),
      'process.env.API_KEY_2': JSON.stringify(env.API_KEY_2 || ''),
      'process.env.API_KEY_3': JSON.stringify(env.API_KEY_3 || ''),
      'process.env.API_KEY_4': JSON.stringify(env.API_KEY_4 || ''),
      'process.env.API_KEY_5': JSON.stringify(env.API_KEY_5 || ''),
      'process.env.API_KEY_6': JSON.stringify(env.API_KEY_6 || ''),
      'process.env.API_KEY_7': JSON.stringify(env.API_KEY_7 || ''),
      'process.env.API_KEY_8': JSON.stringify(env.API_KEY_8 || ''),
      'process.env.API_KEY_9': JSON.stringify(env.API_KEY_9 || ''),
      'process.env.API_KEY_10': JSON.stringify(env.API_KEY_10 || ''),
      'process.env.API_KEY_11': JSON.stringify(env.API_KEY_11 || ''),
      
      // حقن مفاتيح سوبابيز بأسماء متعددة لضمان الوصول إليها في كافة البيئات
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    },

    server: {
      port: 3000,
      host: true
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      emptyOutDir: true,
    }
  };
});
