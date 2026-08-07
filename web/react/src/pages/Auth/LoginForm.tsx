import { useState } from 'react'
import styled from 'styled-components'
import Input from '../../components/common/Input/Input'
import Button from '../../components/common/Button/Button'
import TurnstileWidget from '../../components/business/TurnstileWidget/TurnstileWidget'
import { useUser } from '../../store/UserContext'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { getSafeLoginRedirect } from './loginRedirect'

// ==================== 样式组件 ====================

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2vh;
`

const LinkText = styled(Link)`
  font-size: 0.9rem;
  color: #666;
  text-align: right;
  text-decoration: none;

  &:hover {
    color: #000;
    text-decoration: underline;
  }
`

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 2vh 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: #ddd;
  }

  span {
    padding: 0 1.5vw;
    color: #999;
    font-size: 0.85rem;
  }
`

const SocialLogin = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
`

const SocialBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid #ddd;
  background: #fff;
  height: 40px;
  padding: 0 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  img {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }
`

const TermsRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  color: #666;
  cursor: default;

  input[type='checkbox'] {
    flex-shrink: 0;
    margin-top: 2px;
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #000;
  }

  a {
    color: #000;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMsg = styled.p`
  color: #e74c3c;
  font-size: 0.85rem;
  text-align: center;
`

// ==================== 组件 ====================

const SOCIAL_AUTH_URLS: Record<string, string> = {
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  facebook: 'https://www.facebook.com/v12.0/dialog/oauth',
};

const SOCIAL_SCOPES: Record<string, string> = {
  google: 'openid email profile',
  facebook: 'email,public_profile',
};

export default function LoginForm() {
  const { t } = useTranslation()
  const { login, socialLogin: socialLoginUser } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const loginRedirect = getSafeLoginRedirect(location.search)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSocialLogin = async (provider: string) => {
    setSocialLoading(provider)
    setError('')

    try {
      // Fetch provider config to get client_id
      const res: any = await fetch('/api/users/social/providers/')
      const data = await res.json()
      const prov = data?.providers?.find((p: any) => p.provider === provider)

      if (!prov || !prov.client_id) {
        setError(t('store.auth.socialNotConfigured').replace('{provider}', provider))
        setSocialLoading(null)
        return
      }

      const redirectUri = `${window.location.origin}/auth/social/callback`
      const authUrl = SOCIAL_AUTH_URLS[provider]
      const scope = SOCIAL_SCOPES[provider]

      // Open OAuth popup (implicit grant)
      // ⚠️ 安全: 当前使用 response_type=token（隐式授权），access_token 出现在 URL fragment 中
      // 建议迁移至 Authorization Code Flow + PKCE (response_type=code) 以提高安全性
      const popupUrl = `${authUrl}?client_id=${prov.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=${provider}`

      const popup = window.open(popupUrl, 'social-login', 'width=600,height=700')

      if (!popup) {
        setError(t('store.auth.popupBlocked'))
        setSocialLoading(null)
        return
      }

      // Poll for the popup to close and get the token from URL hash
      const pollTimer = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollTimer)
            setSocialLoading(null)
            return
          }

          const popupUrl = popup.location.href
          if (popupUrl && popupUrl.includes('access_token=')) {
            clearInterval(pollTimer)
            const hash = new URL(popupUrl).hash.substring(1)
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')

            if (accessToken) {
              popup.close()
              await completeSocialLogin(provider, accessToken)
            }
          }
        } catch {
          // Cross-origin access — expected until redirect completes
        }
      }, 500)

      // Fallback timeout: 60s
      setTimeout(() => {
        clearInterval(pollTimer)
        if (socialLoading === provider) {
          setSocialLoading(null)
          setError(t('store.auth.loginTimeout'))
        }
      }, 60000)

    } catch (error) {
      setError(t('store.auth.socialLoginFailed'))
      setSocialLoading(null)
    }
  }

  const completeSocialLogin = async (provider: string, accessToken: string) => {
    try {
      const result = await socialLoginUser(provider, accessToken)
      if (result && result.needs_password_setup) {
        navigate('/auth/set-password', { state: { isNewUser: true } })
      } else if (result && result.access) {
        navigate(loginRedirect, { replace: true })
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || t('store.auth.socialLoginFailed'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError(t('store.auth.fillAllFields'))
      return
    }
    if (!termsAccepted) {
      setError(t('store.auth.acceptTerms'))
      return
    }
    if (!turnstileToken) {
      setError(t('store.auth.completeVerification'))
      return
    }

    const result = await login(formData.email, formData.password, turnstileToken)
    if (result.success) {
      navigate(loginRedirect, { replace: true })
    } else {
      setError(result.error || t('store.auth.invalidCredentials'))
    }
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Input
        type="text"
        placeholder={t('store.auth.mobilePlaceholder')}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <Input
        type="password"
        placeholder={t('store.auth.passwordPlaceholder')}
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />

      <LinkText to="/forgot-password">{t('store.auth.forgotPassword')}</LinkText>

      <TurnstileWidget
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
        onVerify={(token) => setTurnstileToken(token)}
      />

      <TermsRow>
        <input
          id="terms-checkbox"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <label htmlFor="terms-checkbox">
          {t('store.auth.agreeTerms')} <Link to="/about">{t('store.auth.termsPrivacy')}</Link>
        </label>
      </TermsRow>

      <Button type="submit" variant="primary" size="lg">
        {t('store.auth.signIn')}
      </Button>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Divider>
        <span>{t('store.auth.or')}</span>
      </Divider>

      <SocialLogin>
        <SocialBtn type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}>
          <img alt="google" src="/static/images/social/google.svg" />
          {socialLoading === 'google' ? t('store.auth.connecting') : 'Google'}
        </SocialBtn>
        <SocialBtn type="button" onClick={() => handleSocialLogin('facebook')} disabled={!!socialLoading}>
          <img alt="facebook" src="/static/images/social/facebook.svg" />
          {socialLoading === 'facebook' ? t('store.auth.connecting') : 'Facebook'}
        </SocialBtn>
      </SocialLogin>
    </Form>
  )
}
