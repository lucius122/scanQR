import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

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
    basicSsl(),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0', // Memastikan Vite bisa diakses di jaringan (HP)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
      '/sanctum': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
  },
})
