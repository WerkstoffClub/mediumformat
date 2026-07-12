import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Storefront is served at the root of mediumformat.info (both dev and prod).
// The static prototype now lives under /prototype/*.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5174,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:3001', changeOrigin: true, secure: true },
    },
  },
});
