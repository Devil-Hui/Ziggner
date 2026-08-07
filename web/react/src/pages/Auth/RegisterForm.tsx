import { useState } from 'react'
import styled from 'styled-components'
import Input from '../../components/common/Input/Input'
import Button from '../../components/common/Button/Button'
import TurnstileWidget from '../../components/business/TurnstileWidget/TurnstileWidget'
import { useUser } from '../../store/UserContext'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { post } from '../../api/request'

// ==================== 样式组件 ====================

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2vh;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2vh 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const CodeRow = styled.div`
  display: flex;
  gap: 10px;
`

const CodeBtn = styled.button`
  padding: 0 14px;
  border: 1px solid #000;
  background: #fff;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #f5f5f5;
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
`

const ErrorMsg = styled.p`
  color: #e74c3c;
  font-size: 0.85rem;
  text-align: center;
`

// ==================== 组件 ====================

export default function RegisterForm() {
  const { t } = useTranslation()
  const { register } = useUser()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    code: '',
  })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [codeCooldown, setCodeCooldown] = useState(0)
  const [codeSending, setCodeSending] = useState(false)
  const [verifyId, setVerifyId] = useState('')

  const handleSendCode = async () => {
    if (!formData.email || codeCooldown > 0) return
    setCodeSending(true)
    try {
      const res: any = await post('/users/email/verify/send/', { email: formData.email })
      if (res && res.verify_id) {
        setVerifyId(res.verify_id)
      }
      setCodeCooldown(30)
      const timer = setInterval(() => {
        setCodeCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError(t('store.auth.codeSendFailed') || 'Failed to send code')
    } finally {
      setCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError(t('store.auth.fillAllFields'))
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('store.auth.passwordsMatch'))
      return
    }
    if (formData.password.length < 6) {
      setError(t('store.auth.passwordLength'))
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

    const result = await register(
      formData.username,
      formData.password,
      formData.email || undefined,
      formData.phone || undefined,
      verifyId || undefined,
      formData.code || undefined,
      turnstileToken,
    )

    if (result.success) {
      navigate('/profile')
    } else {
      setError(result.error || t('store.auth.registrationFailed'))
    }
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Grid>
        <Input
          type="text"
          placeholder={t('store.auth.usernamePlaceholder')}
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
        <Input
          type="text"
          placeholder={t('store.auth.emailPlaceholder')}
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
        <Input
          type="text"
          placeholder={t('store.auth.phonePlaceholder')}
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        <Input
          type="password"
          placeholder={t('store.auth.confirmPassword')}
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />
        <CodeRow>
          <Input
            type="text"
            placeholder={t('store.auth.verificationCode')}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <CodeBtn type="button" onClick={handleSendCode} disabled={codeCooldown > 0 || codeSending}>
            {codeSending ? 'Sending...' : codeCooldown > 0 ? `${codeCooldown}s` : t('store.auth.getCode')}
          </CodeBtn>
        </CodeRow>
      </Grid>

      <TurnstileWidget
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
        onVerify={(token) => setTurnstileToken(token)}
      />

      <TermsRow>
        <input
          id="register-terms-checkbox"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <label htmlFor="register-terms-checkbox">
          {t('store.auth.agreeTerms')} <Link to="/about">{t('store.auth.termsPrivacy')}</Link>
        </label>
      </TermsRow>

      <Button type="submit" variant="primary" size="lg">
        {t('store.auth.signUp')}
      </Button>

      {error && <ErrorMsg>{error}</ErrorMsg>}
    </Form>
  )
}
