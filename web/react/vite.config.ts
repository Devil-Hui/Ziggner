import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-javascript-obfuscator'
import path from 'path'

// Vite 仅把 .env 注入客户端 import.meta.env；server 端配置(vite.config.ts)需经
// loadEnv 才能读到 .env / .env.local 中的变量（直接读 process.env 在 dev 下取不到
// .env.local 的覆盖值，会回退到默认的 http://web:8001，而 host 上的 Vite 解析不到
// 容器内的 `web` 主机名，导致 WS 代理永久 Connecting）。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8000'
  const wsProxyTarget = env.VITE_WS_PROXY_TARGET || 'http://web:8001'
  const proxyOptions = {
    target: proxyTarget,
    changeOrigin: false,
  }

  return {
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
    // 生产构建才混淆（dev/HMR 保持可读）；默认已排除 node_modules（vendor 框架不混淆）
    obfuscator({
      apply: 'build',
      exclude: [/node_modules/],
      options: {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        // ⚠️ stringArray 必须与 Vite 动态 import() 代码分割二选一：
        // 开启后，被编码进字符串数组的 import 说明符在运行时解码回「文档相对路径」
        // （如 /pages/admin/AdminLogin 而非 /assets/AdminLogin-xxx.js），
        // SPA 兜底把它当 text/html 返回 → "Failed to load module script: MIME type text/html"。
        // 关掉 stringArray（保留 hexadecimal 标识符重命名作轻量混淆），路由 import 恢复正常。
        stringArray: false,
        renameGlobals: false,
        identifierNamesGenerator: 'hexadecimal',
        disableConsoleOutput: false,
        log: false,
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
    include: ['test/**/*.test.{ts,tsx}'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // esbuild minify is safe here: styled-components is excluded from manualChunks
    // (the old `minify:false` workaround leaked fully-readable source to production).
    minify: 'esbuild',
    cssMinify: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  }
})
