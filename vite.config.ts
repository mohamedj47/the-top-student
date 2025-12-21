
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to satisfy the compiler for cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');
  const getEnv = (key: string) => (process as any).env?.[key] || env[key] || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(getEnv('API_KEY')),
      'process.env.API_KEY_2': JSON.stringify(getEnv('API_KEY_2')),
      'process.env.API_KEY_3': JSON.stringify(getEnv('API_KEY_3')),
      'process.env.API_KEY_4': JSON.stringify(getEnv('API_KEY_4')),
      'process.env.API_KEY_5': JSON.stringify(getEnv('API_KEY_5')),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
