import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { extractAppError, handleApiError, type AppError, AUTH_ERROR_CODES } from '../utils/errorHandler'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  // 跨子域（admin/www/shop → api）也始终附加 X-CSRFToken，避免 403 CSRF Failed
  withXSRFToken: true,
  headers: { 'Content-Type': 'application/json' },
})

// 显式兜底：axios 在相对 baseURL 下对 withXSRFToken 的 isURLSameOrigin 判定
// 在某些版本/场景下可能不附 X-CSRFToken 头，导致登录/写操作 403 CSRF token missing。
// 这里在请求发出前从 document.cookie 直接读取 csrftoken 并强制写入头，确保一定携带。
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase()
  if (method === 'get' || method === 'head' || method === 'options') return config
  const token = readCSRFCookie()
  if (token) config.headers.set('X-CSRFToken', token)
  return config
})

const pendingRequests = new Map<string, Promise<unknown>>()
const DEDUP_TTL = 30_000

function buildRequestKey(config: InternalAxiosRequestConfig): string {
  const params = config.params
    ? JSON.stringify(config.params, Object.keys(config.params).sort())
    : ''
  return `${config.method}:${config.url}:${params}`
}

/**
 * 提取资源的"列表路径"前缀：
 *   /promotion/activity/3/delete → /promotion/activity
 *   /promotion/activity/create    → /promotion/activity
 *   /promotion/activity?page=1    → /promotion/activity
 * 用于 mutation 成功后失效对应列表的 GET 去重缓存。
 */
function resourceBase(url: string): string {
  const clean = url.split('?')[0]
    .replace(/\/(create|update|delete|restore|scope|skus|migrate|audit|permanent|submit|shelf|schedule|duplicate)$/i, '')
    .replace(/\/\d+$/, '')
  return clean
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.method?.toLowerCase() !== 'get') return config
  const existing = pendingRequests.get(buildRequestKey(config))
  if (!existing) return config
  config.adapter = () => existing.then((data) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })) as Promise<AxiosResponse>
  return config
})

// Compatibility exports for callers being migrated. Browser authentication is
// exclusively cookie-based; these functions intentionally never retain tokens.
export const setAccessToken = (_token: string | null) => undefined
export const getAccessToken = (): null => null
export const setRefreshToken = (_token: string | null) => undefined
export const getRefreshToken = (): null => null
export const clearAllTokens = () => undefined
export const setUserAccessToken = (_token: string | null) => undefined
export const getUserAccessToken = (): null => null
export const setUserRefreshToken = (_token: string | null) => undefined
export const getUserRefreshToken = (): null => null
export const clearUserTokens = () => undefined

export async function ensureCSRFCookie(): Promise<void> {
  await api.get('/users/session/csrf/')
}

let refreshPromise: Promise<boolean> | null = null

async function refreshBrowserSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = axios.post(
    `${BASE_URL}/users/session/refresh/`,
    {},
    {
      withCredentials: true,
      xsrfCookieName: 'csrftoken',
      xsrfHeaderName: 'X-CSRFToken',
      withXSRFToken: true,
    },
  ).then(() => true).catch(() => false).finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

api.interceptors.response.use(
  (res: AxiosResponse) => {
    // mutation（非 GET）成功后，失效同资源的 GET 去重缓存，
    // 避免删除/修改/创建后 refetch 仍命中旧缓存（列表不刷新）
    if (res.config.method?.toLowerCase() !== 'get') {
      const base = resourceBase(res.config.url || '')
      if (base) {
        for (const key of [...pendingRequests.keys()]) {
          if (key.startsWith(`get:${base}`) || key.startsWith(`get:${base}/`)) {
            pendingRequests.delete(key)
          }
        }
      }
    }
    if (res.config.method?.toLowerCase() === 'get') {
      const key = buildRequestKey(res.config)
      pendingRequests.set(key, Promise.resolve(res.data))
      setTimeout(() => pendingRequests.delete(key), DEDUP_TTL)
    }
    const body = res.data
    if (body && typeof body === 'object' && 'code' in body && 'status' in body) {
      if (body.status === 'success' && 'data' in body) res.data = body.data
    }
    return res
  },
  async (error) => {
    if (error.config?.method?.toLowerCase() === 'get') {
      pendingRequests.delete(buildRequestKey(error.config))
    }
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined
    const isSessionEndpoint = originalRequest?.url?.includes('/users/session/')
    const isAuthEndpoint = isSessionEndpoint || originalRequest?.url?.includes('/users/login/') || originalRequest?.url?.includes('/users/register/')
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      if (await refreshBrowserSession()) return api(originalRequest)
    }
    try {
      const appErr = extractAppError(error)
      ;(error as { appError?: AppError }).appError = appErr
      if (appErr.message) error.message = appErr.message
    } catch {
      // Preserve the transport error when the response has no application envelope.
    }
    return Promise.reject(error)
  },
)

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

function readCSRFCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function postWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}${url}`)
    xhr.responseType = 'json'
    xhr.withCredentials = true
    const csrfToken = readCSRFCookie()
    if (csrfToken) xhr.setRequestHeader('X-CSRFToken', csrfToken)

    if (onProgress) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      const body = xhr.response
      if (xhr.status >= 200 && xhr.status < 300) {
        if (body && typeof body === 'object' && body.status === 'success' && 'data' in body) {
          resolve(body.data as T)
          return
        }
        resolve(body as T)
        return
      }
      const message = body?.detail || body?.message || body?.data?.detail || `HTTP ${xhr.status}`
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.ontimeout = () => reject(new Error('Request timeout'))
    xhr.send(formData)
  })
}

export { BASE_URL, extractAppError, handleApiError, AUTH_ERROR_CODES }
export type { AppError }
export default api
