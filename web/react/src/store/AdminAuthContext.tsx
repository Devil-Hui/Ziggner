import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { adminAPI } from '../api/admin'
import { get } from '../api/request'

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
  login: (email: string, verifyId?: string, verifyCode?: string, turnstileToken?: string) => Promise<boolean>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  adminUser: null, role: 'none', isAuthenticated: false, isLoading: true,
  isSuperAdmin: false, isGroupLeader: false, isGroupMember: false,
  login: async () => false, logout: () => undefined,
})

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

  const fetchUser = useCallback(async (attempt = 0): Promise<AdminUser | null> => {
    try {
      const user = await get<AdminUser>('/users/me/')
      setAdminUser(user)
      setIsLoading(false)
      return user
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status
      if (status === 401 || status === 403) {
        setAdminUser(null)
        setIsLoading(false)
        return null
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        return fetchUser(attempt + 1)
      }
      setIsLoading(false)
      return null
    }
  }, [])

  useEffect(() => { void fetchUser() }, [fetchUser])

  const login = async (email: string, verifyId?: string, verifyCode?: string, turnstileToken?: string) => {
    try {
      const result = await adminAPI.login(email, verifyId, verifyCode, turnstileToken)
      if (!result?.authenticated) return false
      const user = await fetchUser()
      if (!user || deriveRole(user) === 'none') {
        await adminAPI.logout().catch(() => undefined)
        setAdminUser(null)
        return false
      }
      return true
    } catch (err) {
      // 透传后端具体错误（验证码过期/安全验证失败/非管理员等），由调用方展示 detail
      throw err
    }
  }

  const logout = () => {
    void adminAPI.logout().catch(() => undefined)
    setAdminUser(null)
  }

  const role = deriveRole(adminUser)
  return (
    <AdminAuthContext.Provider value={{
      adminUser, role, isAuthenticated: role !== 'none', isLoading,
      isSuperAdmin: role === 'superadmin', isGroupLeader: role === 'leader',
      isGroupMember: role === 'member', login, logout,
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() { return useContext(AdminAuthContext) }
