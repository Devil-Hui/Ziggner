// Axios 全局封装、拦截器（对接 Django 后端 + JWT 认证）

import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { extractAppError, handleApiError, type AppError, AUTH_ERROR_CODES } from '../utils/errorHandler'

// 扩展 axios 配置类型，添加 _retry 属性用于 401 重试标记
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ==================== GET 请求去重（SWR 风格 dedup） ====================
// 相同 method + url + params 的并发请求共享同一个 Promise，避免重复请求

const pendingRequests = new Map<string, Promise<unknown>>()
const DEDUP_TTL = 30_000 // 30 秒后自动清理，防止内存泄漏

function buildRequestKey(config: InternalAxiosRequestConfig): string {
  const params = config.params
    ? JSON.stringify(config.params, Object.keys(config.params).sort())
    : ''
  return `${config.method}:${config.url}:${params}`
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // 仅对 GET 请求做去重
  if (config.method?.toLowerCase() !== 'get') return config

  const key = buildRequestKey(config)
  const existing = pendingRequests.get(key)
  if (existing) {
    // 复用已有的 Promise，但需要给 axios 一个可取消的 config
    const controller = new AbortController()
    config.signal = controller.signal
    // 返回已有 Promise 的 adapter，让 axios 走已有请求
    config.adapter = () => {
      return existing.then((data) => ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })) as Promise<AxiosResponse>
    }
    return config
  }

  return config
})

// ==================== Token 管理 ====================
// 双轨 Token：Admin 与 User 隔离，互不干扰
// Token 内存存储（避免 XSS 攻击）+ localStorage 持久化（页面刷新恢复）

const ADMIN_TOKEN_KEY = 'admin_access_token'
const ADMIN_REFRESH_KEY = 'admin_refresh_token'
const USER_TOKEN_KEY = 'user_access_token'
const USER_REFRESH_KEY = 'user_refresh_token'

// ── Admin Token ──
let accessToken: string | null = null
let refreshToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) {
    try { localStorage.setItem(ADMIN_TOKEN_KEY, token) } catch { /* noop */ }
  } else {
    try { localStorage.removeItem(ADMIN_TOKEN_KEY) } catch { /* noop */ }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken
  try {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (stored) { accessToken = stored; return stored }
  } catch { /* noop */ }
  return null
}

export function setRefreshToken(token: string | null) {
  refreshToken = token
  if (token) {
    try { localStorage.setItem(ADMIN_REFRESH_KEY, token) } catch { /* noop */ }
  } else {
    try { localStorage.removeItem(ADMIN_REFRESH_KEY) } catch { /* noop */ }
  }
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken
  try {
    const stored = localStorage.getItem(ADMIN_REFRESH_KEY)
    if (stored) { refreshToken = stored; return stored }
  } catch { /* noop */ }
  return null
}

export function clearAllTokens() {
  accessToken = null
  refreshToken = null
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_REFRESH_KEY)
  } catch { /* noop */ }
}

// ── User Token（前台用户，与 Admin 隔离） ──
let userAccessToken: string | null = null
let userRefreshToken: string | null = null

export function setUserAccessToken(token: string | null) {
  userAccessToken = token
  if (token) {
    try { localStorage.setItem(USER_TOKEN_KEY, token) } catch { /* noop */ }
  } else {
    try { localStorage.removeItem(USER_TOKEN_KEY) } catch { /* noop */ }
  }
}

export function getUserAccessToken(): string | null {
  if (userAccessToken) return userAccessToken
  try {
    const stored = localStorage.getItem(USER_TOKEN_KEY)
    if (stored) { userAccessToken = stored; return stored }
  } catch { /* noop */ }
  return null
}

export function setUserRefreshToken(token: string | null) {
  userRefreshToken = token
  if (token) {
    try { localStorage.setItem(USER_REFRESH_KEY, token) } catch { /* noop */ }
  } else {
    try { localStorage.removeItem(USER_REFRESH_KEY) } catch { /* noop */ }
  }
}

