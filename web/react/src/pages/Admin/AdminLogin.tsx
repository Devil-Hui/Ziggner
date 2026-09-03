import { useState, useRef, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation, LanguageSwitch } from '../../i18n'
import { CONFIG } from '../../config/constants'
import TurnstileWidget, { type TurnstileWidgetHandle } from '../../components/business/TurnstileWidget/TurnstileWidget'
import { post, ensureCSRFCookie } from '../../api/request'
import { Color, Shadow } from '../../theme/tokens'

/* ── 配色统一取自 theme 令牌（与商城 C 端同源，改令牌即联动）── */
const CREAM = Color.bg.page
const INK = Color.text.primary
const MUTED = Color.text.muted
const CLAY = Color.primary
const LINE = Color.border.light

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
    color: rgba(14, 16, 19, 0.035);
    pointer-events: none;
    user-select: none;
  }
`

const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 48px 40px 40px;
  background: ${Color.bg.card};
  border: 1px solid ${LINE};
  border-radius: 20px;
  box-shadow: 0 18px 50px -24px rgba(14, 16, 19, 0.18);
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
  background: ${Color.bg.card};
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: ${CLAY};
    box-shadow: ${Shadow.focus};
  }

  &::placeholder {
    color: ${Color.text.muted};
  }
`

const Button = styled.button<{ $loading?: boolean }>`
  height: 46px;
  border: none;
  border-radius: 9999px;
  background: ${CLAY};
  color: ${Color.text.inverse};
  font-size: 0.938rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: ${({ $loading }) => ($loading ? 'not-allowed' : 'pointer')};
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, opacity 0.2s ease;
  opacity: ${({ $loading }) => ($loading ? 0.75 : 1)};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px -10px rgba(14, 16, 19, 0.5);
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
  background: ${({ $disabled }) => ($disabled ? Color.primaryLight : 'transparent')};
  color: ${({ $disabled }) => ($disabled ? Color.text.muted : CLAY)};
  font-size: 0.875rem;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background 0.2s ease, color 0.2s ease;

  &:hover:not(:disabled) {
    background: ${Color.primaryLight};
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
  color: ${Color.status.error};
  font-size: 0.813rem;
  text-align: center;
  margin: 0;
`

const SuccessText = styled.p`
  color: ${Color.status.success};
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
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)

  const sendVerifyCode = async () => {
    if (!email || sendingCode || countdown > 0) return
    setSendingCode(true)
    setError('')
    setSuccess('')
    try {
      // 确保 csrftoken cookie 就绪（后续登录 POST 需要 CSRF 校验）
      await ensureCSRFCookie().catch(() => {})
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
    if (!verifyId) {
      // 未点 Send Code（或刷新后 verify_id 丢失）→ 明确提示，避免向后端发无意义请求
      setError(t('admin.login.sendCodeFirst'))
      return
    }
    if (!password) {
      setError(t('admin.login.passwordRequired'))
      return
    }
    if (!turnstileToken) {
      setError(t('admin.login.turnstileRequired'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const ok = await login(email, verifyId, verifyCode, turnstileToken, password, username)
      if (ok) {
        navigate('/admin/products', { replace: true })
      } else {
        setError(t('admin.login.invalidCredentials'))
      }
    } catch (err: unknown) {
      // 展示后端具体失败原因（验证码错误/过期、安全验证失败、非管理员等）
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || t('admin.login.invalidCredentials'))
    } finally {
      setLoading(false)
    }
    // Turnstile token 是一次性的：无论成功与否，本次提交后 token 已消费/失效。
    // 必须重置 widget 并清空 token，否则用户修正后重试会因 token 失效而报「安全认证错误」。
    turnstileRef.current?.reset()
    setTurnstileToken(null)
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
            ref={turnstileRef}
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
