import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    
    port: 5173,
    // Proxies /api/* to the Express backend during local dev so the
    // frontend can just call same-origin "/api/..." paths (see src/api/client.ts)
    // instead of hardcoding a host/port that changes between machines.
    // No path rewrite — the backend's routes are genuinely mounted under
    // /api (see backend/src/index.js), so dev and production use the
    // exact same routing with nothing special-cased between them.
    host: true,
    allowedHosts: ['sampletoyota.com', '.sampletoyota.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: ['sampletoyota.com', '.sampletoyota.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
