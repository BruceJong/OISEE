import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/cms/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 直接指向 shared 的 TS 源（ESM），绕开 dist 的 CommonJS 产物。
      // 否则 workspace symlink 的 CJS dist 不在 node_modules 下，Rollup 会按
      // ESM 解析 CJS，丢失命名导出，导致生产 build 报 "X is not exported"。
      '@oisee/shared': path.resolve(__dirname, '../shared/lib/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    fs: {
      // 允许 Vite 读到 monorepo 上一层（packages/shared/dist 在外面）
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
    },
  },
});
