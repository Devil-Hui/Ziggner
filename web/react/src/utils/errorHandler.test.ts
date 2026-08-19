/**
 * errorHandler 单元测试：验证前后端错误信封契约解析。
 */
import { describe, it, expect } from 'vitest'
import { extractAppError, isAuthError, AUTH_ERROR_CODES } from './errorHandler'
import type { AxiosError } from 'axios'

function makeAxiosError(data: unknown, status: number): AxiosError {
  return {
    response: { data, status, statusText: '', headers: {}, config: {} as never },
    isAxiosError: true,
    message: 'Request failed',
    name: 'AxiosError',
    toJSON: () => ({}),
  } as unknown as AxiosError
}

describe('extractAppError —— 后端统一错误信封解析', () => {
  it('解析标准信封（error_code/message/detail/category/request_id）', () => {
    const err = extractAppError(makeAxiosError({
      code: 'PERMISSION_DENIED',
      http_status: 403,
      data: null,
      status: 'error',
      message: '没有操作权限',
      detail: '没有操作权限',
      error_code: 'PERMISSION_DENIED',
      category: 'AUTH',
      request_id: 'req-123',
    }, 403))

    expect(err.error_code).toBe('PERMISSION_DENIED')
    expect(err.message).toBe('没有操作权限')
    expect(err.detail).toBe('没有操作权限')
    expect(err.category).toBe('AUTH')
    expect(err.request_id).toBe('req-123')
    expect(err.status).toBe(403)
  })

  it('后端仅返回 detail 时回退到 detail', () => {
    const err = extractAppError(makeAxiosError({ detail: 'Product not found.' }, 404))
    expect(err.message).toBe('Product not found.')
    expect(err.detail).toBe('Product not found.')
  })

  it('无信封（网络层错误）回退 HTTP 状态码', () => {
    const err = extractAppError(makeAxiosError({}, 500))
    expect(err.error_code).toBe('HTTP_500')
    expect(err.message).toBe('Request failed')
  })
})

describe('isAuthError —— 认证失效识别', () => {
  it('UNAUTHORIZED / REAUTH_REQUIRED 判定为认证错误', () => {
    for (const code of AUTH_ERROR_CODES) {
      expect(isAuthError({ error_code: code, message: '', detail: '', status: 401 })).toBe(true)
    }
  })

  it('业务错误码不是认证错误', () => {
    expect(isAuthError({ error_code: 'SPU_NOT_FOUND', message: '', detail: '', status: 404 })).toBe(false)
  })
})
