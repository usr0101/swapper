import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: {
    proxy: {
      '/api/magiceden': {
        target: 'https://api-devnet.magiceden.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/magiceden/, ''),
        secure: true,
      }
    }
  }
});