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
import { Icon } from '../../components/admin/common/Icon'

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
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: ${Color.primaryHover};
  cursor: pointer;
`

const UserDropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 180px;
  background: #fff;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.md};
  padding: 6px 0;
  z-index: 100;
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
  &:hover {
    background: ${Color.primaryLight};
  }
`

const UserDropdownDivider = styled.div`
  height: 1px;
  background: ${Color.border.light};
  margin: 4px 0;
`

const DropdownBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99;
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

// ── Menu Builder (uses t() inside component) ──

function useMenuItems() {
  const { t } = useTranslation()
  const allowedPaths = useAllowedMenuPaths()
  const isAllowed = (path: string) => allowedPaths.includes(path)

  const allItems = [
    {
      section: t('admin.layout.sidebar.productOps'),
      items: [
        { to: '/admin/products', label: t('admin.layout.menu.products'), icon: <Icon name="package" size={18} /> },
        { to: '/admin/categories', label: t('admin.layout.menu.categories'), icon: <Icon name="grid" size={18} /> },
        { to: '/admin/brands', label: t('admin.layout.menu.brands'), icon: <Icon name="tag" size={18} /> },
        { to: '/admin/tags', label: t('admin.layout.menu.tags'), icon: <Icon name="tag" size={18} /> },
      ],
    },
    {
      section: t('admin.layout.sidebar.fulfillment'),
      items: [
        { to: '/admin/orders', label: t('admin.layout.menu.orders'), icon: <Icon name="box" size={18} /> },
      ],
    },
    {
      section: t('admin.layout.sidebar.communication'),
      items: [
        { to: '/admin/chat', label: t('admin.layout.menu.chat'), icon: <Icon name="message-circle" size={18} /> },
        { to: '/admin/notifications', label: t('admin.layout.menu.notifications'), icon: <Icon name="bell" size={18} /> },
        { to: '/admin/applications', label: t('admin.layout.menu.applications'), icon: <Icon name="file" size={18} /> },
      ],
    },
    {
      section: t('admin.layout.sidebar.marketing'),
      items: [
        { to: '/admin/coupons', label: t('admin.layout.menu.coupons'), icon: <Icon name="card" size={18} /> },
        { to: '/admin/activities', label: t('admin.layout.menu.activities'), icon: <Icon name="trending" size={18} /> },
      ],
    },
    {
      section: t('admin.layout.sidebar.systemMgmt'),
      items: [
        { to: '/admin/groups', label: t('admin.layout.menu.groups'), icon: <Icon name="users" size={18} /> },
        { to: '/admin/audit-logs', label: t('admin.layout.menu.auditLogs'), icon: <Icon name="edit" size={18} /> },
        { to: '/admin/recycle-bin', label: t('admin.layout.menu.recycleBin'), icon: <Icon name="trash" size={18} /> },
        { to: '/admin/tasks', label: t('admin.layout.menu.asyncTasks'), icon: <Icon name="clock" size={18} /> },
        { to: '/admin/rbac', label: t('admin.layout.menu.rbac'), icon: <Icon name="shield" size={18} /> },
        { to: '/admin/email-templates', label: t('admin.layout.menu.emailTemplates'), icon: <Icon name="mail" size={18} /> },
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
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
            <Icon name="chevron-left" size={14} />
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
                '/admin': 'admin.layout.breadcrumb.home',
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
              };
              // build hierarchy: home › group › page
              const parts = p.split('/').filter(Boolean);
              if (parts.length <= 1) return t('admin.layout.breadcrumb.home');
              const labelKey = map[p] || parts[parts.length - 1];
              const label = t(labelKey);
              const groupMap: Record<string, string> = {
                'products': 'admin.layout.sidebar.productOps', 'categories': 'admin.layout.sidebar.productOps', 'brands': 'admin.layout.sidebar.productOps', 'tags': 'admin.layout.sidebar.productOps',
                'orders': 'admin.layout.sidebar.fulfillment', 'chat': 'admin.layout.sidebar.communication', 'notifications': 'admin.layout.sidebar.communication', 'applications': 'admin.layout.sidebar.communication',
                'coupons': 'admin.layout.sidebar.marketing', 'activities': 'admin.layout.sidebar.marketing',
                'audit-logs': 'admin.layout.sidebar.systemMgmt', 'recycle-bin': 'admin.layout.sidebar.systemMgmt', 'groups': 'admin.layout.sidebar.systemMgmt', 'tasks': 'admin.layout.sidebar.systemMgmt', 'rbac': 'admin.layout.sidebar.systemMgmt',
              };
              const groupKey = groupMap[parts[1]] || '';
              const groupLabel = groupKey ? t(groupKey) : '';
              return groupLabel ? `${t('admin.layout.breadcrumb.home')} › ${groupLabel} › ${label}` : `${t('admin.layout.breadcrumb.home')} › ${label}`;
            })()}</Breadcrumb>
          </HeaderLeft>
          <HeaderRight>
            <LanguageSwitch position="header" />
            <NotificationBell />
            <NotificationFloat />
            <UserMenu onClick={() => setUserMenuOpen((v) => !v)}>
              {adminUser?.username}
              <span style={{ color: '#999', fontSize: '0.75rem' }}>
                ({roleLabel})
              </span>
              {userMenuOpen && (
                <>
                  <DropdownBackdrop onClick={() => setUserMenuOpen(false)} />
                  <UserDropdown>
                    <UserDropdownInfo>
                      <UserDropdownName>{adminUser?.username}</UserDropdownName>
                      <UserDropdownRole>{roleLabel}</UserDropdownRole>
                    </UserDropdownInfo>
                    <UserDropdownDivider />
                    <UserDropdownItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLogout()
                      }}
                    >
                      {t('admin.layout.header.logout')}
                    </UserDropdownItem>
                  </UserDropdown>
                </>
              )}
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