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
  // 权限/登录状态变更：旧会话强制失效，前端弹出「请重新登录」
  'REAUTH_REQUIRED',
]

/**
 * HTTP 状态 → 友好文案（P0-3 统一状态语义）
 * 仅在后端未返回 message/detail 时作为兜底；后端有信息时优先用后端文案。
 */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: '请求参数有误，请检查后重试',
  401: '登录状态已失效，请重新登录',
  403: '没有执行此操作的权限',
  404: '请求的资源不存在或已被删除',
  405: '请求方法不被支持',
  409: '数据冲突，请刷新后重试',
  422: '表单校验未通过，请检查填写内容',
  429: '请求过于频繁，请稍后再试',
  500: '系统繁忙，请稍后重试',
  502: '网关异常，请稍后重试',
  503: '服务暂不可用，请稍后重试',
}

/** 取某 HTTP 状态对应的友好文案（无映射返回 undefined） */
export function friendlyStatusMessage(status: number): string | undefined {
  return HTTP_STATUS_MESSAGES[status]
}

export type ToastType = 'error' | 'warning' | 'info' | 'success'
export type ToastFn = (message: string, type?: ToastType) => void

/** 从 AxiosError 中提取统一错误结构；兼容后端未返回标准信封的情况（回退到 HTTP 状态语义文案）。 */
export function extractAppError(error: AxiosError): AppError {
  const res = error.response
  const data = (res?.data ?? {}) as Record<string, unknown>
  const status = res?.status ?? 0
  const message =
    typeof data?.message === 'string' ? data.message
    : typeof data?.detail === 'string' ? data.detail
    : friendlyStatusMessage(status) || error.message || 'Request failed'
  const detail = typeof data?.detail === 'string' ? data.detail : message

  return {
    error_code:
      typeof data?.error_code === 'string' ? data.error_code : `HTTP_${status}`,
    message,
    detail,
    category: typeof data?.category === 'string' ? data.category : undefined,
    request_id: typeof data?.request_id === 'string' ? data.request_id : undefined,
    status,
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
