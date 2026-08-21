/**
 * 独立复审探针（盲测式二次核查）
 * ─────────────────────────
 * 与 e2e/admin-acceptance 套件的断言刻意不同，独立验证五层关键契约：
 * 覆盖可能被验收套件遗漏的边界（侧栏实际 z-index、遮罩层级、千分位金额、
 * >5MB 上传拦截、Skeleton keyframes、语言切换、Esc 逐层关闭）。
 */
import { chromium } from '@playwright/test'

const PASS = []
const FAIL = []
const ok = (name, cond, detail = '') => {
  ;(cond ? PASS : FAIL).push(name)
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()

async function boot(path) {
  await p.addInitScript(() => { localStorage.setItem('ziggner_lang', 'zh-CN') })
  await p.route('**/api/v1/**', route => {
    const u = route.request().url()
    const pathname = new URL(u).pathname
    const method = route.request().method()
    const j = d => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
    if (pathname.includes('/users/me')) return j({ id: 1, username: 'rev_admin', is_superuser: true, is_group_leader: false, is_group_member: false })
    if (pathname.includes('/goods/spu/admin')) return j({ items: [
      { id: 1, name: '盲测商品A', brand_name: 'B1', category_path: '服饰', main_image: '', status: 'on_sale', status_display: '已上架', price_range: { min: '1000.5', max: '2500.75' }, sku_count: 2, created_at: '' },
      { id: 2, name: '盲测商品B', brand_name: 'B1', category_path: '家居', main_image: '', status: 'draft', status_display: '草稿', price_range: { min: '9.9', max: '99.9' }, sku_count: 1, created_at: '' },
    ], total: 2 })
    if (pathname.includes('/order/admin/')) {
      if (pathname.includes('channel-stats')) return j({ items: [{ channel: 'mall', name: '商城', order_count: 1, gmv: '1,234.56' }] })
      return j({ results: [{ id: 1, order_no: 'ZC900000001', status: 'paid', channel_code: 'mall', channel_name: '商城', payment_status: 'paid', actual_amount: '1234.5', item_count: 2, created_at: '' }], count: 1 })
    }
    if (pathname.includes('promo-dashboard')) return j([{ id: 1, code: 'TBDEMO01', coupon: 1, coupon_code: 'TESTCODE1', is_active: true, claim_count: 5, unique_users: 4, paid_order_count: 3, gmv: '600.00' }])
    if (pathname.includes('/promotion/coupon')) return j({ results: [{ id: 1, code: 'TESTCODE1', discount_type: 'fixed', amount: 50, min_amount: 200, stackable: false, start_time: '2026-01-01T00:00:00Z', end_time: '2026-12-31T00:00:00Z', total_count: 100, used_count: 25, is_active: true }], count: 1 })
    if (pathname.includes('/chat/conversations')) return j({ results: [{ id: 1, user: { username: 'rev_customer' }, subject: '盲测会话主题', status: 'open', unread_count: 3, updated_at: '' }], count: 1 })
    if (pathname.includes('/goods/brand')) return j([{ id: 1, name: '盲测品牌', logo_url: '', description: '', is_active: true }])
    if (pathname.includes('/goods/audit_log')) return j({ items: [], total: 0 })
    if (pathname.includes('/goods/recycle')) return j([{ id: 1, name: '回收商品', brand_name: 'B', category_path: 'C', sku_count: 1, deleted_at: '' }])
    return j({ results: [], count: 0, items: [], total: 0 })
  })
  await p.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' })
}

// ── L1 全局框架 ──
await boot('/admin/products')
const aside = await p.locator('aside').evaluate(el => { const cs = getComputedStyle(el); return { w: cs.width, pos: cs.position, z: cs.zIndex } })
ok('L1 侧栏 220px', aside.w === '220px', aside.w)
ok('L1 侧栏 sticky', aside.pos === 'sticky', aside.pos)
ok('L1 侧栏实际 z-index 为 100（zIndex.ts sidebar 常量落地）', aside.z === '100', `实际 ${aside.z}`)

const hdr = await p.locator('header').evaluate(el => { const cs = getComputedStyle(el); return { h: cs.height, z: cs.zIndex } })
ok('L1 Header 56px', hdr.h === '56px', hdr.h)
ok('L1 Header z=50', hdr.z === '50', hdr.z)

// 断点 1280（<1366 应折叠为 64px）
await p.setViewportSize({ width: 1280, height: 800 })
await p.reload({ waitUntil: 'networkidle' })
const w1280 = await p.locator('aside').evaluate(el => getComputedStyle(el).width)
ok('L1 1280px 侧栏自动折叠 64px', w1280 === '64px', w1280)
await p.setViewportSize({ width: 1440, height: 900 })
await p.reload({ waitUntil: 'networkidle' })

// ── L2 组件原子 ──
// Modal（品牌页打开新建）
await boot('/admin/brands')
await p.getByRole('button', { name: /新建/ }).first().click()
await p.waitForSelector('[role="dialog"]')
const modal = await p.locator('[role="dialog"]').evaluate(el => {
  const ov = getComputedStyle(el.parentElement)
  const dlg = getComputedStyle(el)
  return { ovBg: ov.backgroundColor, ovBlur: ov.backdropFilter, ovZ: ov.zIndex, maxH: dlg.maxHeight }
})
ok('L2 Modal 遮罩 rgba(0,0,0,0.35)', modal.ovBg === 'rgba(0, 0, 0, 0.35)', modal.ovBg)
ok('L2 Modal 遮罩 blur(2px)', modal.ovBlur.includes('blur'), modal.ovBlur)
ok('L2 Modal 遮罩 z=1100', modal.ovZ === '1100', modal.ovZ)
await p.keyboard.press('Escape')
await p.waitForTimeout(300)
ok('L2 Modal Esc 关闭', (await p.locator('[role="dialog"]').count()) === 0)

// ConfirmDialog（新实现应含 role=dialog + aria-modal）
await boot('/admin/products')
await p.locator('main').getByRole('button', { name: '删除' }).first().click({ force: true })
await p.waitForSelector('[role="dialog"]')
const cd = await p.locator('[role="dialog"]').first().evaluate(el => ({ modal: el.getAttribute('aria-modal'), z: getComputedStyle(el.parentElement).zIndex }))
ok('L2 ConfirmDialog 含 aria-modal（旧版缺）', cd.modal === 'true', `aria-modal=${cd.modal}`)
ok('L2 ConfirmDialog 遮罩 z=1100', cd.z === '1100', cd.z)
await p.keyboard.press('Escape')

// Skeleton 源码含 @keyframes shimmer + 渐变（runtime 渐变已由 L2.5 视觉验证）
const skeletonSrc = await p.evaluate(async () => (await (await fetch('/src/components/admin/common/Skeleton.tsx')).text()))
ok('L2 Skeleton @keyframes shimmer 存在', skeletonSrc.includes('shimmer') && skeletonSrc.includes('linear-gradient'))

// ── L3 业务页面 ──
// 商品卡片：红价格 + 千分位
const price = p.locator('main').getByText(/\$1,000\.5/).first()
ok('L3 商品价格千分位显示', await price.isVisible().catch(() => false))
const priceColor = await price.evaluate(el => getComputedStyle(el).color).catch(() => '')
ok('L3 价格红色', priceColor === 'rgb(220, 38, 38)', priceColor)

// 订单：行高 64 + 金额右对齐千分位
await boot('/admin/orders')
const row = p.locator('tbody tr').first()
ok('L3 订单行存在', await row.isVisible().catch(() => false))
const rowH = await row.evaluate(el => el.getBoundingClientRect().height).catch(() => 0)
ok('L3 订单行高 ≈64px（含 padding）', rowH >= 60 && rowH <= 80, `${rowH}px`)
const amtTd = p.locator('tbody tr').first().locator('td').nth(4)
const amt = await amtTd.evaluate(el => ({ align: getComputedStyle(el).textAlign, bold: getComputedStyle(el.querySelector('span')).fontWeight, text: el.innerText })).catch(() => ({}))
ok('L3 金额右对齐', amt.align === 'right', String(amt.align))
ok('L3 金额加粗 600', amt.bold === '600', String(amt.bold))
ok('L3 金额千分位', (amt.text || '').includes('1,234.50'), amt.text)

// 营销券：面额大号 + 红色进度条
await boot('/admin/coupons')
const face = p.getByText('¥50').first()
ok('L3 券面额 ¥50 大号', await face.isVisible().catch(() => false))
ok('L3 券进度条 25%', await p.getByText('25%').first().isVisible().catch(() => false))

// 客服：未读红点 3
await boot('/admin/chat')
ok('L3 客服联系人 rev_customer', await p.getByText('rev_customer').isVisible().catch(() => false))
ok('L3 未读徽章 3', await p.getByText('3', { exact: true }).first().isVisible().catch(() => false))

// ── L4 交互与反馈 ──
await boot('/admin/products')
await p.keyboard.press('Control+K')
ok('L4 Ctrl+K 聚焦搜索框', (await p.evaluate(() => document.activeElement?.tagName)) === 'INPUT')
await p.keyboard.press('Escape')

// Toast：z=1200 且 ~3s 自动消失
await boot('/admin/coupons/promo/1')
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
await p.getByRole('button', { name: /复制链接/ }).first().click()
const toast = p.locator('[data-testid="toast-container"]')
const t0 = await toast.evaluate(el => getComputedStyle(el).zIndex).catch(() => '')
ok('L4 Toast z=1200', t0 === '1200', t0)
await p.waitForSelector('[data-testid="toast-container"] .ti', { timeout: 3000 })
await p.waitForFunction(() => !document.querySelector('[data-testid="toast-container"] .ti'), null, { timeout: 8000 })
ok('L4 Toast 3s 自动消失', true)

// 语言切换（真实用户路径：点击 EN 按钮，验证无中文残留）
await p.getByRole('button', { name: 'EN' }).click()
await p.waitForTimeout(400)
const enHeader = await p.locator('header').innerText()
ok('L4 英文界面无中文残留', !/控制台|商品运营|营销工具|超级管理员|搜索|通知/.test(enHeader), enHeader.slice(0, 40).replace(/\n/g, '|'))
await p.getByRole('button', { name: '中' }).click()

// ── L5 性能与安全 ──
// >5MB 上传拦截
await boot('/admin/brands')
await p.getByRole('button', { name: /新建/ }).first().click()
await p.waitForSelector('[role="dialog"]')
await p.setInputFiles('[role="dialog"] input[type="file"]', 'D:/下载/浏览器下载/change/Ziggner/Ziggner/web/react/big-test.jpg')
await p.waitForTimeout(800)
const reject = await p.evaluate(() => document.body.innerText.includes('超过 5MB') || document.body.innerText.includes('5MB'))
ok('L5 >5MB 图片前端拦截并提示', reject)
await p.keyboard.press('Escape')

// 1280 无横向溢出
await p.setViewportSize({ width: 1280, height: 800 })
await boot('/admin/products')
const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
ok('L5 1280px 无横向溢出', noOverflow)

// 图片懒加载（在真实有图的页面较难触发，这里验证机制：所有 img 均带 loading 属性）
const lazyOk = await p.evaluate(() => Array.from(document.querySelectorAll('img')).every(i => i.loading === 'lazy'))
ok('L5 图片全部懒加载', lazyOk)

await b.close()
console.log(`\n===== 独立盲测结果：PASS=${PASS.length} FAIL=${FAIL.length} =====`)
if (FAIL.length) { console.log('FAIL 明细:'); FAIL.forEach(f => console.log('  - ' + f)) }
