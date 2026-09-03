import { useState } from 'react'
import styled from 'styled-components'
import Input from '../../components/common/Input/Input'
import Button from '../../components/common/Button/Button'
import TurnstileWidget from '../../components/business/TurnstileWidget/TurnstileWidget'
import { useUser } from '../../store/UserContext'
import { Color } from '../../theme/tokens'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { post, ensureCSRFCookie } from '../../api/request'
import { useHoneypot } from '../../components/common/Honeypot'

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
  border: 1px solid ${Color.text.primary};
  background: ${Color.bg.card};
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${Color.bg.sunken};
  }
`

const TermsRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  color: ${Color.text.body};
  cursor: default;

  input[type='checkbox'] {
    flex-shrink: 0;
    margin-top: 2px;
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: ${Color.text.primary};
  }

  a {
    color: ${Color.text.primary};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`

const ErrorMsg = styled.p`
  color: ${Color.status.error};
  font-size: 0.85rem;
  text-align: center;
`

// ==================== 密码强度提示组件 ====================

const PasswordPanel = styled.div`
  margin-top: 6px;
  padding: 12px 14px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  background: ${Color.bg.sunken};
`

const StrengthBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
`

const StrengthSegment = styled.div<{ $active: boolean; $color: string }>`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${({ $active, $color }) => ($active ? $color : Color.border.medium)};
  transition: background 0.2s ease;
`

const StrengthLabel = styled.span<{ $color: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
`

const RuleList = styled.ul`
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RuleItemLi = styled.li<{ $met: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: ${({ $met }) => ($met ? Color.status.success : Color.text.muted)};
  transition: color 0.2s ease;
`

const RuleIcon = styled.span<{ $met: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 0.7rem;
  line-height: 1;
  flex-shrink: 0;
  background: ${({ $met }) => ($met ? Color.status.success : Color.border.medium)};
  color: #fff;
`

const MatchHint = styled.p<{ $ok: boolean }>`
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: ${({ $ok }) => ($ok ? Color.status.success : Color.status.error)};
`

// ==================== 密码强度计算 ====================

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

interface RuleCheck {
  key: string
  label: string
  met: boolean
}

function evaluatePassword(password: string): { level: StrengthLevel; score: number; rules: RuleCheck[] } {
  const rules: RuleCheck[] = [
    { key: 'length', label: 'passwordRuleLength', met: password.length >= 8 },
    { key: 'upper', label: 'passwordRuleUpper', met: /[A-Z]/.test(password) },
    { key: 'lower', label: 'passwordRuleLower', met: /[a-z]/.test(password) },
    { key: 'digitOrSpecial', label: 'passwordRuleDigitOrSpecial', met: /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) },
  ]
  const score = rules.filter(r => r.met).length

  let level: StrengthLevel = 'weak'
  if (score >= 4) level = 'strong'
  else if (score === 3) level = 'good'
  else if (score === 2) level = 'fair'

  return { rules, score, level }
}

const STRENGTH_META: Record<StrengthLevel, { label: string; color: string; segments: number }> = {
  weak: { label: 'passwordStrengthWeak', color: Color.status.error, segments: 1 },
  fair: { label: 'passwordStrengthFair', color: Color.status.warning, segments: 2 },
  good: { label: 'passwordStrengthGood', color: '#2358d8', segments: 3 },
  strong: { label: 'passwordStrengthStrong', color: Color.status.success, segments: 4 },
}

// ==================== 组件 ====================

export default function RegisterForm() {
  const { t } = useTranslation()
  const { register } = useUser()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
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
  const [passwordFocused, setPasswordFocused] = useState(false)
  const hp = useHoneypot()

  const passwordEval = evaluatePassword(formData.password)
  const confirmTouched = formData.confirmPassword.length > 0
  const confirmMatch = formData.confirmPassword === formData.password
  const strength = STRENGTH_META[passwordEval.level]

  const handleSendCode = async () => {
    if (!formData.email || codeCooldown > 0) return
    setCodeSending(true)
    try {
      // 确保 csrftoken cookie 就绪（后续注册 POST 需要 CSRF 校验）
      await ensureCSRFCookie().catch(() => {})
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

    // 蜜罐：自动化爬虫常无差别填充所有 input，命中即静默丢弃
    if (hp.isBot()) return

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError(t('store.auth.fillAllFields'))
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('store.auth.passwordsMatch'))
      return
    }
    // 与后端 RegisterSerializer 校验规则保持一致：
    // 用户名 4-32 位，仅字母/数字/下划线/连字符；密码 ≥8 位且含大写、小写、数字或特殊字符
    if (!/^[A-Za-z0-9_\-]{4,32}$/.test(formData.username)) {
      setError(t('store.auth.usernameFormat'))
      return
    }
    if (passwordEval.score < 4) {
      setError(t('store.auth.passwordStrength'))
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
        <div>
          <Input
            type="password"
            placeholder={t('store.auth.passwordPlaceholder')}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            required
          />
          {passwordFocused && (
            <PasswordPanel>
              <StrengthBar>
                {[1, 2, 3, 4].map(seg => (
                  <StrengthSegment key={seg} $active={seg <= strength.segments} $color={strength.color} />
                ))}
              </StrengthBar>
              <StrengthLabel $color={strength.color}>
                {t(`store.auth.${strength.label}`)}
              </StrengthLabel>
              <RuleList>
                {passwordEval.rules.map(rule => (
                  <RuleItemLi key={rule.key} $met={rule.met}>
                    <RuleIcon $met={rule.met}>{rule.met ? '✓' : ''}</RuleIcon>
                    {t(`store.auth.${rule.label}`)}
                  </RuleItemLi>
                ))}
              </RuleList>
            </PasswordPanel>
          )}
        </div>
        <div>
          <Input
            type="password"
            placeholder={t('store.auth.confirmPassword')}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
          {confirmTouched && (
            <MatchHint $ok={confirmMatch}>
              {confirmMatch ? t('store.auth.passwordMatchSuccess') : t('store.auth.passwordsMatch')}
            </MatchHint>
          )}
        </div>
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

      {hp.field}

      {error && <ErrorMsg>{error}</ErrorMsg>}
    </Form>
  )
}