import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation, LanguageSwitch } from '../../i18n'
import { adminAPI } from '../../api/admin'
import { adminChatAPI } from '../../api/chat'
import { useAllowedMenuPaths } from '../../components/admin/ProtectedRoute'
import NotificationBell from '../../components/admin/NotificationBell'
import NotificationFloat from '../../components/admin/common/NotificationFloat'

// ── Layout ──

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${Color.bg.page};
`

const Sidebar = styled.aside<{ $collapsed: boolean }>`
  width: ${({ $collapsed }) => ($collapsed ? '64px' : '220px')};
  background: #1a1a2e;
  color: #a0aec0;
  transition: width 0.2s;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const SidebarLogo = styled.div`
  padding: 20px 16px;
  font-family: 'Playfair Display', serif;
  font-size: 1.25rem;
  color: ${Color.text.inverse};
  border-bottom: 1px solid #16213e;
  white-space: nowrap;
`

const SidebarNav = styled.nav`
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
`

const SidebarSection = styled.div`
  padding: 12px 16px 4px;
  font-size: 0.688rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${Color.text.secondary};
  white-space: nowrap;
`

const SidebarLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  color: #a0aec0;
  text-decoration: none;
  font-size: 0.875rem;
  transition: ${Transition.fast};
  white-space: nowrap;
  border-left: 3px solid transparent;
  position: relative;

  &:hover {
    color: ${Color.text.inverse};
    background: rgba(255,255,255,0.04);
  }

  &.active {
    color: ${Color.text.inverse};
    background: rgba(200,98,58,0.1);
    border-left-color: #c8623a;
    font-weight: 500;
  }

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`

const SidebarBadge = styled.span`
  position: absolute;
  right: ${Spacing.md}px;
  top: 50%;
  transform: translateY(-50%);
  min-width: 8px;
  height: 8px;
  background: #e74c3c;
  border-radius: 50%;
`

const SidebarToggle = styled.button`
  padding: ${Spacing.md}px;
  background: none;
  border: none;
  border-top: 1px solid #16213e;
  color: #a0aec0;
  font-size: 0.75rem;
  cursor: pointer;
  text-align: center;
  transition: color 0.15s;

  &:hover {
    color: ${Color.text.inverse};
  }
`

// ── Header ──

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const Header = styled.header`
  height: 56px;
  background: ${Color.bg.card};
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const Breadcrumb = styled.span`
  font-size: 0.875rem;
  color: ${Color.text.muted};
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const UserMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: ${Color.primaryHover};
  cursor: pointer;
`

const Content = styled.main`
  flex: 1;
  padding: ${Spacing.xxl}px;
  overflow-y: auto;
`

const CollapseIcon = styled.span<{ $collapsed: boolean }>`
  display: inline-flex;
  align-items: center;
  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.2s;
    transform: ${({ $collapsed }) => ($collapsed ? 'rotate(180deg)' : 'rotate(0deg)')};
  }
`

const IconBox = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

// ── Menu Builder (uses t() inside component) ──

