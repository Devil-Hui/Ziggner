/**
 * SetPasswordPage — First-time password setup for social login users.
 * Shown after successful social login when user has no password set.
 */

import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { useUser } from '../../store/UserContext'
import { setPassword } from '../../api/social'
import { useTranslation } from '../../i18n'
import { Color, Shadow } from '../../theme/tokens'

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
  border-radius: 12px;
  box-shadow: ${Shadow.card};
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: ${Color.text.muted};
  text-align: center;
  margin-bottom: 32px;
`

const Input = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  font-size: 0.938rem;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;

  &:focus {
    border-color: ${Color.focus};
  }
`

const Button = styled.button`
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 6px;
  background: ${Color.primary};
  color: ${Color.text.inverse};
  font-size: 0.938rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: ${Color.primaryHover}; }
  &:disabled { background: ${Color.primaryLight}; cursor: not-allowed; }
`

const ErrorMsg = styled.p`
  color: ${Color.status.error};
  font-size: 0.813rem;
  text-align: center;
  margin-bottom: 16px;
`

const SuccessMsg = styled.p`
  color: ${Color.status.success};
  font-size: 0.813rem;
  text-align: center;
  margin-bottom: 16px;
`

const Hint = styled.p`
  font-size: 0.75rem;
  color: ${Color.text.muted};
  margin: -8px 0 16px;
`

const SkipLink = styled.button`
  display: block;
  margin: 16px auto 0;
  background: none;
  border: none;
  color: ${Color.text.muted};
  font-size: 0.813rem;
  cursor: pointer;
  text-decoration: underline;

  &:hover { color: ${Color.text.body}; }
`

export default function SetPasswordPage() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [password, setPasswordState] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // If user is not logged in, redirect to auth
  if (!user) return <Navigate to="/auth" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError(t('store.auth.setPasswordTooShort'))
      return
    }
    if (password !== confirmPwd) {
      setError(t('store.auth.setPasswordMismatch'))
      return
    }

    setLoading(true)
    try {
      await setPassword(password)
      setSuccess(t('store.auth.setPasswordSuccess'))
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('store.auth.setPasswordFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Card>
        <Title>{t('store.auth.setPasswordTitle')}</Title>
        <Subtitle>{t('store.auth.setPasswordSubtitle')}</Subtitle>

        <form onSubmit={handleSubmit}>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {success && <SuccessMsg>{success}</SuccessMsg>}

          <Input
            type="password"
            placeholder={t('store.auth.setPasswordPlaceholder')}
            value={password}
            onChange={e => setPasswordState(e.target.value)}
            autoFocus
          />
          <Hint>{t('store.auth.setPasswordHint')}</Hint>

          <Input
            type="password"
            placeholder={t('store.auth.setPasswordConfirm')}
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
          />

          <Button type="submit" disabled={loading || !password || !confirmPwd}>
            {loading ? t('store.auth.setPasswordLoading') : t('store.auth.setPasswordSubmit')}
          </Button>
        </form>

        <SkipLink onClick={() => navigate('/', { replace: true })}>
          {t('store.auth.setPasswordSkip')}
        </SkipLink>
      </Card>
    </Container>
  )
}
