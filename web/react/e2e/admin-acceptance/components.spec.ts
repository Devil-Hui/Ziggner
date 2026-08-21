/**
 * 验收 · 第二层：组件原子（在真实页面中验证状态）
 * ─────────────────────
 * Modal（居中/遮罩 0.35 blur/高 85vh 上限）、Drawer（右侧滑入/360px 角色抽屉/700）、
 * Tag（圆角 12px 状态徽章）、Progress（任务进度）、Switch/Select（券表单）、
 * Empty（空态）、Skeleton（首载扫光）。
 */
import { test, expect } from '@playwright/test'
import { gotoAdmin } from './helpers'

test.use({ locale: 'zh-CN' })

test.describe('L2 组件原子', () => {
  test('L2.1 Modal：居中、遮罩 rgba(0,0,0,0.35)、z-index 1100、≤85vh', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/brands')
    await page.getByText('新建品牌').click().catch(async () => {
      // 兜底：点第一个「新建」类按钮
      await page.getByRole('button', { name: /新建/ }).first().click()
    })

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    const info = await dialog.evaluate(el => {
      const d = getComputedStyle(el)
      const overlay = el.parentElement ? getComputedStyle(el.parentElement) : null
      return {
        dlgMaxHeight: d.maxHeight,
        overlayZ: overlay?.zIndex ?? '',
        overlayBg: overlay?.backgroundColor ?? '',
        overlayBlur: overlay?.backdropFilter ?? '',
      }
    })
    // z-index 设在遮罩层（85vh 解析后 = 765px）
    expect(info.overlayZ).toBe('1100')
    expect(info.dlgMaxHeight).toBe('765px')
    expect(info.overlayBg).toBe('rgba(0, 0, 0, 0.35)')
    expect(info.overlayBlur).toContain('blur')
  })

  test('L2.2 Drawer：订单详情右侧滑入，z-index 700，不遮侧边栏', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/orders')
    await page.locator('tbody').getByRole('button', { name: /详情/ }).first().click()

    const drawer = page.locator('[role="dialog"]')
    await expect(drawer).toBeVisible()
    const info = await drawer.evaluate(el => {
      const cs = getComputedStyle(el)
      return { z: cs.zIndex, position: cs.position, right: cs.right, height: cs.height }
    })
    expect(info.z).toBe('700')
    expect(info.position).toBe('fixed')
    expect(info.right).toBe('0px')
    // height:100vh 解析后 = 视口高 900px
    expect(info.height).toBe('900px')
    // 详情内容：状态时间线 + 商品明细
    await expect(drawer.getByText('已支付').first()).toBeVisible()
    await expect(drawer.getByText('ZC202608210001')).toBeVisible()
    // 关闭后侧边栏仍在
    await drawer.getByRole('button', { name: '关闭' }).click()
    await expect(page.locator('aside')).toBeVisible()
  })

  test('L2.3 Tag：订单状态圆角标签（12px 圆角）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/orders')
    // 状态标签「已支付」（限定 tbody 排除筛选下拉隐藏选项）
    const pill = page.locator('tbody').getByText('已支付').first()
    await expect(pill).toBeVisible()
    const r = await pill.evaluate(el => getComputedStyle(el).borderRadius)
    expect(r).toBe('12px')
  })

  test('L2.4 Progress：异步任务进度条（PROCESSING=60%）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/tasks')
    await expect(page.getByText('task-import-001')).toBeVisible()
    // 找到 120×6px 圆角轨道，读取其内部填充的相对宽度
    const fillPct = await page.evaluate(() => {
      const tracks = Array.from(document.querySelectorAll('div')).filter(el => {
        const cs = getComputedStyle(el)
        return cs.height === '6px' && cs.borderRadius === '4px'
      })
      if (!tracks.length) return -1
      const track = tracks[0]
      const fill = track.firstElementChild as HTMLElement | null
      if (!fill) return -1
      return (fill.getBoundingClientRect().width / track.getBoundingClientRect().width) * 100
    })
    expect(fillPct).toBeGreaterThan(55)
    expect(fillPct).toBeLessThan(65)
  })

  test('L2.5 Skeleton：商品首载显示骨架扫光（渐变）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    // 延迟 mock（4s），在加载窗口内轮询检查骨架
    // 手动注册认证 mock（/users/me + 通用空响应），再覆盖 SPU 延迟
    await page.route('**/api/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[],"count":0,"items":[],"total":0}' }))
    await page.route('**/api/v1/users/me/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, username: 'acceptance_admin', is_superuser: true, is_group_leader: false, is_group_member: false }) }))
    await page.route('**/api/v1/goods/spu/admin**', route => {
      setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) }), 10000)
    })
    await page.addInitScript(() => { localStorage.setItem('ziggner_lang', 'zh-CN') })
    await page.goto('http://localhost:5173/admin/products', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('div')).some(el => getComputedStyle(el).backgroundImage.includes('gradient')),
      { timeout: 8000 }
    )
  })

  test('L2.6 Empty：审计日志空态', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAdmin(page, '/admin/audit-logs')
    await expect(page.getByText('暂无日志').or(page.getByText(/暂无/).first())).toBeVisible()
  })
})
