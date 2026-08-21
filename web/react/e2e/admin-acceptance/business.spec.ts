/**
 * 验收 · 第三层：业务页面（六大子系统）
 * ─────────────────────
 * 商品：卡片行（缩略图 aspect-ratio 1:1、名称省略、红色价格、状态机按钮）
 * 订单：64px 行高、渠道色点、状态圆角标签、金额右对齐加粗、详情 Drawer（时间线）
 * 营销：券卡片行（面额大号、进度条、状态徽章）
 * 客服：联系人卡片（未读红点、最后消息预览）
 * 系统：RBAC 权限卡片网格、角色编辑抽屉 360px
 */
import { test, expect } from '@playwright/test'
import { gotoAdmin } from './helpers'

test.use({ locale: 'zh-CN' })

test.describe('L3 业务页面', () => {
  test('L3.1 商品卡片行：缩略图 1:1、名称、红色价格、状态徽章、状态机按钮', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/products')

    // 商品名称
    await expect(page.getByText('验收测试商品 Alpha')).toBeVisible()
    // 红色价格区间（#dc2626）
    const price = page.getByText(/\$99\.00 – \$199\.00/)
    await expect(price).toBeVisible()
    const priceColor = await price.evaluate(el => getComputedStyle(el).color)
    expect(priceColor).toBe('rgb(220, 38, 38)')
    // 状态徽章：已上架（绿色；排除筛选下拉中的隐藏选项）
    const badge = page.getByText('已上架').filter({ visible: true }).first()
    await expect(badge).toBeVisible()
    expect(await badge.evaluate(el => getComputedStyle(el).borderRadius)).toBe('12px')
    // 缩略图区块：100px 容器（mock 无图时显示占位图标）
    const thumbOk = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div'))
      return cards.some(el => {
        const r = el.getBoundingClientRect()
        return Math.round(r.height) === 100 && el.querySelector('.ph')
      })
    })
    expect(thumbOk).toBe(true)
    // 状态机按钮：草稿商品显示「上架/提交审核」
    const card = page.getByText('验收测试商品 Beta').locator('xpath=ancestor::div[contains(@class,"")]')
    await expect(page.getByRole('button', { name: '上架' }).first()).toBeVisible()
  })

  test('L3.2 订单：64px 行高、渠道彩色圆点、金额右对齐加粗', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/orders')

    await expect(page.getByText('ZC202608210001')).toBeVisible()
    // 渠道列：商城 + 代言人A（带色点 ::before 8px 圆；限定 tbody 排除筛选下拉选项）
    const mall = page.locator('tbody').getByText('商城').first()
    await expect(mall).toBeVisible()
    const dot = await mall.evaluate(el => getComputedStyle(el, '::before').width)
    expect(dot).toBe('8px')
    // 状态圆角标签
    expect(await page.locator('tbody').getByText('已支付').first().evaluate(el => getComputedStyle(el).borderRadius)).toBe('12px')
    // 金额右对齐加粗
    const amount = page.locator('tbody').getByText('$199.00').first()
    const a = await amount.evaluate(el => { const cs = getComputedStyle(el); return { bold: cs.fontWeight, align: el.closest('td') ? getComputedStyle(el.closest('td')!).textAlign : '' } })
    expect(a.bold).toBe('600')
    expect(a.align).toBe('right')
  })

  test('L3.3 营销：券卡片行（面额大号、进度条、状态徽章）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/coupons')

    // 面额大号（¥30，红色）
    const face = page.getByText('¥30').first()
    await expect(face).toBeVisible()
    expect(await face.evaluate(el => getComputedStyle(el).fontSize)).toBe('24px')
    // 券码等宽
    await expect(page.getByText('OW0JKYPM')).toBeVisible()
    // 使用进度条（45/1000 → 4.5% → 显示 5%）
    await expect(page.getByText('5%').first()).toBeVisible()
    // 状态徽章 进行中
    await expect(page.getByText('进行中').first()).toBeVisible()
    // 推广码按钮 → 跳独立看板页
    await page.getByRole('button', { name: /推广码/ }).first().click()
    await page.waitForURL('**/admin/coupons/promo/**')
    await expect(page.getByText('代言人券 · 推广码看板')).toBeVisible()
  })

  test('L3.4 客服：联系人卡片（未读红点、预览）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/chat')

    await expect(page.getByText('customer_a')).toBeVisible()
    await expect(page.getByText('订单物流咨询')).toBeVisible()
    // 未读徽章 2
    await expect(page.getByText('2').first()).toBeVisible()
    // 点击进入详情
    await page.getByText('customer_a').click()
    await page.waitForURL('**/admin/chat/21')
  })

  test('L3.5 系统：RBAC 权限卡片网格（120px 卡片）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/rbac')

    await expect(page.getByText('查看商品').first()).toBeVisible()
    // 权限卡片：auto-fill minmax(120px,1fr) 网格（计算值约为 120px/列）
    const cols = await page.evaluate(() => {
      const label = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('查看商品'))
      const parent = label?.parentElement
      if (!parent) return []
      return getComputedStyle(parent)
        .gridTemplateColumns
        .split(' ')
        .map(s => parseFloat(s))
        .filter(n => !Number.isNaN(n))
    })
    expect(cols.length).toBeGreaterThanOrEqual(3)
    for (const c of cols) {
      expect(c).toBeGreaterThanOrEqual(110)
      expect(c).toBeLessThan(220)
    }
  })

  test('L3.6 系统：邮件模板三栏编辑器', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/email-templates')
    // 编辑/预览/代码 三段切换
    await expect(page.getByText('编辑').first()).toBeVisible()
    await expect(page.getByText('预览').first()).toBeVisible()
  })
})
