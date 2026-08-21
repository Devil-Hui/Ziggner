/**
 * 验收 · 第四层：交互与反馈
 * ─────────────────────
 * 键盘快捷键（Ctrl+K 搜索 / Esc 关闭）、ConfirmDialog（危险红钮）、
 * Toast（右上/顶部 3s）、Empty、乐观更新、i18n 无硬编码中文残留。
 */
import { test, expect } from '@playwright/test'
import { gotoAdmin } from './helpers'

test.use({ locale: 'zh-CN' })

test.describe('L4 交互与反馈', () => {
  test('L4.1 快捷键：Ctrl+K 聚焦全局搜索', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/products')
    await page.keyboard.press('Control+K')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBe('INPUT')
    // 输入关键词 → 搜索下拉出现分组结果
    await page.keyboard.type('验收')
    await expect(page.getByText('验收测试商品 Alpha').first()).toBeVisible()
  })

  test('L4.2 快捷键：Esc 关闭 Modal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/brands')
    await page.getByRole('button', { name: /新建/ }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  })

  test('L4.3 ConfirmDialog：删除商品出现危险确认（红钮）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/products')
    // 草稿商品 Beta 行的删除按钮（限定在主内容区，排除头部/侧栏）
    const delBtn = page.locator('main').getByRole('button', { name: '删除' }).first()
    await delBtn.click({ force: true })
    /* 旧 ConfirmDialog 无 role，按确认按钮断言 */
    
    // 危险确认按钮为红色系
    const confirmBtn = page.getByRole('button', { name: '确定删除' }) // 出现即对话框已渲染
    const bg = await confirmBtn.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(220, 38, 38)')
  })

  test('L4.4 Toast：推广码复制链接出现全局 Toast（z-index 1200）', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/coupons/promo/62')

    await expect(page.getByText('代言人券 · 推广码看板')).toBeVisible()
    await page.getByRole('button', { name: /复制链接/ }).first().click()
    const toast = page.locator('[data-testid="toast-container"]')
    await expect(toast).toBeVisible()
    const z = await toast.evaluate(el => getComputedStyle(el).zIndex)
    expect(z).toBe('1200')
    // 合计行固定底部 + GMV 统计
    await expect(page.getByText('¥500.00').first()).toBeVisible()
  })

  test('L4.5 空态：审计日志无数据显示 Empty', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/audit-logs')
    await expect(page.getByText(/暂无|没有/).first()).toBeVisible()
  })

  test('L4.6 i18n：默认中文界面，Header 面包屑无硬编码英文', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/products')
    // 面包屑包含中文「控制台」
    await expect(page.locator('header').getByText('控制台')).toBeVisible()
    // 语言切换按钮存在
    await expect(page.getByText('EN').or(page.getByText('中')).first()).toBeVisible()
  })
})
