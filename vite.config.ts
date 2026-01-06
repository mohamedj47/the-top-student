
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // تحميل المتغيرات من ملف .env (للتطوير المحلي) ومن بيئة النظام (لـ Vercel)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      'process.env.API_KEY_1': JSON.stringify(env.API_KEY_1 || process.env.API_KEY_1 || ''),
      'process.env.API_KEY_2': JSON.stringify(env.API_KEY_2 || process.env.API_KEY_2 || ''),
      'process.env.API_KEY_3': JSON.stringify(env.API_KEY_3 || process.env.API_KEY_3 || ''),
      'process.env.API_KEY_4': JSON.stringify(env.API_KEY_4 || process.env.API_KEY_4 || ''),
      'process.env.API_KEY_5': JSON.stringify(env.API_KEY_5 || process.env.API_KEY_5 || ''),
      'process.env.API_KEY_6': JSON.stringify(env.API_KEY_6 || process.env.API_KEY_6 || ''),
      'process.env.API_KEY_7': JSON.stringify(env.API_KEY_7 || process.env.API_KEY_7 || ''),
      'process.env.API_KEY_8': JSON.stringify(env.API_KEY_8 || process.env.API_KEY_8 || ''),
      'process.env.API_KEY_9': JSON.stringify(env.API_KEY_9 || process.env.API_KEY_9 || ''),
      'process.env.API_KEY_10': JSON.stringify(env.API_KEY_10 || process.env.API_KEY_10 || ''),
      'process.env.API_KEY_11': JSON.stringify(env.API_KEY_11 || process.env.API_KEY_11 || ''),
      
      // مطابقة الأسماء مع Vercel بالضبط
      'process.env.SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || process.env.SUPABASE_URL || ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''),
      
      // أسماء إضافية للاحتياط
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
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
