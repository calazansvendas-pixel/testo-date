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
      includeAssets: ['assets/logo-calazans.png'],
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
          { src: '/assets/logo-calazans.png', sizes: '125x118', type: 'image/png', purpose: 'any' },
          { src: '/assets/logo-calazans.png', sizes: '125x118', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
      },
    }),
  ],
})