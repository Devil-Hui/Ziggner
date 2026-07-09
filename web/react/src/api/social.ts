/**
 * Social OAuth login service.
 * Supports Google and Facebook authentication flow.
 */

import { post, get } from '../../api/request'

export interface SocialProvider {
  provider: string
  name: string
  configured: boolean
  auth_url: string | null
  client_id: string | null
}

export interface SocialLoginResult {
  access: string
  refresh: string
  user: { id: number; username: string; email: string }
  is_new_user: boolean
  needs_password_setup: boolean
  message?: string
}

/**
 * Fetch available social login providers
 */
export async function getSocialProviders(): Promise<SocialProvider[]> {
  try {
    const res: any = await get('/users/social/providers/')
    return res?.providers || []
  } catch {
    return []
  }
}

/**
 * Login with social access_token (client-side OAuth flow)
 * @param provider - 'google' | 'facebook'
 * @param accessToken - OAuth access token from provider
 */
export async function socialLogin(
  provider: string,
  accessToken: string,
): Promise<SocialLoginResult> {
  const res: any = await post('/users/social/login/', {
    provider,
    access_token: accessToken,
  })
  return res
}

/**
 * Set password for first-time social login user
 */
export async function setPassword(password: string): Promise<any> {
  return await post('/users/social/set-password/', { password })
}

/**
 * Exchange authorization code for tokens (server-side flow)
 * POST to backend which handles the code exchange
 */
export async function socialCallback(
  provider: string,
  code: string,
): Promise<SocialLoginResult> {
  const res: any = await post('/users/social/login/', {
    provider,
    code,
  })
  return res
}

/**
 * Unlink social account
 */
export async function unlinkSocial(provider: string): Promise<void> {
  await post('/users/social/unlink/', { provider })
}

/**
 * Get bound social accounts
 */
export async function getSocialAccounts(): Promise<any[]> {
  try {
    const res: any = await get('/users/social/accounts/')
    return res?.accounts || []
  } catch {
    return []
  }
}
