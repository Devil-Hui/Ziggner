// 前端统一错误处理
//
// 与后端 utils.exceptions 的错误信封（{code,data,status,message,detail,error_code,category,request_id}）
// 一一对应。任何 API 调用出错时，用 extractAppError 把 AxiosError 规整为 AppError，
// 用 handleApiError 完成「日志 + 可选 Toast + 认证错误识别」。
//
// 统一引用方式：
//   import { handleApiError, extractAppError, type AppError, AUTH_ERROR_CODES } from '@/utils/errorHandler'
//   try { await api.get(...) } catch (e) { const err = handleApiError(e as AxiosError, { showToast }) }

import type { AxiosError } from 'axios'

/** 规整后的应用错误 */
export interface AppError {
  error_code: string
  message: string
  detail: string
  category?: string
  request_id?: string
  status: number
  raw?: AxiosError
}

/** 需要触发登出 / 跳转登录的认证类错误码（与后端 ErrorCodes 对齐） */
export const AUTH_ERROR_CODES = [
  'UNAUTHORIZED',
  'AUTH_FAILED',
  'TOKEN_EXPIRED',
  'TOKEN_BLACKLISTED',
]

export type ToastType = 'error' | 'warning' | 'info' | 'success'
export type ToastFn = (message: string, type?: ToastType) => void

/** 从 AxiosError 中提取统一错误结构；兼容后端未返回标准信封的情况（回退到 HTTP 状态）。 */
export function extractAppError(error: AxiosError): AppError {
  const res = error.response
  const data = (res?.data ?? {}) as Record<string, unknown>
  const message =
    typeof data?.message === 'string' ? data.message
    : typeof data?.detail === 'string' ? data.detail
    : error.message || '请求失败'
  const detail = typeof data?.detail === 'string' ? data.detail : message

  return {
    error_code:
      typeof data?.error_code === 'string' ? data.error_code : `HTTP_${res?.status ?? 0}`,
    message,
    detail,
    category: typeof data?.category === 'string' ? data.category : undefined,
    request_id: typeof data?.request_id === 'string' ? data.request_id : undefined,
    status: res?.status ?? 0,
    raw: error,
  }
}

/** 判断是否为认证失效类错误 */
export function isAuthError(err: AppError): boolean {
  return AUTH_ERROR_CODES.includes(err.error_code)
}

/**
 * 统一处理 API 错误：
 * 1. 始终在 console 输出 error_code + request_id（便于排查，request_id 可直接给后端日志定位）；
 * 2. 非认证错误可自动 Toast（传入 showToast）；认证错误由 request.ts 的 401 流程统一处理，不重复弹窗；
 * 3. 返回规整后的 AppError，方便调用方按 error_code 做分支。
 */
export function handleApiError(
  error: AxiosError,
  opts?: { showToast?: ToastFn },
): AppError {
  const appErr = extractAppError(error)
  if (appErr.request_id) {
    console.error(
      `[API Error] code=${appErr.error_code} category=${appErr.category ?? '-'} request_id=${appErr.request_id}`,
      appErr.message,
    )
  } else {
    console.error(`[API Error] code=${appErr.error_code}`, appErr.message)
  }
  if (opts?.showToast && !isAuthError(appErr)) {
    opts.showToast(appErr.message, 'error')
  }
  return appErr
}
