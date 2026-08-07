import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const loginForm = readFileSync(fileURLToPath(new URL('./LoginForm.tsx', import.meta.url)), 'utf8')
const registerForm = readFileSync(fileURLToPath(new URL('./RegisterForm.tsx', import.meta.url)), 'utf8')
const userContext = readFileSync(
  fileURLToPath(new URL('../../store/UserContext.tsx', import.meta.url)),
  'utf8',
)
const publicApi = readFileSync(
  fileURLToPath(new URL('../../api/public.ts', import.meta.url)),
  'utf8',
)

describe('browser Turnstile login contract', () => {
  it('passes the verified token from the form through the session API', () => {
    expect(loginForm).toContain('login(formData.email, formData.password, turnstileToken)')
    expect(userContext).toContain('login: (username: string, password: string, turnstileToken: string)')
    expect(publicApi).toContain('login: async (username: string, password: string, turnstileToken: string)')
    expect(publicApi).toContain("turnstile_token: turnstileToken")
    expect(registerForm).toContain('turnstileToken')
    expect(userContext).toContain('return await login(username, password, turnstileToken)')
  })
})
