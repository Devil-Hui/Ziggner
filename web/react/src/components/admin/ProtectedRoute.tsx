import { type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../store/AdminAuthContext'

/**
 * 基础权限守卫：检查用户是否已认证
 * 支持两种使用方式：
 * 1. 作为 layout route element（使用 <Outlet />）: <ProtectedRoute />
 * 2. 作为 wrapper（使用 children）: <ProtectedRoute><Component /></ProtectedRoute>
 */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', fontSize: '1.2rem', color: '#666',
      }}>
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

/**
 * 定义哪些路由需要什么角色权限
 * 路由路径 → 允许的角色列表
 */
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/admin/products': ['superadmin', 'leader', 'member'],
  '/admin/categories': ['superadmin', 'leader'],
  '/admin/brands': ['superadmin', 'leader'],
  '/admin/tags': ['superadmin'],
  '/admin/orders': ['superadmin', 'leader', 'member'],
  '/admin/chat': ['superadmin', 'leader', 'member'],
  '/admin/notifications': ['superadmin', 'leader', 'member'],
  '/admin/applications': ['superadmin', 'leader', 'member'],
  '/admin/coupons': ['superadmin'],
  '/admin/activities': ['superadmin'],
  '/admin/audit-logs': ['superadmin', 'leader'],
  '/admin/recycle-bin': ['superadmin', 'leader'],
  '/admin/groups': ['superadmin'],
  '/admin/tasks': ['superadmin', 'leader', 'member'],
}

/**
 * 获取当前用户的角色标签
 */
function getUserRole(isSuperAdmin: boolean, isGroupLeader: boolean, isGroupMember: boolean): string {
  if (isSuperAdmin) return 'superadmin'
  if (isGroupLeader) return 'leader'
  if (isGroupMember) return 'member'
  return 'none'
}

/**
 * 角色权限守卫：在 ProtectedRoute 基础上增加角色检查
 * 根据用户角色限制可访问的 admin 路由
 */
export function RoleProtectedRoute({ children }: { children?: ReactNode }) {
  const { role, isLoading } = useAdminAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', fontSize: '1.2rem', color: '#666',
      }}>
        Loading...
      </div>
    )
  }

  // 未登录或没有任何管理角色 -> 退回登录页
  // （修复旧逻辑把 'none' 角色重定向到 /admin/products 自身造成的死循环）
  if (role === 'none') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  const currentPath = location.pathname

  // 检查是否有匹配的权限规则
  let matched = false
  for (const [routePattern, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (currentPath === routePattern || currentPath.startsWith(routePattern + '/')) {
      matched = true
      if (!allowedRoles.includes(role)) {
        // 角色无权限 -> 退回其默认可访问的产品列表页
        return <Navigate to="/admin/products" replace />
      }
      break
    }
  }

  // 安全加固：对于 /admin/ 路径但未在 ROUTE_PERMISSIONS 中注册的，默认拒绝访问
  // 默认拒绝（default-deny）原则，避免新增路由意外暴露
  if (!matched && currentPath !== '/admin/login' && currentPath.startsWith('/admin/')) {
    return <Navigate to="/admin/products" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

/**
 * 导出菜单权限过滤器，供 AdminLayout 使用
 * 返回当前用户可访问的菜单项路径列表
 */
export function useAllowedMenuPaths(): string[] {
  const { isSuperAdmin, isGroupLeader, isGroupMember } = useAdminAuth()
  const role = getUserRole(isSuperAdmin, isGroupLeader, isGroupMember)

  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, allowedRoles]) => allowedRoles.includes(role))
    .map(([path]) => path)
}