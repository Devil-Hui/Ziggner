/**
 * SetPasswordPage — First-time password setup for social login users.
 * Shown after successful social login when user has no password set.
 */

import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { useUser } from '../../store/UserContext'
import { setPassword } from '../../api/social'

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f8f8f8;
`

const Card = styled.div`
  width: 400px;
  padding: 48px 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #888;
  text-align: center;
  margin-bottom: 32px;
`

const Input = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.938rem;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;

  &:focus {
    border-color: #1a56db;
  }
`

const Button = styled.button`
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 6px;
  background: #1a56db;
  color: #fff;
  font-size: 0.938rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: #1648c0; }
  &:disabled { background: #93b4f0; cursor: not-allowed; }
`

const ErrorMsg = styled.p`
  color: #e74c3c;
  font-size: 0.813rem;
  text-align: center;
  margin-bottom: 16px;
`

const SuccessMsg = styled.p`
  color: #27ae60;
  font-size: 0.813rem;
  text-align: center;
  margin-bottom: 16px;
`

const Hint = styled.p`
  font-size: 0.75rem;
  color: #999;
  margin: -8px 0 16px;
`

const SkipLink = styled.button`
  display: block;
  margin: 16px auto 0;
  background: none;
  border: none;
  color: #888;
  font-size: 0.813rem;
  cursor: pointer;
  text-decoration: underline;

  &:hover { color: #555; }
`

export default function SetPasswordPage() {
  const { user } = useUser()
  const navigate = useNavigate()
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
      setError('密码长度不能少于6位')
      return
    }
    if (password !== confirmPwd) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await setPassword(password)
      setSuccess('密码设置成功！')
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err: any) {
      setError(err?.response?.data?.detail || '密码设置失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Card>
        <Title>设置密码</Title>
        <Subtitle>首次登录成功！请设置您的登录密码</Subtitle>

        <form onSubmit={handleSubmit}>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {success && <SuccessMsg>{success}</SuccessMsg>}

          <Input
            type="password"
            placeholder="设置密码（至少6位）"
            value={password}
            onChange={e => setPasswordState(e.target.value)}
            autoFocus
          />
          <Hint>密码至少包含6个字符</Hint>

          <Input
            type="password"
            placeholder="确认密码"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
          />

          <Button type="submit" disabled={loading || !password || !confirmPwd}>
            {loading ? '设置中...' : '设置密码'}
          </Button>
        </form>

        <SkipLink onClick={() => navigate('/', { replace: true })}>
          稍后设置，先去逛逛
        </SkipLink>
      </Card>
    </Container>
  )
}
