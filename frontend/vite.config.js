import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/*
 * Vite config untuk FORGE Gym OS frontend
 *
 * server.proxy: forward semua request /api dan /sanctum
 *   ke Laravel backend di port 8000.
 *   Ini menghindari masalah CORS saat dev, dan membuat
 *   cookie Sanctum berjalan di domain yang sama (localhost).
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
