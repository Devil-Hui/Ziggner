import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, FontWeight, Transition, FluidSpace } from '../../theme/tokens'
import { ZIndex } from '../../theme/zIndex'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation, LanguageSwitch } from '../../i18n'
import { adminAPI, type SPUItem } from '../../api/admin'
import { orderAPI, type OrderSummary } from '../../api/order'
import { useAllowedMenuPaths } from '../../components/admin/ProtectedRoute'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { Icon } from '../../components/admin/common/Icon'
import { TaskCenter } from '../../components/admin/TaskCenter'
import { CommandPalette, type PaletteSection } from '../../components/admin/CommandPalette'
import { ToastProvider, toast } from '../../components/admin/common/Toast'
import { Badge, Avatar } from '../../components/admin/common'

/* ───────────────────────── 布局骨架 ───────────────────────── */

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${Color.bg.page};
`

/* ── 侧边栏（桌面 sticky，独立滚动容器） ── */
const Sidebar = styled.aside<{ $collapsed: boolean }>`
  position: sticky;
  top: 0;
  height: 100vh;
  width: ${({ $collapsed }) => ($collapsed ? '64px' : '200px')};
  flex-shrink: 0;
  z-index: ${ZIndex.sidebar};
  background: #1a1a2e;
  color: #a0aec0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.2s ease;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
`

const SidebarLogo = styled.div`
  padding: 20px 16px;
  font-family: 'Playfair Display', serif;
  font-size: 1.25rem;
  color: ${Color.text.inverse};
  border-bottom: 1px solid #16213e;
  white-space: nowrap;
  flex-shrink: 0;
`

const SidebarNav = styled.nav`
  flex: 1;
  padding: 8px 0;
`

const SidebarSection = styled.div`
  padding: 12px 16px 4px;
  font-size: 0.688rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${Color.text.secondary};
  white-space: nowrap;
`

// 双行菜单项：图标 24px 居中 + 文字 14px 居下
const SidebarLink = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 8px;
  margin: 2px 8px;
  border-radius: ${Radius.md}px;
  color: #a0aec0;
  text-decoration: none;
  font-size: 14px;
  transition: background ${Transition.fast};
  border-left: 3px solid transparent;
  text-align: center;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    color: #fff;
  }

  &.active {
    background: rgba(26, 86, 219, 0.08);
    border-left: 3px solid #1a56db;
    color: #fff;
    font-weight: ${FontWeight.medium};
  }

  svg { width: 24px; height: 24px; flex-shrink: 0; }
  .lbl { line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
`

const SidebarToggle = styled.button`
  padding: 12px;
  background: none;
  border: none;
  border-top: 1px solid #16213e;
  color: #a0aec0;
  font-size: 0.75rem;
  cursor: pointer;
  text-align: center;
  flex-shrink: 0;
  transition: color 0.15s;

  &:hover { color: #fff; }
`

/* ── 主区 ── */
const MainArea = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: ${ZIndex.header};
  height: 56px;
  background: #fff;
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  gap: ${Spacing.md}px;
  padding: 0 ${FluidSpace.pad};
  flex-shrink: 0;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.md}px;
  min-width: 0;
`

const Hamburger = styled.button`
  display: none;
  border: none;
  background: none;
  cursor: pointer;
  color: ${Color.text.secondary};
  padding: 4px;

  @media (max-width: 767.98px) { display: inline-flex; }
`

const Breadcrumb = styled.span`
  font-size: 0.875rem;
  color: ${Color.text.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.md}px;
  margin-left: auto;
  flex-shrink: 0;
`

/* ── 全局搜索 ── */
const SearchWrap = styled.div`
  position: relative;
`

const SearchInput = styled.input`
  width: 240px;
  height: 32px;
  padding: 0 12px 0 32px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 20px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }

  &::placeholder { color: ${Color.text.muted}; }
`

const SearchIconWrap = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${Color.text.muted};
  display: inline-flex;
`

const SearchDropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 360px;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.dropdown};
  z-index: ${ZIndex.dropdown};
  padding: 6px 0;
`

const GroupTitle = styled.div`
  padding: 8px 14px 4px;
  font-size: 11px;
  font-weight: ${FontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${Color.text.muted};
`

const SearchItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background ${Transition.fast};

  &:hover { background: ${Color.bg.page}; }

  img {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
    background: ${Color.bg.page};
    flex-shrink: 0;
  }

  .t { font-size: ${FontSize.sm}px; color: ${Color.text.body}; }
  .s { font-size: ${FontSize.xs}px; color: ${Color.text.muted}; }
`

/* ── 通知铃 ── */
const BellWrap = styled.div`
  position: relative;
`

const BellBtn = styled.button`
  position: relative;
  border: none;
  background: none;
  cursor: pointer;
  color: ${Color.text.secondary};
  padding: 6px;
  display: inline-flex;
  border-radius: ${Radius.sm}px;
  transition: all ${Transition.fast};

  &:hover { background: ${Color.bg.page}; color: ${Color.primary}; }
`

const BellDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  max-height: 380px;
  overflow-y: auto;
  background: #fff;
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.dropdown};
  z-index: ${ZIndex.dropdown};
  padding: 6px 0;
`

const BellHeader = styled.div`
  padding: 8px 14px;
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.text.heading};
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const BellItem = styled.button<{ $unread: boolean }>`
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: ${({ $unread }) => ($unread ? '#f8fafc' : 'none')};
  cursor: pointer;
  text-align: left;
  transition: background ${Transition.fast};

  &:hover { background: ${Color.bg.page}; }

  .t { font-size: ${FontSize.sm}px; color: ${Color.text.body}; }
  .s { font-size: ${FontSize.xs}px; color: ${Color.text.muted}; margin-top: 2px; }
`

const BellEmpty = styled.div`
  padding: 20px;
  text-align: center;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`

const BellFooter = styled.div`
  padding: 8px 14px;
  border-top: 1px solid ${Color.border.light};
  text-align: center;

  a {
    font-size: ${FontSize.sm}px;
    color: ${Color.primary};
    text-decoration: none;
    cursor: pointer;

    &:hover { text-decoration: underline; }
  }
`

/* ── 用户菜单 ── */
const UserMenu = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;
  border-radius: ${Radius.md}px;
  transition: background ${Transition.fast};

  &:hover { background: ${Color.bg.page}; }
`

const UserDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: #fff;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.dropdown};
  padding: 6px 0;
  z-index: ${ZIndex.dropdown};
`

const UserDropdownInfo = styled.div`
  padding: 8px 14px;
  border-bottom: 1px solid ${Color.border.light};
`

const UserDropdownName = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${Color.text.primary};
`

const UserDropdownRole = styled.div`
  font-size: 0.75rem;
  color: ${Color.text.muted};
  margin-top: 2px;
`

const UserDropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 8px 14px;
  text-align: left;
  font-size: 0.8125rem;
  color: ${Color.text.primary};
  background: transparent;
  border: none;
  cursor: pointer;

  &:hover { background: ${Color.primaryLight}; }
`

const DropdownBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${ZIndex.dropdown - 1};
`

/* ── 上下文操作栏 ── */
const ActionBar = styled.div`
  position: sticky;
  top: 56px;
  z-index: ${ZIndex.header - 1};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${Spacing.md}px;
  flex-wrap: wrap;
  background: #f9fafb;
  padding: 12px 24px;
  border-bottom: 1px solid ${Color.border.light};
  flex-shrink: 0;
`

const ActionLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.sm}px;
  flex-wrap: wrap;
`

const ActionRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.sm}px;
  flex-wrap: wrap;
`

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.medium};
  border-radius: ${Radius.sm}px;
  border: 1px solid ${Color.primary};
  background: ${Color.primary};
  color: #fff;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover { background: ${Color.primaryHover}; }
`

const ActionGhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: #fff;
  color: ${Color.text.secondary};
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }
`

const Content = styled.main`
  flex: 1;
  padding: ${FluidSpace.pad};
  overflow-y: auto;

  @media (max-width: 767.98px) {
    padding: 16px;
  }
`

/* ── 移动端左侧导航抽屉 ── */
const MobileDrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: ${ZIndex.drawer};
`

const MobileDrawer = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 260px;
  background: #1a1a2e;
  color: #a0aec0;
  z-index: ${ZIndex.drawer};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  animation: slideInLeft 0.28s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
`

/* ── 菜单构建 ── */
function useMenuItems() {
  const { t } = useTranslation()
  const allowedPaths = useAllowedMenuPaths()
  const isAllowed = (path: string) => allowedPaths.includes(path)

  const allItems: { section: string; items: { to: string; label: string; icon: string }[] }[] = [
    {
      section: t('admin.layout.sidebar.dashboard'),
      items: [
        { to: '/admin/dashboard', label: t('admin.layout.sidebar.dashboard'), icon: 'grid' },
      ],
    },
    {
      section: t('admin.layout.sidebar.productOps'),
      items: [
        { to: '/admin/products', label: t('admin.layout.menu.products'), icon: 'package' },
        { to: '/admin/categories', label: t('admin.layout.menu.categories'), icon: 'grid' },
        { to: '/admin/brands', label: t('admin.layout.menu.brands'), icon: 'brand' },
        { to: '/admin/tags', label: t('admin.layout.menu.tags'), icon: 'tag' },
      ],
    },
    {
      section: t('admin.layout.sidebar.fulfillment'),
      items: [
        { to: '/admin/orders', label: t('admin.layout.menu.orders'), icon: 'box' },
      ],
    },
    {
      section: t('admin.layout.sidebar.communication'),
      items: [
        { to: '/admin/chat', label: t('admin.layout.menu.chat'), icon: 'message-circle' },
        { to: '/admin/notifications', label: t('admin.layout.menu.notifications'), icon: 'bell' },
        { to: '/admin/applications', label: t('admin.layout.menu.applications'), icon: 'file' },
      ],
    },
    {
      section: t('admin.layout.sidebar.marketing'),
      items: [
        { to: '/admin/coupons', label: t('admin.layout.menu.coupons'), icon: 'card' },
        { to: '/admin/activities', label: t('admin.layout.menu.activities'), icon: 'trending' },
      ],
    },
    {
      section: t('admin.layout.sidebar.systemMgmt'),
      items: [
        { to: '/admin/groups', label: t('admin.layout.menu.groups'), icon: 'users' },
        { to: '/admin/audit-logs', label: t('admin.layout.menu.auditLogs'), icon: 'edit' },
        { to: '/admin/recycle-bin', label: t('admin.layout.menu.recycleBin'), icon: 'trash' },
        { to: '/admin/tasks', label: t('admin.layout.menu.asyncTasks'), icon: 'clock' },
        { to: '/admin/rbac', label: t('admin.layout.menu.rbac'), icon: 'shield' },
        { to: '/admin/email-templates', label: t('admin.layout.menu.emailTemplates'), icon: 'mail' },
      ],
    },
  ]

  return allItems
    .map(group => ({ ...group, items: group.items.filter(item => isAllowed(item.to)) }))
    .filter(group => group.items.length > 0)
}

/* ── 面包屑映射 ── */
const BREADCRUMB_MAP: Record<string, string> = {
  '/admin': 'admin.layout.breadcrumb.home',
  '/admin/dashboard': 'admin.layout.breadcrumb.dashboard',
  '/admin/products': 'admin.layout.breadcrumb.products',
  '/admin/categories': 'admin.layout.breadcrumb.categories',
  '/admin/brands': 'admin.layout.breadcrumb.brands',
  '/admin/tags': 'admin.layout.breadcrumb.tags',
  '/admin/orders': 'admin.layout.breadcrumb.orders',
  '/admin/chat': 'admin.layout.breadcrumb.chat',
  '/admin/notifications': 'admin.layout.breadcrumb.notifications',
  '/admin/applications': 'admin.layout.breadcrumb.applications',
  '/admin/coupons': 'admin.layout.breadcrumb.coupons',
  '/admin/activities': 'admin.layout.breadcrumb.activities',
  '/admin/audit-logs': 'admin.layout.breadcrumb.auditLogs',
  '/admin/recycle-bin': 'admin.layout.breadcrumb.recycleBin',
  '/admin/groups': 'admin.layout.breadcrumb.groups',
  '/admin/tasks': 'admin.layout.breadcrumb.tasks',
  '/admin/rbac': 'admin.layout.breadcrumb.rbac',
  '/admin/email-templates': 'admin.layout.breadcrumb.emailTemplates',
}

const GROUP_MAP: Record<string, string> = {
  products: 'admin.layout.sidebar.productOps',
  categories: 'admin.layout.sidebar.productOps',
  brands: 'admin.layout.sidebar.productOps',
  tags: 'admin.layout.sidebar.productOps',
  orders: 'admin.layout.sidebar.fulfillment',
  chat: 'admin.layout.sidebar.communication',
  notifications: 'admin.layout.sidebar.communication',
  applications: 'admin.layout.sidebar.communication',
  coupons: 'admin.layout.sidebar.marketing',
  activities: 'admin.layout.sidebar.marketing',
  'audit-logs': 'admin.layout.sidebar.systemMgmt',
  'recycle-bin': 'admin.layout.sidebar.systemMgmt',
  groups: 'admin.layout.sidebar.systemMgmt',
  tasks: 'admin.layout.sidebar.systemMgmt',
  rbac: 'admin.layout.sidebar.systemMgmt',
}

/* ── 上下文操作栏配置（对接真实路由） ── */
function useActionBar() {
  const { t } = useTranslation()
  const path = useLocation().pathname

  const configs: { match: RegExp; moduleKey: string; left: { label: string; to?: string; action?: () => void; primary?: boolean }[] }[] = [
    {
      match: /^\/admin\/products/,
      moduleKey: 'products',
      left: [
        { label: '新建商品', to: '/admin/products/create', primary: true },
        { label: '批量导入', to: '/admin/import' },
        { label: '回收站', to: '/admin/recycle-bin' },
      ],
    },
    {
      match: /^\/admin\/orders/,
      moduleKey: 'orders',
      left: [
        { label: '订单', to: '/admin/orders', primary: true },
      ],
    },
    {
      match: /^\/admin\/coupons/,
      moduleKey: 'coupons',
      left: [],
    },
    {
      match: /^\/admin\/chat/,
      moduleKey: 'chat',
      left: [{ label: '刷新会话', action: () => window.dispatchEvent(new CustomEvent('admin:chat-refresh')) }],
    },
    {
      match: /^\/admin\/rbac/,
      moduleKey: 'rbac',
      left: [],
    },
  ]

  const found = configs.find(c => c.match.test(path))

  return {
    left: found?.left ?? [],
    right: [
      { label: '最近更新', to: '/admin/tasks' },
      { label: '帮助文档', action: () => toast.info('帮助文档开发中') },
    ],
  }
}

interface NotificationRow {
  id: number
  type: string
  title: string
  content: string
  is_read: boolean
  created_at: string
}

/* ───────────────────────── 主组件 ───────────────────────── */

export default function AdminLayout() {
  const { t } = useTranslation()
  const { adminUser, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // 搜索
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchProducts, setSearchProducts] = useState<SPUItem[]>([])
  const [searchOrders, setSearchOrders] = useState<OrderSummary[]>([])
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // <1366 自动折叠
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1366px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) { setCollapsed(true); localStorage.setItem('admin_sidebar_collapsed', 'true') }
    }
    handler(mql)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // 移动端进入时默认不折叠展示（抽屉模式）
  useEffect(() => {
    if (isMobile) setMobileNavOpen(false)
  }, [location.pathname, isMobile])

  // 通知：进页拉取 + 60s 轮询
  useEffect(() => {
    let alive = true
    const fetchNotifs = () => {
      adminAPI.getNotifications({ page: 1, per_page: 5 })
        .then((res: unknown) => {
          if (!alive) return
          const data = res as { results?: NotificationRow[]; items?: NotificationRow[] }
          setNotifications(data?.results ?? data?.items ?? [])
        })
        .catch(() => {})
      adminAPI.getUnreadCount?.()
        .then((res: unknown) => {
          if (!alive) return
          const d = res as { unread_count?: number }
          setUnreadCount(d?.unread_count ?? 0)
        })
        .catch(() => {})
    }
    fetchNotifs()
    const timer = setTimeout(() => {
      fetchNotifs()
      notifInterval.current = setInterval(fetchNotifs, 60000)
    }, 60000)
    return () => { alive = false; clearTimeout(timer); clearInterval(notifInterval.current) }
  }, [])

  // 全局快捷键：Ctrl+K 聚焦搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // 全局搜索：防抖 300ms，并联查询商品/订单
  useEffect(() => {
    const kw = searchText.trim()
    if (kw.length < 2) { setSearchProducts([]); setSearchOrders([]); return }
    setSearchLoading(true)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        const [spuRes, orderRes] = await Promise.allSettled([
          adminAPI.getSPUs({ search: kw, page: 1, size: 5 }),
          orderAPI.adminList({ search: kw, page: 1, size: 5 }),
        ])
        const spu = spuRes.status === 'fulfilled' ? (spuRes.value as { results?: SPUItem[] }) : {}
        const ord = orderRes.status === 'fulfilled' ? (orderRes.value as { results?: OrderSummary[] }) : {}
        setSearchProducts(spu?.results ?? [])
        setSearchOrders(ord?.results ?? [])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchText])

  const menuItems = useMenuItems()

  // 命令面板（⌘K）：导航 + 常用操作（不抢现有头部搜索的 Ctrl+K）
  const paletteSections: PaletteSection[] = [
    {
      title: '导航',
      items: menuItems.flatMap(g => g.items.map(m => ({
        id: m.to,
        label: m.label,
        icon: '→',
        keywords: m.label,
        onSelect: () => { setPaletteOpen(false); navigate(m.to) },
      }))),
    },
    {
      title: '操作',
      items: [
        { id: 'act-product', label: '新建商品', icon: '🛍️', keywords: 'create product', onSelect: () => { setPaletteOpen(false); navigate('/admin/products/create') } },
        { id: 'act-coupon', label: '创建优惠券', icon: '🎟️', keywords: 'coupon create', onSelect: () => { setPaletteOpen(false); navigate('/admin/coupons') } },
        { id: 'act-order', label: '查看订单', icon: '📦', keywords: 'orders', onSelect: () => { setPaletteOpen(false); navigate('/admin/orders') } },
        { id: 'act-chat', label: '客服工作台', icon: '💬', keywords: 'chat support', onSelect: () => { setPaletteOpen(false); navigate('/admin/chat') } },
        { id: 'act-recycle', label: '回收站', icon: '🗑️', keywords: 'trash recycle', onSelect: () => { setPaletteOpen(false); navigate('/admin/recycle-bin') } },
      ],
    },
  ]
  const actionBar = useActionBar()

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('admin_sidebar_collapsed', String(next))
  }

  const handleLogout = () => {
    adminAPI.logout().finally(() => {
      logout()
      navigate('/admin/login', { replace: true })
    })
  }

  const roleLabel = adminUser?.is_superuser
    ? t('admin.layout.header.superAdmin')
    : adminUser?.is_group_leader
    ? t('admin.layout.header.groupLeader')
    : t('admin.layout.header.member')

  // 面包屑
  const breadcrumb = (() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length <= 1) return t('admin.layout.breadcrumb.home')
    const labelKey = BREADCRUMB_MAP[location.pathname] || parts[parts.length - 1]
    const label = t(labelKey)
    const groupKey = GROUP_MAP[parts[1]]
    const groupLabel = groupKey ? t(groupKey) : ''
    return groupLabel ? `${t('admin.layout.breadcrumb.home')} › ${groupLabel} › ${label}` : `${t('admin.layout.breadcrumb.home')} › ${label}`
  })()

  const renderNav = (isCollapsed: boolean, onNavigate?: () => void) => (
    <SidebarNav>
      {menuItems.map(group => (
        <div key={group.section}>
          {!isCollapsed && <SidebarSection>{group.section}</SidebarSection>}
          {group.items.map(item => (
            <SidebarLink key={item.to} to={item.to} title={isCollapsed ? item.label : undefined} onClick={onNavigate}>
              <Icon name={item.icon as never} size={24} />
              {!isCollapsed && <span className="lbl">{item.label}</span>}
            </SidebarLink>
          ))}
        </div>
      ))}
    </SidebarNav>
  )

  return (
    <ToastProvider>
      <Layout>
        {/* 桌面侧边栏 */}
        {!isMobile && (
          <Sidebar $collapsed={collapsed}>
            <SidebarLogo>{collapsed ? 'Z' : 'Ziggner'}</SidebarLogo>
            {renderNav(collapsed)}
            <SidebarToggle onClick={toggleSidebar}>
              <Icon name="chevron-left" size={14} />
              {!collapsed && ` ${t('admin.layout.header.collapse')}`}
            </SidebarToggle>
          </Sidebar>
        )}

        {/* 移动端导航抽屉 */}
        {isMobile && mobileNavOpen && (
          <>
            <MobileDrawerOverlay onClick={() => setMobileNavOpen(false)} />
            <MobileDrawer>
              <SidebarLogo>Ziggner</SidebarLogo>
              {renderNav(false, () => setMobileNavOpen(false))}
            </MobileDrawer>
          </>
        )}

        <MainArea>
          <Header>
            <HeaderLeft>
              <Hamburger onClick={() => setMobileNavOpen(true)} aria-label="打开菜单">
                <Icon name="menu" size={20} />
              </Hamburger>
              <Breadcrumb>{breadcrumb}</Breadcrumb>
            </HeaderLeft>

            <HeaderRight>
              {/* 全局搜索 */}
              <SearchWrap>
                <SearchIconWrap><Icon name="search" size={16} /></SearchIconWrap>
                <SearchInput
                  ref={searchRef}
                  placeholder={searchText ? '' : '搜索商品 / 订单  (Ctrl+K)'}
                  value={searchText}
                  onChange={e => { setSearchText(e.target.value); setSearchOpen(true) }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setSearchOpen(false); searchRef.current?.blur() }
                  }}
                />
                {searchOpen && (searchText.trim().length >= 2 || searchLoading) && (
                  <SearchDropdown>
                    {searchLoading && <BellEmpty>搜索中…</BellEmpty>}
                    {!searchLoading && searchProducts.length === 0 && searchOrders.length === 0 && (
                      <BellEmpty>未找到匹配结果</BellEmpty>
                    )}
                    {!searchLoading && searchProducts.length > 0 && (
                      <>
                        <GroupTitle>商品</GroupTitle>
                        {searchProducts.map(p => (
                          <SearchItem key={p.id} onClick={() => { navigate('/admin/products'); setSearchOpen(false) }}>
                            {p.main_image ? <img src={p.main_image} alt="" loading="lazy" /> : <span className="s">📦</span>}
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                              <div className="s">{p.status_display ?? ''}</div>
                            </span>
                          </SearchItem>
                        ))}
                      </>
                    )}
                    {!searchLoading && searchOrders.length > 0 && (
                      <>
                        <GroupTitle>订单</GroupTitle>
                        {searchOrders.map(o => (
                          <SearchItem key={o.order_no} onClick={() => { navigate('/admin/orders'); setSearchOpen(false) }}>
                            <span className="s" style={{ fontSize: 13 }}>🧾</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <div className="t">{o.order_no}</div>
                              <div className="s">{o.channel_name ?? ''}</div>
                            </span>
                          </SearchItem>
                        ))}
                      </>
                    )}
                  </SearchDropdown>
                )}
              </SearchWrap>

              <LanguageSwitch position="header" />

              {/* 全局任务中心（↻ 任务 + 进度） */}
              <TaskCenter />

              {/* 命令面板入口（⌘K） */}
              <button
                onClick={() => setPaletteOpen(true)}
                aria-label="命令面板"
                style={{ height: 32, padding: '0 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}
              >
                ⌘K
              </button>

              {/* 通知铃（聚合未读） */}
              <BellWrap>
                <BellBtn onClick={() => setBellOpen(v => !v)} aria-label="通知">
                  <Badge count={unreadCount} max={99}>
                    <Icon name="bell" size={20} />
                  </Badge>
                </BellBtn>
                {bellOpen && (
                  <>
                    <DropdownBackdrop onClick={() => setBellOpen(false)} />
                    <BellDropdown>
                      <BellHeader>
                        <span>通知</span>
                        <span style={{ fontSize: 12, color: Color.text.muted }}>未读 {unreadCount}</span>
                      </BellHeader>
                      {notifications.length === 0 ? (
                        <BellEmpty>暂无通知</BellEmpty>
                      ) : (
                        notifications.map(n => (
                          <BellItem key={n.id} $unread={!n.is_read} onClick={() => { adminAPI.markRead(n.id).catch(() => {}); navigate('/admin/notifications'); setBellOpen(false) }}>
                            <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                            <div className="s" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>
                          </BellItem>
                        ))
                      )}
                      <BellFooter>
                        <a onClick={() => { navigate('/admin/notifications'); setBellOpen(false) }}>查看全部</a>
                      </BellFooter>
                    </BellDropdown>
                  </>
                )}
              </BellWrap>

              {/* 用户菜单 */}
              <UserMenu onClick={() => setUserMenuOpen(v => !v)}>
                <Avatar name={adminUser?.username} size={40} />
                <span style={{ fontSize: 14, color: Color.text.body }}>{adminUser?.username}</span>
                <span style={{ color: '#999', fontSize: 12 }}>({roleLabel})</span>
                {userMenuOpen && (
                  <>
                    <DropdownBackdrop onClick={() => setUserMenuOpen(false)} />
                    <UserDropdown>
                      <UserDropdownInfo>
                        <UserDropdownName>{adminUser?.username}</UserDropdownName>
                        <UserDropdownRole>{roleLabel}</UserDropdownRole>
                      </UserDropdownInfo>
                      <UserDropdownItem onClick={handleLogout}>{t('admin.layout.header.logout')}</UserDropdownItem>
                    </UserDropdown>
                  </>
                )}
              </UserMenu>
            </HeaderRight>
          </Header>

          {/* 上下文操作栏 */}
          <ActionBar>
            <ActionLeft>
              {actionBar.left.map((b, i) =>
                b.to ? (
                  b.primary ? (
                    <ActionBtn key={i} onClick={() => navigate(b.to!)}>{b.label}</ActionBtn>
                  ) : (
                    <ActionGhostBtn key={i} onClick={() => navigate(b.to!)}>{b.label}</ActionGhostBtn>
                  )
                ) : (
                  <ActionGhostBtn key={i} onClick={b.action}>{b.label}</ActionGhostBtn>
                ),
              )}
            </ActionLeft>
            <ActionRight>
              {actionBar.right.map((b, i) =>
                b.to ? (
                  <ActionGhostBtn key={i} onClick={() => navigate(b.to!)}>{b.label}</ActionGhostBtn>
                ) : (
                  <ActionGhostBtn key={i} onClick={b.action}>{b.label}</ActionGhostBtn>
                ),
              )}
            </ActionRight>
          </ActionBar>

          <Content>
            <Outlet />
          </Content>
        </MainArea>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} sections={paletteSections} />
      </Layout>
    </ToastProvider>
  )
}