function useMenuItems() {
  const { t } = useTranslation()
  const allowedPaths = useAllowedMenuPaths()
  const isAllowed = (path: string) => allowedPaths.includes(path)

  const allItems = [
    {
      section: t('admin.layout.sidebar.productOps'),
      items: [
        { to: '/admin/products', label: t('admin.layout.menu.products'), icon: <IconBox><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></IconBox> },
        { to: '/admin/categories', label: t('admin.layout.menu.categories'), icon: <IconBox><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></IconBox> },
        { to: '/admin/brands', label: t('admin.layout.menu.brands'), icon: <IconBox><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></IconBox> },
        { to: '/admin/tags', label: t('admin.layout.menu.tags'), icon: <IconBox><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></IconBox> },
      ],
    },
    {
      section: t('admin.layout.sidebar.fulfillment'),
      items: [
        { to: '/admin/orders', label: t('admin.layout.menu.orders'), icon: <IconBox><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y="6" /><path d="M16 10a4 4 0 0 1-8 0" /></IconBox> },
      ],
    },
    {
      section: t('admin.layout.sidebar.communication'),
      items: [
        { to: '/admin/chat', label: t('admin.layout.menu.chat'), icon: <IconBox><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></IconBox> },
        { to: '/admin/notifications', label: t('admin.layout.menu.notifications'), icon: <IconBox><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></IconBox> },
        { to: '/admin/applications', label: t('admin.layout.menu.applications'), icon: <IconBox><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></IconBox> },
      ],
    },
    {
      section: t('admin.layout.sidebar.marketing'),
      items: [
        { to: '/admin/coupons', label: t('admin.layout.menu.coupons'), icon: <IconBox><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></IconBox> },
        { to: '/admin/activities', label: t('admin.layout.menu.activities'), icon: <IconBox><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></IconBox> },
      ],
    },
    {
      section: t('admin.layout.sidebar.systemMgmt'),
      items: [
        { to: '/admin/groups', label: t('admin.layout.menu.groups'), icon: <IconBox><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconBox> },
        { to: '/admin/audit-logs', label: t('admin.layout.menu.auditLogs'), icon: <IconBox><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></IconBox> },
        { to: '/admin/recycle-bin', label: t('admin.layout.menu.recycleBin'), icon: <IconBox><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></IconBox> },
        { to: '/admin/tasks', label: t('admin.layout.menu.asyncTasks'), icon: <IconBox><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></IconBox> },
        { to: '/admin/email-templates', label: t('admin.layout.menu.emailTemplates'), icon: <IconBox><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></IconBox> },
      ],
    },
  ]

  // 过滤掉当前用户无权访问的菜单项，并移除空的分组
  return allItems
    .map(group => ({
      ...group,
      items: group.items.filter(item => isAllowed(item.to)),
    }))
    .filter(group => group.items.length > 0)
}

