// Vite dev-server config for the React frontend.
//
// The proxy block forwards two prefixes to the backend (which runs on
// port 3000) so the frontend code can use plain relative URLs like
// fetch('/api/products') without dealing with CORS in dev.
//
//   /api      → all backend endpoints
//   /uploads  → product images served by Express's static handler
//
// In production both the frontend and backend will live behind the same
// origin (or behind a CDN), so this proxy is dev-only.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Listen on every network interface, not just localhost. This makes
    // the dev server reachable from other devices on the same Wi-Fi
    // (your phone, a tablet, etc.) so you can preview real layouts.
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
})
