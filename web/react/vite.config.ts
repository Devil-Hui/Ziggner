import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'
const proxyOptions = {
  target: proxyTarget,
  changeOrigin: false,
}

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-styled-components', {
            displayName: true,
            fileName: false,
          }],
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 12700,
    proxy: {
      '/api': proxyOptions,
      '/media': proxyOptions,
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false,  // Fix: prevent styled-components minification error
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // styled-components minification can cause `$C` reference error
          // disabling manual chunk for styled-components
        },
      },
    },
  },
})
