
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const getEnv = (key: string) => {
    return (
      process.env?.[key] ||
      env[key] ||
      env[`GEMINI_${key}`] ||
      ''
    );
  };

  return {
    plugins: [react()],

    /**
     * ⚠️ إدارة مفاتيح الـ API:
     * 1. API_KEY: مفتاح Gemini (من Google AI Studio) - العقل المدبر.
     * 2. ELEVENLABS_API_KEY: مفتاح ElevenLabs - الصوت البشري الطبيعي.
     */
    define: {
      // مفاتيح Gemini (تأكد من وضع مفتاحك هنا إذا لم يعمل التلقائي)
      'process.env.API_KEY': JSON.stringify(getEnv('API_KEY')),
      'process.env.API_KEY_2': JSON.stringify(getEnv('API_KEY_2')),
      'process.env.API_KEY_3': JSON.stringify(getEnv('API_KEY_3')),
      'process.env.API_KEY_4': JSON.stringify(getEnv('API_KEY_4')),
      'process.env.API_KEY_5': JSON.stringify(getEnv('API_KEY_5')),
      
      // مفتاح ElevenLabs للصوت (أنت وضعته بنجاح هنا)
      'process.env.ELEVENLABS_API_KEY': JSON.stringify('sk_79d6000a55176794983c79046a59988d1082fd0f73dda40e'),
    },

    server: {
      port: 3000,
      host: true
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
    }
  };
});
