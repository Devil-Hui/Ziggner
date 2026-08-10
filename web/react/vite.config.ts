import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'
const wsProxyTarget = process.env.VITE_WS_PROXY_TARGET || 'http://web:8001'
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
      // WebSocket（客服实时消息）代理到 daphne(ASGI):8001，必须开启 ws:true
      // （gunicorn:8000 是 WSGI，不支持 WebSocket）
      '/ws': {
        target: wsProxyTarget,
        ws: true,
        changeOrigin: true,
        // channels 的 AllowedHostsOriginValidator 在「无 Origin 头」时一律拒绝
        // （除非 ALLOWED_HOSTS 含 "*"）。http-proxy 默认不转发浏览器 Origin，
        // 故在 WS 升级请求上补一个与允许主机匹配的 Origin，保证握手通过。
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyReq, req) => {
            const host = req.headers.host || 'localhost:12700'
            proxyReq.setHeader('origin', `http://${host}`)
          })
        },
      },
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
