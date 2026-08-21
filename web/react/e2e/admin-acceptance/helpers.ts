/**
 * 管理后台验收 —— 测试数据 Mock 工具
 * ─────────────────────────────────
 * 后台登录需邮箱验证码 + Turnstile，自动化无法直接通过；
 * 采用「路由拦截 + 夹具数据」策略：在浏览器内拦截所有 /api/v1/ 请求，
 * 按路径返回对应夹具，从而在不依赖真实后端的情况下验收 UI 全部交互状态。
 * （验收范围 = UI/UX 五层，不覆盖后端契约；后端契约由 pytest 契约层负责。）
 */
import { type Page, type Route } from '@playwright/test'

export const ADMIN_USER = {
  id: 1,
  username: 'acceptance_admin',
  is_superuser: true,
  is_group_leader: false,
  is_group_member: false,
  group_name: null,
  group_id: null,
}

export const SPU_FIXTURES = [
  {
    id: 1,
    name: '验收测试商品 Alpha',
    brand_name: '验收品牌',
    category_path: '服饰 > 上衣',
    main_image: '',
    status: 'on_sale',
    status_display: '已上架',
    price_range: { min: '99.00', max: '199.00' },
    sku_count: 3,
    created_at: '2026-08-21T00:00:00Z',
  },
  {
    id: 2,
    name: '验收测试商品 Beta',
    brand_name: '验收品牌',
    category_path: '家居 > 收纳',
    main_image: '',
    status: 'draft',
    status_display: '草稿',
    price_range: { min: '29.00', max: '59.00' },
    sku_count: 1,
    created_at: '2026-08-21T00:00:00Z',
  },
]

export const ORDER_FIXTURES = {
  results: [
    {
      id: 11,
      order_no: 'ZC202608210001',
      status: 'paid',
      channel_code: 'mall',
      channel_name: '商城',
      payment_status: 'paid',
      actual_amount: '199.00',
      item_count: 2,
      created_at: '2026-08-21T02:00:00Z',
    },
    {
      id: 12,
      order_no: 'ZC202608210002',
      status: 'shipped',
      channel_code: 'TB-AMBASSADOR',
      channel_name: '代言人A',
      payment_status: 'paid',
      actual_amount: '88.50',
      item_count: 1,
      created_at: '2026-08-21T01:00:00Z',
    },
  ],
  count: 2,
}

export const COUPON_FIXTURES = [
  {
    id: 62,
    code: 'OW0JKYPM',
    discount_type: 'fixed',
    amount: 30,
    min_amount: 100,
    max_discount: null,
    stackable: false,
    start_time: '2026-08-01T00:00:00Z',
    end_time: '2026-12-31T00:00:00Z',
    total_count: 1000,
    per_user_limit: 1,
    claimed_count: 120,
    used_count: 45,
    is_active: true,
  },
]

export const TASK_FIXTURES = [
  { task_id: 'task-import-001', type: 'import', state: 'PROCESSING', progress: 60, created_at: '2026-08-21T00:00:00Z' },
  { task_id: 'task-export-002', type: 'export', state: 'SUCCESS', progress: 100, created_at: '2026-08-20T00:00:00Z' },
]

export const CHAT_FIXTURES = {
  results: [
    { id: 21, user: { username: 'customer_a' }, subject: '订单物流咨询', status: 'open', unread_count: 2, updated_at: '2026-08-21T03:00:00Z' },
    { id: 22, user: { username: 'customer_b' }, subject: '退换货问题', status: 'closed', unread_count: 0, updated_at: '2026-08-20T00:00:00Z' },
  ],
  count: 2,
}

export const RBAC_MATRIX_FIXTURE = {
  roles: [
    { value: 'superadmin', label: '超级管理员' },
    { value: 'ops', label: '运营' },
    { value: 'admin_leader', label: '组长' },
    { value: 'admin_member', label: '成员' },
  ],
  domains: [
    {
      domain: 'goods',
      permissions: [
        { code: 'goods.view', label: '查看商品' },
        { code: 'goods.write', label: '编辑商品' },
        { code: 'goods.audit', label: '审核商品' },
      ],
    },
    {
      domain: 'order',
      permissions: [
        { code: 'order.view', label: '查看订单' },
        { code: 'order.ship', label: '发货' },
      ],
    },
  ],
  grants: { ops: ['goods.view', 'goods.write'] },
  superadmin_implicit: true,
  orphaned: [],
}

export const NOTIFICATION_FIXTURES = {
  results: [
    { id: 31, type: 'system', title: '系统通知', content: '欢迎使用管理后台', is_read: false, created_at: '2026-08-21T00:00:00Z' },
    { id: 32, type: 'order', title: '新订单', content: '订单 ZC202608210001 待处理', is_read: true, created_at: '2026-08-20T00:00:00Z' },
  ],
  count: 2,
}

