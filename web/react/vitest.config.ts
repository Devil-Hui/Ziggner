/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // 质量门禁：覆盖率基线。当前为起步阈值，随测试补全逐步提高至 80%+（红线）。
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/utils/errorHandler.ts', 'src/utils', 'src/components/common'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 20,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
