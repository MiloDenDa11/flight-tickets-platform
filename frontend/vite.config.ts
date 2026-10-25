import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { include: ['leaflet', 'react-leaflet'] },
  server: { port: Number(process.env.VITE_DEV_PORT || 5174), strictPort: true, host: 'localhost', proxy: { '/api': { target: process.env.DEV_API_PROXY || 'http://localhost:3001', changeOrigin: true } } },
  preview: { port: 4174, strictPort: true },
});
