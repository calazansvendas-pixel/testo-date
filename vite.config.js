import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/logo-calazans.png', 'assets/apple-touch-icon.png'],
      manifest: {
        name: 'testo-date',
        short_name: 'testo-date',
        description: 'Acompanhamento pessoal de aplicações e intervalos.',
        lang: 'pt-BR',
        theme_color: '#1A3E95',
        background_color: '#E4E9F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase/auth') || id.includes('node_modules/@firebase/auth')) {
            return 'firebase-auth'
          }
          if (id.includes('node_modules/firebase/firestore') || id.includes('node_modules/@firebase/firestore')) {
            return 'firebase-firestore'
          }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-core'
          }
        },
      },
    },
  },
})