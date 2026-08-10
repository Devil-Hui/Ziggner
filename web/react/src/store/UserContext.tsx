import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { publicAPI } from '../api/public'
import { post as apiPost } from '../api/request'
import type { User } from '../types/user'

interface UserContextValue {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (username: string, password: string, turnstileToken: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, password: string, email: string | undefined, verifyId: string | undefined, verifyCode: string | undefined, turnstileToken: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  socialLogin: (provider: string, accessToken: string) => Promise<any>
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => ({ success: false, error: 'not initialized' }),
  register: async () => ({ success: false, error: 'not initialized' }),
  logout: () => {},
  socialLogin: async () => ({ success: false, error: 'not initialized' }),
  refreshUser: async () => {},
})

export const useUser = () => useContext(UserContext)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async (attempt = 0) => {
    try {
      // 后端统一信封：真实用户在 json.data 下
      const json: any = await publicAPI.getMe()
      const data = json && json.data ? json.data : json
      const profile = data.profile || data
      setUser({
        id: data.id,
        name: data.username as string || '',
        email: data.email as string || '',
        phone: data.phone as string || '',
        gender: (profile as Record<string, unknown>).gender as string || '',
        registerTime: (profile as Record<string, unknown>).date_joined as string || '',
        avatar: (profile as Record<string, unknown>).avatar as string || '',
        nickname: (profile as Record<string, unknown>).nickname as string || '',
      })
      setIsLoading(false)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // 仅 401/403 为真·鉴权失效，才清除会话
      if (status === 401 || status === 403) {
        setUser(null)
        setIsLoading(false)
        return
      }
      // 429 / 5xx / 网络：保留会话（token 不清除），退避后重试，避免限流误登出
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
        return refreshUser(attempt + 1)
      }
      // 重试耗尽仍失败：保留现有 user 与 token，不强制登出
      setIsLoading(false)
    }
  }, [])

  // 初始化：有 token 则恢复登录态（管理后台不需要用户登录态）
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return
    }
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (username: string, password: string, turnstileToken: string) => {
    try {
      // 后端返回统一信封 { code, data: { access, refresh }, ... }，token 在 .data 下
      const res: any = await publicAPI.login(username, password, turnstileToken)
      const payload = res && res.data ? res.data : res
      if (!payload?.authenticated) return { success: false, error: '登录失败' }
      await refreshUser()
      return { success: true }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail
        || (err as { message?: string })?.message
        || '登录失败，请检查用户名和密码'
      return { success: false, error: msg }
    }
  }, [refreshUser])

  const register = useCallback(async (username: string, password: string, email: string | undefined, verifyId: string | undefined, verifyCode: string | undefined, turnstileToken: string) => {
    try {
      await publicAPI.register({ username, password, email, verify_id: verifyId, verify_code: verifyCode })
      // 注册成功后自动登录
      return await login(username, password, turnstileToken)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
      if (msg && typeof msg === 'object') {
        const firstKey = Object.keys(msg)[0]
        return { success: false, error: msg[firstKey]?.[0] || '注册失败' }
      }
      const detail = (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail
      return { success: false, error: detail || '注册失败，请稍后重试' }
    }
  }, [login])

  const logout = useCallback(() => {
    void publicAPI.logout().catch(() => undefined)
    setUser(null)
  }, [])

  const socialLogin = useCallback(async (provider: string, accessToken: string) => {
    try {
      const res: any = await apiPost('/users/social/login/', {
        provider,
        access_token: accessToken,
      })
      const payload = res?.data || res
      const { access, refresh, user, needs_password_setup } = payload
      if (user) setUser(user)
      return { access, refresh, user, needs_password_setup }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || (err as { message?: string })?.message
        || '社交登录失败'
      throw { response: { data: { detail: msg } } }
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, isLoggedIn: !!user, isLoading, login, register, logout, socialLogin, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export default UserContext
