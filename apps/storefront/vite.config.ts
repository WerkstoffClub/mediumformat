import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` only applies for production builds (mediumformat.info/shop/).
// Dev server boots at `/` so pnpm dev feels normal.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/shop/' : '/',
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
}));