export default function AdminLayout() {
  const { t } = useTranslation()
  const { adminUser, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true')
  const [chatOpenCount, setChatOpenCount] = useState(0)
  const isMountedRef = useRef(true)

  // Auto-collapse sidebar on viewport < 1366px
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1366px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setCollapsed(true)
        localStorage.setItem('admin_sidebar_collapsed', 'true')
      }
    }
    handler(mql)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const menuItems = useMenuItems()

  // 初始获取在线客服未处理数
  useEffect(() => {
    adminChatAPI.getOpenCount()
      .then((res: unknown) => {
        if (!isMountedRef.current) return
        const data = res as { count: number }
        setChatOpenCount(data.count || 0)
      })
      .catch(() => {})
  }, [])

  // 轮询 — 60s 间隔，防止请求洪水
  useEffect(() => {
    // 延迟 60s 后再开始轮询，避免与初始 fetch 重叠
    const initialTimer = setTimeout(() => {
      const fetchChatOpen = () => {
        if (!isMountedRef.current) return
        adminChatAPI.getOpenCount()
          .then((res: unknown) => {
            if (!isMountedRef.current) return
            const data = res as { count: number }
            setChatOpenCount(prev => {
              const next = data.count || 0
              return prev !== next ? next : prev
            })
          })
          .catch(() => {})
      }
      fetchChatOpen()
      const interval = setInterval(() => {
        fetchChatOpen()
      }, 60000) // 60s
      return () => clearInterval(interval)
    }, 60000)

    return () => {
      isMountedRef.current = false
      clearTimeout(initialTimer)
    }
  }, [])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('admin_sidebar_collapsed', String(next))
  }

  const handleLogout = () => {
    // 调用后端 logout 接口使 token 失效（fire-and-forget）
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

  return (
    <Layout>
      <Sidebar $collapsed={collapsed}>
        <SidebarLogo>{collapsed ? 'Z' : 'Ziggner'}</SidebarLogo>
        <SidebarNav>
          {menuItems.map((group) => (
            <div key={group.section}>
              {!collapsed && <SidebarSection>{group.section}</SidebarSection>}
              {group.items.map((item) => (
                <SidebarLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}>
                  {item.icon}
                  {!collapsed && item.label}
                  {item.to === '/admin/chat' && chatOpenCount > 0 && (
                    collapsed ? (
                      <SidebarBadge style={{ right: 4, top: 6, transform: 'none' }} />
                    ) : (
                      <SidebarBadge />
                    )
                  )}
                </SidebarLink>
              ))}
            </div>
          ))}
        </SidebarNav>
        <SidebarToggle onClick={toggleSidebar}>
          <CollapseIcon $collapsed={collapsed}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </CollapseIcon>
          {!collapsed && ` ${t('admin.layout.header.collapse')}`}
        </SidebarToggle>
      </Sidebar>

      <MainArea>
        <Header>
          <HeaderLeft>
            <Breadcrumb>{(() => {
              const p = location.pathname;
              const map: Record<string, string> = {
                '/admin': 'admin.breadcrumb.home',
                '/admin/products': 'admin.breadcrumb.products',
                '/admin/categories': 'admin.breadcrumb.categories',
                '/admin/brands': 'admin.breadcrumb.brands',
                '/admin/tags': 'admin.breadcrumb.tags',
                '/admin/orders': 'admin.breadcrumb.orders',
                '/admin/chat': 'admin.breadcrumb.chat',
                '/admin/notifications': 'admin.breadcrumb.notifications',
                '/admin/applications': 'admin.breadcrumb.applications',
                '/admin/coupons': 'admin.breadcrumb.coupons',
                '/admin/activities': 'admin.breadcrumb.activities',
                '/admin/audit-logs': 'admin.breadcrumb.auditLogs',
                '/admin/recycle-bin': 'admin.breadcrumb.recycleBin',
                '/admin/groups': 'admin.breadcrumb.groups',
                '/admin/tasks': 'admin.breadcrumb.tasks',
                '/admin/email-templates': 'admin.breadcrumb.emailTemplates',
              };
              // build hierarchy: home › group › page
              const parts = p.split('/').filter(Boolean);
              if (parts.length <= 1) return t('admin.breadcrumb.home');
              const labelKey = map[p] || parts[parts.length - 1];
              const label = t(labelKey);
              const groupMap: Record<string, string> = {
                'products': 'admin.layout.sidebar.productOps', 'categories': 'admin.layout.sidebar.productOps', 'brands': 'admin.layout.sidebar.productOps', 'tags': 'admin.layout.sidebar.productOps',
                'orders': 'admin.layout.sidebar.fulfillment', 'chat': 'admin.layout.sidebar.communication', 'notifications': 'admin.layout.sidebar.communication', 'applications': 'admin.layout.sidebar.communication',
                'coupons': 'admin.layout.sidebar.marketing', 'activities': 'admin.layout.sidebar.marketing',
                'audit-logs': 'admin.layout.sidebar.systemMgmt', 'recycle-bin': 'admin.layout.sidebar.systemMgmt', 'groups': 'admin.layout.sidebar.systemMgmt', 'tasks': 'admin.layout.sidebar.systemMgmt',
              };
              const groupKey = groupMap[parts[1]] || '';
              const groupLabel = groupKey ? t(groupKey) : '';
              return groupLabel ? `${t('admin.breadcrumb.home')} › ${groupLabel} › ${label}` : `${t('admin.breadcrumb.home')} › ${label}`;
            })()}</Breadcrumb>
          </HeaderLeft>
          <HeaderRight>
            <LanguageSwitch position="header" />
            <NotificationBell />
            <NotificationFloat />
            <UserMenu onClick={handleLogout}>
              {adminUser?.username}
              <span style={{ color: '#999', fontSize: '0.75rem' }}>
                ({roleLabel})
              </span>
            </UserMenu>
          </HeaderRight>
        </Header>
        <Content>
          <Outlet />
        </Content>
      </MainArea>
    </Layout>
  )
}