export function getUserRefreshToken(): string | null {
  if (userRefreshToken) return userRefreshToken
  try {
    const stored = localStorage.getItem(USER_REFRESH_KEY)
    if (stored) { userRefreshToken = stored; return stored }
  } catch { /* noop */ }
  return null
}

export function clearUserTokens() {
  userAccessToken = null
  userRefreshToken = null
  try {
    localStorage.removeItem(USER_TOKEN_KEY)
    localStorage.removeItem(USER_REFRESH_KEY)
  } catch { /* noop */ }
}

// 请求拦截器：附加 Bearer token（Admin 优先，其次 User）
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken() || getUserAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ==================== Token 刷新互斥锁 ====================
// 防止多个并发 401 同时触发 refresh，导致 refresh token 被重复使用而被黑名单化
let refreshPromise: Promise<string | null> | null = null
let userRefreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const storedRefresh = getRefreshToken()
    if (!storedRefresh) return null
    try {
      const response = await axios.post(
        `${BASE_URL}/users/refresh/`,
        { refresh: storedRefresh },
        { withCredentials: true }
      )
      const newAccess = response.data.data?.access || response.data.access
      const newRefresh = response.data.data?.refresh || response.data.refresh
      if (newAccess) {
        setAccessToken(newAccess)
        if (newRefresh) setRefreshToken(newRefresh)
        return newAccess
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

async function refreshUserAccessToken(): Promise<string | null> {
  if (userRefreshPromise) return userRefreshPromise
  userRefreshPromise = (async () => {
    const storedRefresh = getUserRefreshToken()
    if (!storedRefresh) return null
    try {
      const response = await axios.post(
        `${BASE_URL}/users/refresh/`,
        { refresh: storedRefresh },
        { withCredentials: true }
      )
      const newAccess = response.data.data?.access || response.data.access
      const newRefresh = response.data.data?.refresh || response.data.refresh
      if (newAccess) {
        setUserAccessToken(newAccess)
        if (newRefresh) setUserRefreshToken(newRefresh)
        return newAccess
      }
      return null
    } catch {
      return null
    } finally {
      userRefreshPromise = null
    }
  })()
  return userRefreshPromise
}

// 响应拦截器：统一解包后端 CustomExceptionMiddleware 包装 + 处理 401 刷新 token
api.interceptors.response.use(
  (res: AxiosResponse) => {
    // GET 请求去重：缓存响应数据，后续相同请求直接复用
    if (res.config.method?.toLowerCase() === 'get') {
      const key = buildRequestKey(res.config)
      pendingRequests.set(key, Promise.resolve(res.data))
      setTimeout(() => pendingRequests.delete(key), DEDUP_TTL)
    }
    // 解包后端 CustomExceptionMiddleware 的 { code, data, status, message, request_id } 格式
    const body = res.data
    if (body && typeof body === 'object' && 'code' in body && 'status' in body) {
      if (body.status === 'success' && 'data' in body) {
        res.data = body.data
      }
      // 错误响应 (status === 'error') 保留原始 body，让调用方可以访问 error_code/message
    }
    return res
  },
  async (error) => {
    // 清理失败请求的 pending
    if (error.config?.method?.toLowerCase() === 'get') {
      const key = buildRequestKey(error.config)
      pendingRequests.delete(key)
    }
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      // 判断当前用的是 Admin 还是 User token
      const hasAdminToken = !!getAccessToken()
      const hasUserToken = !!getUserAccessToken()
      const newAccess = hasAdminToken
        ? await refreshAccessToken()
        : hasUserToken
          ? await refreshUserAccessToken()
          : null
      if (newAccess) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
        }
        return api(originalRequest)
      }
      // Refresh failed: clear tokens
      clearAllTokens()
      clearUserTokens()
      // 只有本来已登录（有 token）才重定向，避免未登录用户访问公开页面时被强制跳转
      if (typeof window !== 'undefined' && (hasAdminToken || hasUserToken)) {
        const isAdminPath = window.location.pathname.startsWith('/admin')
        if (isAdminPath && !window.location.pathname.includes('/admin/login')) {
          window.location.href = '/admin/login'
        } else if (!isAdminPath && !window.location.pathname.includes('/auth')) {
          window.location.href = '/auth?tab=login'
        }
      }
    }
    // 统一错误提取：附加 appError，并让 error.message 携带服务端消息，
    // 兼容现有 `err.message` 读取方式（如各页面 catch 中的 err.message）。
    try {
      const appErr = extractAppError(error)
      ;(error as unknown as { appError?: AppError }).appError = appErr
      if (appErr.message) error.message = appErr.message
    } catch {
      /* 兜底：不阻断原有 reject */
    }
    return Promise.reject(error)
  }
)

