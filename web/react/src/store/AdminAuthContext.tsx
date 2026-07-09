import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { adminAPI } from '../api/admin'

export type AdminRole = 'superadmin' | 'leader' | 'member' | 'none'

interface AdminUser {
  id: number
  username: string
  is_superuser: boolean
  is_group_leader: boolean
  is_group_member: boolean
  group_name: string | null
  group_id: number | null
}

interface AdminAuthContextType {
  adminUser: AdminUser | null
  role: AdminRole
  isAuthenticated: boolean
  isLoading: boolean
  isSuperAdmin: boolean
  isGroupLeader: boolean
  isGroupMember: boolean
  login: (email: string, verifyId?: string, verifyCode?: string) => Promise<boolean>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  adminUser: null,
  role: 'none',
  isAuthenticated: false,
  isLoading: true,
  isSuperAdmin: false,
  isGroupLeader: false,
  isGroupMember: false,
  login: async () => false,
  logout: () => {},
})

/**
 * 从用户资料推导管理后台角色。
 * 仅 superadmin / leader / member 视为有效后台角色；普通消费者统一为 'none'。
 * 这是修复「普通消费者可进入后台」越权漏洞的核心：isAuthenticated 必须以角色为准。
 */
function deriveRole(user: AdminUser | null): AdminRole {
  if (!user) return 'none'
  if (user.is_superuser) return 'superadmin'
  if (user.is_group_leader) return 'leader'
  if (user.is_group_member) return 'member'
  return 'none'
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    if (token) {
      fetchUser()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUser = async (attempt = 0): Promise<AdminUser | null> => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setIsLoading(false)
      return null
    }
    try {
      const response = await fetch('/api/users/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const json = await response.json()
        // 后端统一信封：真实用户在 json.data 下
        const userData = json && json.data ? json.data : json
        setAdminUser(userData)
        setIsLoading(false)
        return userData
      }
      if (response.status === 401 || response.status === 403) {
        // 真·鉴权失败：清除会话
        localStorage.removeItem('admin_access_token')
        localStorage.removeItem('admin_refresh_token')
        setAdminUser(null)
        setIsLoading(false)
        return null
      }
      // 429 / 5xx / 网络：限流或临时故障，不销毁会话，退避后重试
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
        return fetchUser(attempt + 1)
      }
      // 重试耗尽仍失败：保留 token 与现有会话，避免限流导致误登出
      setIsLoading(false)
      return adminUser
    } catch {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
        return fetchUser(attempt + 1)
      }
      setIsLoading(false)
      return adminUser
    }
  }

  const login = async (email: string, verifyId?: string, verifyCode?: string): Promise<boolean> => {
    try {
      // 后端返回统一信封：{ code, data: { access, refresh }, status, message, ... }
      // adminAPI.login 经 request.ts 的 post() 返回的是整个信封，token 在 .data 下。
      const resp: any = await adminAPI.login(email, verifyId, verifyCode)
      const payload = resp && resp.data ? resp.data : resp
      if (!payload || !payload.access) return false

      localStorage.setItem('admin_access_token', payload.access)
      localStorage.setItem('admin_refresh_token', payload.refresh)

      const user = await fetchUser()
      // 仅允许管理角色进入后台；普通消费者即使认证成功也一律拒绝
      if (!user || deriveRole(user) === 'none') {
        localStorage.removeItem('admin_access_token')
        localStorage.removeItem('admin_refresh_token')
        setAdminUser(null)
        return false
      }
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
    setAdminUser(null)
  }

  const role = deriveRole(adminUser)
  const isAuthenticated = role !== 'none'
  const isSuperAdmin = role === 'superadmin'
  const isGroupLeader = role === 'leader'
  const isGroupMember = role === 'member'

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        role,
        isAuthenticated,
        isLoading,
        isSuperAdmin,
        isGroupLeader,
        isGroupMember,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
