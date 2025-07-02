import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      '@solana/web3.js',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@coral-xyz/anchor',
    ],
  },
  build: {
    target: 'es2022',
    sourcemap: false, // SECURITY FIX: Disable source maps in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          solana: ['@solana/web3.js', '@solana/wallet-adapter-react'],
          anchor: ['@coral-xyz/anchor'],
          ui: ['lucide-react'],
        },
      },
    },
    // Security headers
    assetsInlineLimit: 0, // Don't inline assets for better CSP
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/magiceden': {
        target: 'https://api-devnet.magiceden.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/magiceden/, ''),
        secure: true,
        headers: {
          'User-Agent': 'NFT-Swap-Platform/1.0',
        },
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  define: {
    // SECURITY FIX: Explicitly define global constants
    global: 'globalThis',
  },
});