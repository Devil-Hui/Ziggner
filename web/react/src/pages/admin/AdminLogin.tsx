import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation, LanguageSwitch } from '../../i18n'
import { CONFIG } from '../../config/constants'
import TurnstileWidget from '../../components/business/TurnstileWidget/TurnstileWidget'
import { post } from '../../api/request'

/* ── Lumiere editorial palette (aligned with storefront) ── */
const CREAM = '#f7f4ef'
const INK = '#1a1712'
const MUTED = '#6b6459'
const CLAY = '#c8623a'
const LINE = 'rgba(26, 23, 18, 0.10)'

const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${CREAM};
  padding: 2rem 1rem;
  overflow: hidden;

  /* soft decorative serif watermark */
  &::before {
    content: 'Z';
    position: absolute;
    right: -2rem;
    bottom: -6rem;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26rem;
    line-height: 1;
    color: rgba(26, 23, 18, 0.035);
    pointer-events: none;
    user-select: none;
  }
`

const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 48px 40px 40px;
  background: #fff;
  border: 1px solid ${LINE};
  border-radius: 20px;
  box-shadow: 0 18px 50px -24px rgba(26, 23, 18, 0.18);
`

const Brand = styled.h1`
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: ${INK};
  text-align: center;
  margin: 0 0 6px;
  span { color: ${CLAY}; }
`

const Subtitle = styled.p`
  text-align: center;
  color: ${MUTED};
  font-size: 0.875rem;
  margin: 0 0 28px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Input = styled.input`
  height: 46px;
  padding: 0 16px;
  border: 1px solid ${LINE};
  border-radius: 10px;
  font-size: 0.938rem;
  color: ${INK};
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: ${CLAY};
    box-shadow: 0 0 0 3px rgba(200, 98, 58, 0.12);
  }

  &::placeholder {
    color: #a89f92;
  }
`

const Button = styled.button<{ $loading?: boolean }>`
  height: 46px;
  border: none;
  border-radius: 9999px;
  background: ${CLAY};
  color: #fff;
  font-size: 0.938rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: ${({ $loading }) => ($loading ? 'not-allowed' : 'pointer')};
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, opacity 0.2s ease;
  opacity: ${({ $loading }) => ($loading ? 0.75 : 1)};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px -10px rgba(200, 98, 58, 0.55);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const SendCodeBtn = styled.button<{ $disabled?: boolean }>`
  height: 46px;
  padding: 0 18px;
  white-space: nowrap;
  border: 1px solid ${CLAY};
  border-radius: 10px;
  background: ${({ $disabled }) => ($disabled ? '#f3efe7' : 'transparent')};
  color: ${({ $disabled }) => ($disabled ? '#b5ab9d' : CLAY)};
  font-size: 0.875rem;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background 0.2s ease, color 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(200, 98, 58, 0.08);
  }
`

const CodeRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
`

const CodeInput = styled(Input)`
  flex: 1;
  min-width: 0;
  letter-spacing: 4px;
  text-align: left;

  &::placeholder {
    letter-spacing: normal;
  }
`

const Hint = styled.p`
  font-size: 0.75rem;
  color: ${MUTED};
  margin: -6px 0 0 0;
  text-align: left;
`

const ErrorText = styled.p`
  color: #c0392b;
  font-size: 0.813rem;
  text-align: center;
  margin: 0;
`

const SuccessText = styled.p`
  color: #2e7d5b;
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
      // 走 request.ts（带 VITE_API_URL 后端地址），不要用相对路径 fetch —— 相对路径会发到前端域导致 405
      const data: any = await post('/users/email/verify/send/', { email })
      if (data && data.verify_id) {
        setVerifyId(data.verify_id)
        setSuccess(t('admin.login.codeSent'))
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
        setError(t('admin.login.sendFailed'))
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('admin.login.sendFailed'))
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
      setError(t('admin.login.turnstileRequired'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const ok = await login(email, verifyId, verifyCode, turnstileToken)
      if (ok) {
        navigate('/admin/products', { replace: true })
      } else {
        setError(t('admin.login.invalidCredentials'))
        setVerifyCode('')
        setTurnstileToken(null)
      }
    } catch (err: unknown) {
      // 展示后端具体失败原因（验证码错误/过期、安全验证失败、非管理员等）
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || t('admin.login.invalidCredentials'))
      setVerifyCode('')
      setTurnstileToken(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Card>
        <Brand>Zig<span>gner</span></Brand>
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
            placeholder={t('admin.login.adminEmail')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <CodeRow>
            <CodeInput
              type="text"
              placeholder={t('admin.login.verifyCode')}
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
              {sendingCode ? t('admin.login.sendingCode') : countdown > 0 ? `${countdown}s` : t('admin.login.sendCode')}
            </SendCodeBtn>
          </CodeRow>
          <Hint>{t('admin.login.codeHint')}</Hint>
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
