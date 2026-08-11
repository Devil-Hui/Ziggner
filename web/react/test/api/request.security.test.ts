import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(fileURLToPath(new URL('../../src/api/request.ts', import.meta.url)), 'utf8')
const adminContext = readFileSync(
  fileURLToPath(new URL('../../src/store/AdminAuthContext.tsx', import.meta.url)),
  'utf8',
)
const chatSource = readFileSync(
  fileURLToPath(new URL('../../src/pages/Chat/Chat.tsx', import.meta.url)),
  'utf8',
)

describe('browser authentication boundary', () => {
  it('uses the versioned first-party API with credentials and CSRF', () => {
    expect(source).toContain("'/api/v1'")
    expect(source).toContain('withCredentials: true')
    expect(source).toContain("xsrfCookieName: 'csrftoken'")
    expect(source).toContain("xsrfHeaderName: 'X-CSRFToken'")
  })

  it('never persists authentication tokens in browser storage', () => {
    expect(source).not.toContain('admin_access_token')
    expect(source).not.toContain('admin_refresh_token')
    expect(source).not.toContain('user_access_token')
    expect(source).not.toContain('user_refresh_token')
    expect(adminContext).not.toContain("localStorage.getItem('admin_access_token')")
    expect(adminContext).not.toContain("localStorage.setItem('admin_access_token'")
  })

  it('uses HttpOnly cookies for browser WebSocket authentication', () => {
    expect(chatSource).not.toContain('getUserAccessToken')
    expect(chatSource).not.toContain('?token=')
    expect(chatSource).toContain('/ws/chat/${convId}/')
  })
})
