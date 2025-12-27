
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process, { cwd } from 'node:process';

export default defineConfig(({ mode }) => {
  // تحميل متغيرات البيئة من ملف .env ومن متغيرات النظام (Vercel)
  // Fix: Use imported cwd function instead of process.cwd() to resolve type error on Process type
  const env = loadEnv(mode, cwd(), '');

  return {
    plugins: [react()],
    
    // تعريف المتغيرات لكي يراها المتصفح
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      'process.env.API_KEY_2': JSON.stringify(env.API_KEY_2 || process.env.API_KEY_2 || ''),
      'process.env.API_KEY_3': JSON.stringify(env.API_KEY_3 || process.env.API_KEY_3 || ''),
      'process.env.API_KEY_4': JSON.stringify(env.API_KEY_4 || process.env.API_KEY_4 || ''),
      'process.env.API_KEY_5': JSON.stringify(env.API_KEY_5 || process.env.API_KEY_5 || ''),
      'process.env.ELEVENLABS_API_KEY': JSON.stringify('sk_79d6000a55176794983c79046a59988d1082fd0f73dda40e'),
    },

    server: {
      port: 3000,
      host: true
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      // تأمين عملية البناء من التوقف بسبب أخطاء TypeScript البسيطة
      emptyOutDir: true,
    }
  };
});
