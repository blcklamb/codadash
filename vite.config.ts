import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { SITE_ORIGIN } from './apps/web/seo/metadata';
import { seoPlugin } from './apps/web/seo/plugin';
export default defineConfig(({ mode }) => ({
  root: 'apps/web',
  plugins: [
    react(),
    tailwindcss(),
    seoPlugin(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL || SITE_ORIGIN),
  ],
  envDir: '../..',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/v1': 'http://127.0.0.1:3001',
      '/socket.io': { target: 'http://127.0.0.1:3001', ws: true },
    },
  },
  build: { outDir: '../../dist', emptyOutDir: true },
}));
