import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'https://little-krishna-2-bwx1.onrender.com',
        changeOrigin: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
