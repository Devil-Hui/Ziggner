/**
 * 验收 · 第一层：全局框架
 * ─────────────────────
 * 1) 左侧导航固定 220px / 折叠 64px，position:sticky; height:100vh 独立滚动
 * 2) Header 固定 56px，含面包屑/搜索/通知/用户菜单
 * 3) 主内容区弹性（flex:1，≈ calc(100% - 220px)）
 * 4) Z 轴与 zIndex.ts 严格一致（header:50/sidebar:100/dropdown:200/drawer:700/modal:1100/toast:1200）
 * 5) 断点突变：<1366 折叠、<768 汉堡抽屉，无半列/溢出
 */
import { test, expect } from '@playwright/test'
import { gotoAdmin } from './helpers'

// 统一中文环境（i18n 默认随浏览器语言）
test.use({ locale: 'zh-CN' })

test.describe('L1 全局框架', () => {
  test('L1.1 侧边栏：220px sticky 100vh，主内容弹性填充', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/products')

    const aside = page.locator('aside')
    await expect(aside).toBeVisible()
    const styles = await aside.evaluate(el => {
      const cs = getComputedStyle(el)
      return { width: cs.width, position: cs.position, heightUsed: cs.height }
    })
    expect(styles.width).toBe('220px')
    expect(styles.position).toBe('sticky')
    // height:100vh 解析后应等于视口高 900px
    expect(styles.heightUsed).toBe('900px')

    // 主内容区弹性：main 宽度 ≈ 视口 - 220
    const mainWidth = await page.locator('main').evaluate(el => el.getBoundingClientRect().width)
    expect(mainWidth).toBeGreaterThan(1440 - 220 - 40) // 220 侧栏 + 24*2 内边距
    expect(mainWidth).toBeLessThan(1440 - 220 + 40)
  })

  test('L1.2 折叠态：点击折叠 → 64px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/products')

    await page.locator('aside button').last().click() // 底部折叠开关
    // 等待 0.2s 宽度过渡完成
    await page.waitForTimeout(400)
    const width = await page.locator('aside').evaluate(el => getComputedStyle(el).width)
    expect(width).toBe('64px')
  })

  test('L1.3 Header：56px sticky，含面包屑/搜索/通知/用户菜单', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/products')

    const header = page.locator('header')
    await expect(header).toBeVisible()
    const h = await header.evaluate(el => {
      const cs = getComputedStyle(el)
      return { height: cs.height, position: cs.position, z: cs.zIndex }
    })
    expect(h.height).toBe('56px')
    expect(h.position).toBe('sticky')
    expect(h.z).toBe('50')

    // 面包屑（控制台 › 商品运营 › 商品管理）
    await expect(page.locator('header').getByText('控制台')).toBeVisible()
    // 全局搜索框（Ctrl+K 占位）
    await expect(page.locator('header input[placeholder*="Ctrl+K"]')).toBeVisible()
    // 通知铃
    await expect(page.locator('button[aria-label="通知"]')).toBeVisible()
    // 用户菜单（acceptance_admin）
    await expect(page.getByText('acceptance_admin')).toBeVisible()
  })

  test('L1.4 Z 轴：zIndex.ts 常量与验收基线一致 + 运行时 Header z-index=50', async ({ page }) => {
    await gotoAdmin(page, '/admin/products')
    // 源码级校验（dev 模式 vite 直接服务源码）
    const src = await page.evaluate(async () => (await (await fetch('/src/theme/zIndex.ts')).text()))
    for (const [k, v] of Object.entries({ header: 50, sidebar: 100, dropdown: 200, drawer: 700, modal: 1100, toast: 1200 })) {
      expect(src, `zIndex.ts 应包含 ${k}: ${v}`).toContain(`${k}: ${v}`)
    }
    // 运行时：Header 计算样式 z-index 50
    const z = await page.locator('header').evaluate(el => getComputedStyle(el).zIndex)
    expect(z).toBe('50')
  })

  test('L1.5 断点突变：<1366 自动折叠为 64px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 })
    await gotoAdmin(page, '/admin/products')
    const width = await page.locator('aside').evaluate(el => getComputedStyle(el).width)
    expect(width).toBe('64px')
  })

  test('L1.6 断点突变：<768 汉堡抽屉，桌面侧栏隐藏', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 })
    await gotoAdmin(page, '/admin/products')

    // 桌面 aside 不再渲染
    await expect(page.locator('aside')).toHaveCount(0)
    // 汉堡按钮出现
    const burger = page.locator('button[aria-label="打开菜单"]')
    await expect(burger).toBeVisible()
    await burger.click({ force: true })
    // 移动导航抽屉出现（含品牌 Logo）
    await expect(page.getByText('Ziggner').first()).toBeVisible()
    // 无横向溢出
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
    expect(overflow).toBe(true)
  })
})
