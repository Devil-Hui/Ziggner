const FALLBACK_REDIRECT = '/profile'

export function getSafeLoginRedirect(search: string): string {
  const redirect = new URLSearchParams(search).get('redirect')
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return FALLBACK_REDIRECT
  }
  if (redirect.includes('\\') || /[\u0000-\u001f]/.test(redirect)) {
    return FALLBACK_REDIRECT
  }
  return redirect
}
