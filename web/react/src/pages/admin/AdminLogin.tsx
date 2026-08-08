import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation, LanguageSwitch } from '../../i18n'
import { CONFIG } from '../../config/constants'
import TurnstileWidget from '../../components/business/TurnstileWidget/TurnstileWidget'

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${Color.bg.page};
`

const Card = styled.div`
  width: 400px;
  padding: 48px 40px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
`

const Logo = styled.h1`
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  color: ${Color.text.heading};
  text-align: center;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
`

const Subtitle = styled.p`
  text-align: center;
  color: ${Color.text.muted};
  font-size: 0.875rem;
  margin-bottom: 32px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Input = styled.input`
  height: 44px;
  padding: 0 14px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  font-size: 0.938rem;
  color: ${Color.text.heading};
  background: ${Color.primaryLight};
  outline: none;
  transition: ${Transition.normal};

  &:focus {
    border-color: #e74c3c;
    background: ${Color.bg.card};
  }

  &::placeholder {
    color: ${Color.border.dark};
  }
`

const Button = styled.button<{ $loading?: boolean }>`
  height: 44px;
  border: none;
  border-radius: 6px;
  background: ${({ $loading }) => ($loading ? '#c0392b' : '#e74c3c')};
  color: ${Color.text.inverse};
  font-size: 0.938rem;
  font-weight: 500;
  cursor: ${({ $loading }) => ($loading ? 'not-allowed' : 'pointer')};
  transition: ${Transition.normal};
  opacity: ${({ $loading }) => ($loading ? 0.8 : 1)};

  &:hover:not(:disabled) {
    background: #c0392b;
  }
`

const SendCodeBtn = styled.button<{ $disabled?: boolean }>`
  height: 44px;
  padding: 0 16px;
  white-space: nowrap;
  border: 1px solid #e74c3c;
  border-radius: 6px;
  background: ${({ $disabled }) => ($disabled ? Color.border.light : 'transparent')};
  color: ${({ $disabled }) => ($disabled ? Color.text.muted : '#e74c3c')};
  font-size: 0.875rem;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: ${Transition.normal};

  &:hover:not(:disabled) {
    background: #fdf0ef;
  }
`

const CodeRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
`

const CodeInput = styled.input`
  flex: 1;
  height: 44px;
  padding: 0 14px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  font-size: 0.938rem;
  color: ${Color.text.heading};
  background: ${Color.primaryLight};
  outline: none;
  transition: ${Transition.normal};
  letter-spacing: 4px;
  text-align: center;

  &:focus {
    border-color: #e74c3c;
    background: ${Color.bg.card};
  }

  &::placeholder {
    color: ${Color.border.dark};
    letter-spacing: normal;
  }
`

const Hint = styled.p`
  font-size: 0.75rem;
  color: ${Color.text.muted};
  margin: -8px 0 0 0;
  text-align: left;
`

const ErrorText = styled.p`
  color: #e74c3c;
  font-size: 0.813rem;
  text-align: center;
  margin: 0;
`

const SuccessText = styled.p`
  color: #27ae60;
  font-size: 0.813rem;
  text-align: center;
  margin: 0;
`

export default function AdminLogin() {
  const { t } = useTranslation()
  const { isAuthenticated, login } = useAdminAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [verifyId, setVerifyId] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const sendVerifyCode = async () => {
    if (!email || sendingCode || countdown > 0) return
    setSendingCode(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/users/email/verify/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (response.ok) {
        setVerifyId(data.verify_id)
        setSuccess('验证码已发送到您的邮箱')
        setCountdown(CONFIG.VERIFY_CODE_COUNTDOWN_SECONDS)
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setError(data.detail || '发送失败')
      }
    } catch {
      setError('发送失败，请稍后重试')
    } finally {
      setSendingCode(false)
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/admin/products" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !verifyCode) return
    if (!turnstileToken) {
      setError('请完成安全验证')
      return
    }
    setError('')
    setLoading(true)
    const ok = await login(email, verifyId, verifyCode, turnstileToken)
    setLoading(false)
    if (ok) {
      navigate('/admin/products', { replace: true })
    } else {
      setError(t('admin.login.invalidCredentials'))
      setVerifyCode('')
      setTurnstileToken(null)
    }
  }

  return (
    <Container>
      <Card>
        <Logo>{t('admin.login.title')}</Logo>
        <Subtitle>{t('admin.login.subtitle')}</Subtitle>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <LanguageSwitch position="login" />
        </div>
        <Form onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder={t('admin.login.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            type="email"
            placeholder="管理员邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <CodeRow>
            <CodeInput
              type="text"
              placeholder="邮箱验证码"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              maxLength={CONFIG.VERIFY_CODE_LENGTH}
            />
            <SendCodeBtn
              type="button"
              $disabled={!email || sendingCode || countdown > 0}
              onClick={sendVerifyCode}
              disabled={!email || sendingCode || countdown > 0}
            >
              {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '发送验证码'}
            </SendCodeBtn>
          </CodeRow>
          <Hint>请输入管理员邮箱以接收登录验证码</Hint>
          <Input
            type="password"
            placeholder={t('admin.login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TurnstileWidget
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
            onVerify={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken(null)}
          />
          {success && <SuccessText>{success}</SuccessText>}
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" $loading={loading} disabled={!username || !password || !verifyCode || !turnstileToken || loading}>
            {loading ? t('admin.login.signingIn') : t('admin.login.signIn')}
          </Button>
        </Form>
      </Card>
    </Container>
  )
}