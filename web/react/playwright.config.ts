import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 质量门禁：关键用户路径（商城浏览→详情）容器化无头运行。
 * 本地调试：npx playwright test（CI 安装 chromium；本地可复用系统 Chrome：--project=system-chrome）
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://shop.ziggner.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 本地复用用户 Chrome（Windows 路径），避免重复下载浏览器
    {
      name: 'system-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          executablePath:
            process.env.CHROME_PATH ||
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
        },
      },
    },
  ],
})