// 便捷方法
export const get = <T>(url: string, params?: Record<string, unknown>, config?: Record<string, unknown>) =>
  api.get<T>(url, { ...config, params }).then((response) => response.data)

export const post = <T>(url: string, data?: unknown, config?: Record<string, unknown>) =>
  api.post<T>(url, data, config).then((response) => response.data)

export const put = <T>(url: string, data?: unknown, config?: Record<string, unknown>) =>
  api.put<T>(url, data, config).then((response) => response.data)

export const patch = <T>(url: string, data?: unknown, config?: Record<string, unknown>) =>
  api.patch<T>(url, data, config).then((response) => response.data)

export const del = <T>(url: string, data?: unknown, config?: Record<string, unknown>) =>
  api.delete<T>(url, { ...config, data }).then((response) => response.data)

// ==================== XHR 上传进度封装 ====================
// fetch 不支持上传进度事件，仅 XMLHttpRequest 的 upload.onprogress 可获取百分比。
// 用于含文件的 FormData 上传（如 createSPUWithMedia / 编辑模式新增图片）。

/**
 * 使用 XMLHttpRequest 发起 POST 请求，支持上传进度回调。
 *
 * JWT Token 注入：从 localStorage 读取（键 admin_access_token / user_access_token），
 * 与 fetch 拦截器保持一致；token 缺失时不设 Authorization header。
 *
 * @param url 请求路径（相对 BASE_URL，如 '/goods/media/spu/1/upload'）
 * @param formData FormData 请求体
 * @param onProgress 可选的上传进度回调，参数为 0-100 的百分比
 * @returns 解包后的响应数据（与后端 CustomExceptionMiddleware 的 { code, data } 格式一致）
 */
export function postWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}${url}`)
    xhr.responseType = 'json'

    // JWT Token 注入（Admin 优先，其次 User），与 fetch 拦截器一致
    let token: string | null = null
    try {
      token = getAccessToken() || getUserAccessToken()
    } catch {
      token = null
    }
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    // 上传进度事件
    if (onProgress) {
      xhr.upload.onprogress = (e: ProgressEvent) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = xhr.response
        // 解包后端 CustomExceptionMiddleware 的 { code, data, status } 格式
        if (body && typeof body === 'object' && 'code' in body && 'status' in body) {
          if (body.status === 'success' && 'data' in body) {
            resolve(body.data as T)
            return
          }
        }
        resolve(body as T)
      } else {
        // 提取服务端错误消息
        const body = xhr.response
        let message = `HTTP ${xhr.status}`
        if (body && typeof body === 'object') {
          message = body.detail || body.message || (body.data && body.data.detail) || message
        }
        reject(new Error(message))
      }
    }

    xhr.onerror = () => reject(new Error('Network error'))
    xhr.ontimeout = () => reject(new Error('Request timeout'))
    xhr.send(formData)
  })
}

export { BASE_URL }
export { extractAppError, handleApiError }
export type { AppError }
export { AUTH_ERROR_CODES }
export default api