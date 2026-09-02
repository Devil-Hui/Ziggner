/**
 * ForgotPasswordPage — 忘记密码
 *
 * 流程：
 *   Step 1: 输入注册邮箱 → 发送验证码（返回 verify_id）
 *   Step 2: 输入验证码 → 重置为随机密码 → 展示新密码，提示用新密码登录
 *
 * 风格与 AuthPage 一致（editorial 风格），header 复用 Navigation，
 * 提供返回按钮回到登录页。
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styled from 'styled-components'
import Navigation from '../../components/layout/Navigation/Navigation'
import { useTranslation } from '../../i18n'
import { Layout } from '../../theme/tokens'
import { post, ensureCSRFCookie } from '../../api/request'
// 复用落地页设计令牌，保证与 AuthPage / Home 视觉完全一致
import { Ink, Font, Type, Radius, Elevation, Ease } from '../Home/editorial'

// ==================== 布局骨架 ====================

const Shell = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${Ink.paper};
  padding: 48px 20px;
`

const Card = styled.div`
  width: 100%;
  max-width: 440px;
  background: ${Ink.paper};
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.xl}px;
  box-shadow: ${Elevation.card};
  padding: 40px 40px 44px;

  @media (max-width: 520px) {
    padding: 28px 20px 32px;
  }
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${Ink.graphite};
  text-decoration: none;
  margin-bottom: 24px;
  transition: color 0.2s ease;

  &:hover {
    color: ${Ink.black};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const Eyebrow = styled.p`
  ${Type.wideCaps}
  font-size: 0.7rem;
  font-weight: 700;
  color: ${Ink.brand};
  margin-bottom: 12px;
`

const Title = styled.h1`
  font-family: ${Font.display};
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  ${Type.tighter}
  line-height: 1.1;
  color: ${Ink.black};
  margin-bottom: 12px;
`

const Subtitle = styled.p`
  font-size: 0.92rem;
  color: ${Ink.graphite};
  line-height: 1.6;
  margin-bottom: 28px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${Ink.black};
`

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${Ink.ruleStrong};
  border-radius: ${Radius.md}px;
  background: ${Ink.paper};
  color: ${Ink.black};
  font-size: 0.9rem;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: ${Ink.faint};
  }

  &:focus,
  &:focus-visible {
    outline: none;
    border-color: ${Ink.black};
    box-shadow: none;
  }
`

const CodeRow = styled.div`
  display: flex;
  gap: 10px;
`

const CodeBtn = styled.button`
  flex-shrink: 0;
  padding: 0 16px;
  border: 1px solid ${Ink.ruleStrong};
  border-radius: ${Radius.md}px;
  background: ${Ink.paper};
  color: ${Ink.black};
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${Ink.black};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SubmitBtn = styled.button`
  width: 100%;
  background: ${Ink.black};
  color: ${Ink.paper};
  border: none;
  border-radius: ${Radius.md}px;
  padding: 14px 20px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${Elevation.ink};
  transition: background 0.3s ${Ease.cinema}, transform 0.3s ${Ease.cinema};

  &:hover:not(:disabled) {
    background: #000;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ErrorMsg = styled.p`
  color: ${Ink.rose};
  font-size: 0.85rem;
  text-align: center;
`

const SuccessBox = styled.div`
  background: ${Ink.upSoft};
  border: 1px solid ${Ink.upBorder};
  border-radius: ${Radius.md}px;
  padding: 16px;
  margin-bottom: 16px;
`

const SuccessTitle = styled.p`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${Ink.up};
  margin-bottom: 8px;
`

const NewPasswordBox = styled.div`
  background: ${Ink.paper};
  border: 1px dashed ${Ink.ruleStrong};
  border-radius: ${Radius.md}px;
  padding: 12px 14px;
  font-family: ${Font.mono};
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: ${Ink.black};
  text-align: center;
  margin: 12px 0;
  user-select: all;
`

const SuccessText = styled.p`
  font-size: 0.85rem;
  color: ${Ink.graphite};
  line-height: 1.6;
`

const BackToLogin = styled(Link)`
  display: block;
  text-align: center;
  margin-top: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${Ink.black};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

// ==================== 组件 ====================

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [verifyId, setVerifyId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [codeCooldown, setCodeCooldown] = useState(0)
  const [codeSending, setCodeSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSendCode = async () => {
    if (!email || codeCooldown > 0) return
    setError('')
    setCodeSending(true)
    try {
      await ensureCSRFCookie().catch(() => {})
      const res: any = await post('/users/password/forgot/send/', { email })
      if (res && res.verify_id) {
        setVerifyId(res.verify_id)
      }
      setCodeCooldown(30)
      const timer = setInterval(() => {
        setCodeCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('store.auth.codeSendFailed'))
    } finally {
      setCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError(t('store.auth.fillAllFields'))
      return
    }
    if (!verifyId || !code) {
      setError(t('store.auth.fillAllFields'))
      return
    }

    setSubmitting(true)
    try {
      const res: any = await post('/users/password/forgot/reset/', {
        verify_id: verifyId,
        code,
      })
      if (res && res.new_password) {
        setNewPassword(res.new_password)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('store.auth.resetPasswordFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navigation />
      <Shell>
        <Card>
          <BackLink to="/auth?tab=login">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('store.auth.backToLogin')}
          </BackLink>

          <Eyebrow>{t('store.auth.forgotPassword')}</Eyebrow>
          <Title>{t('store.auth.forgotTitle')}</Title>
          <Subtitle>{t('store.auth.forgotSubtitle')}</Subtitle>

          {newPassword ? (
            <>
              <SuccessBox>
                <SuccessTitle>{t('store.auth.resetSuccess')}</SuccessTitle>
                <NewPasswordBox>{newPassword}</NewPasswordBox>
                <SuccessText>{t('store.auth.resetSuccessHint')}</SuccessText>
              </SuccessBox>
              <SubmitBtn type="button" onClick={() => navigate('/auth?tab=login')}>
                {t('store.auth.signIn')}
              </SubmitBtn>
            </>
          ) : (
            <Form onSubmit={handleSubmit} noValidate>
              <Field>
                <Label>{t('store.auth.emailPlaceholder')}</Label>
                <Input
                  type="email"
                  placeholder={t('store.auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <Label>{t('store.auth.verificationCode')}</Label>
                <CodeRow>
                  <Input
                    type="text"
                    placeholder={t('store.auth.verificationCode')}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <CodeBtn
                    type="button"
                    onClick={handleSendCode}
                    disabled={codeCooldown > 0 || codeSending || !email}
                  >
                    {codeSending
                      ? t('store.auth.sending')
                      : codeCooldown > 0
                        ? `${codeCooldown}s`
                        : t('store.auth.getCode')}
                  </CodeBtn>
                </CodeRow>
              </Field>

              {error && <ErrorMsg>{error}</ErrorMsg>}

              <SubmitBtn type="submit" disabled={submitting || !verifyId || !code}>
                {submitting ? t('store.auth.resetting') : t('store.auth.resetPassword')}
              </SubmitBtn>
            </Form>
          )}

          <BackLink to="/auth?tab=login">{t('store.auth.backToLogin')}</BackLink>
        </Card>
      </Shell>
    </>
  )
}