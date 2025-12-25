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
     * ⚠️ تحذير أمني مهم:
     * أي قيمة هنا = Frontend
     * ممنوع وضع ElevenLabs أو أي مفتاح حساس
     */
    define: {
      'process.env.API_KEY': JSON.stringify(getEnv('API_KEY')),
      'process.env.API_KEY_2': JSON.stringify(getEnv('API_KEY_2')),
      'process.env.API_KEY_3': JSON.stringify(getEnv('API_KEY_3')),
      'process.env.API_KEY_4': JSON.stringify(getEnv('API_KEY_4')),
      'process.env.API_KEY_5': JSON.stringify(getEnv('API_KEY_5')),
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
