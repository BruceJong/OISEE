import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 关键：让 Vite 把 workspace 内的 CJS 包（@oisee/shared）预构建为 ESM
  optimizeDeps: {
    include: ['@oisee/shared'],
  },
  server: {
    port: 5175,
    fs: {
      allow: ['..', '../..', '../../..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/video': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
