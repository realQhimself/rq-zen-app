import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/zen-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,m4a}'],
      },
      manifest: false,
    }),
  ],
  server: {
    host: true, // Listen on all addresses
    allowedHosts: true, // Allow tunnel hostnames
  }
})