/** 按路径片段返回夹具；未匹配返回通用成功响应 */
export async function mockAdmin(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route: Route) => {
    const url = route.request().url()
    const method = route.request().method()
    const path = new URL(url).pathname
    const json = (data: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })

    // 认证：/users/me/
    if (path.includes('/users/me/')) return json(ADMIN_USER)

    // 商品
    if (path.includes('/goods/spu/admin') && method === 'GET') {
      const u = new URL(url)
      const q = u.searchParams.get('q')
      const s = u.searchParams.get('status')
      let items = SPU_FIXTURES
      if (q) items = items.filter(i => i.name.includes(q))
      if (s) items = items.filter(i => i.status === s)
      return json({ items, total: items.length })
    }

    // 订单
    if (path.includes('/order/admin/') && method === 'GET') {
      if (path.includes('channel-stats')) {
        return json({ items: [
          { channel: 'mall', name: '商城', order_count: 1, gmv: '199.00' },
          { channel: 'TB-AMBASSADOR', name: '代言人A', order_count: 1, gmv: '88.50' },
        ] })
      }
      if (path.includes('after-sale')) return json({ results: [], count: 0 })
      // 详情：路径 /order/admin/{order_no}/（排除 list / after-sale / channel-stats）
      const m = path.match(/\/order\/admin\/([^/]+)\/?$/)
      if (m && m[1] && !['admin', 'list', 'channel-stats', 'after-sale'].includes(m[1])) {
        return json({
          order_no: m[1],
          status: 'paid',
          payment_status: 'paid',
          actual_amount: '199.00',
          payment_method: 'mock',
          shipping_name: '张三',
          shipping_phone: '13800000000',
          tracking_no: 'SF1234567890',
          username: 'buyer1',
          user_id: 1,
          shipping_address: { province: '广东省', city: '深圳市', detail: '南山区 xx 路' },
          items: [{ id: 1, spu_id: 1, spu_name: '验收商品 Alpha', sku_code: 'SKU-1', price: '99.00', quantity: 2, subtotal: '198.00' }],
          after_sales: [],
        })
      }
      return json(ORDER_FIXTURES)
    }

    // 营销券
    if (path.includes('/promotion/coupon') && method === 'GET') {
      if (path.includes('promo-dashboard')) {
        return json([
          { id: 1, coupon: 62, coupon_code: 'OW0JKYPM', code: 'TBDEMO01', name: '代言人甲', note: '', is_active: true, claim_count: 10, unique_users: 8, paid_order_count: 5, gmv: '500.00', created_by_name: 'acceptance_admin', created_at: '2026-08-21T00:00:00Z', updated_at: '2026-08-21T00:00:00Z' },
        ])
      }
      return json({ results: COUPON_FIXTURES, count: COUPON_FIXTURES.length })
    }

    // 回收站
    if (path.includes('/goods/recycle')) {
      if (route.request().method() === 'GET') {
        return json([{ id: 1, name: '已删除商品', brand_name: 'B', category_path: 'C', sku_count: 1, deleted_at: '2026-08-20T00:00:00Z' }])
      }
      return json({ message: 'ok' })
    }

    // 品牌（数组响应）
    if (path.includes('/goods/brand') && method === 'GET') {
      return json([{ id: 1, name: '验收品牌', logo_url: '', description: '', is_active: true }])
    }

    // 异步任务：/goods/task（列表）与 /goods/task/{id}（进度）
    if (path.includes('/goods/task')) {
      const taskId = path.replace('/api/v1/goods/task/', '')
      if (taskId && taskId !== 'task' && !taskId.includes('/')) {
        return json({ task_id: taskId, state: 'PROCESSING', progress: 60 })
      }
      return json({ items: TASK_FIXTURES })
    }

    // 客服会话
    if (path.includes('/chat/conversations')) return json(CHAT_FIXTURES)

    // RBAC
    if (path.includes('/rbac/matrix')) return json(RBAC_MATRIX_FIXTURE)
    if (path.includes('/admin/users/')) return json({ results: [], count: 0 })

    // 通知
    if (path.includes('/notification/unread_count')) return json({ unread_count: 3 })
    if (path.includes('/notification/') && method === 'GET') return json(NOTIFICATION_FIXTURES)

    // 其余：成功空响应（避免 401 干扰 UI 渲染）
    return json({ results: [], count: 0, items: [], total: 0 })
  })
}

/** 直接以已登录超管身份进入后台页面（默认中文环境） */
export async function gotoAdmin(page: Page, path = '/admin/products'): Promise<void> {
  await mockAdmin(page)
  // 应用语言默认 en-US，测试统一注入 zh-CN（在页面脚本执行前生效）
  await page.addInitScript(() => {
    try { localStorage.setItem('ziggner_lang', 'zh-CN') } catch { /* noop */ }
  })
  await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' })
}
