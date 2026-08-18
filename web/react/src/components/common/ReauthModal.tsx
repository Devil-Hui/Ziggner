import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { useAdminAuth } from '../../store/AdminAuthContext'

/**
 * 重新登录模态框。
 *
 * 当后端因「权限/登录状态变更」旋转安全戳后，旧会话会被判定为失效，
 * 任意认证请求都会返回 401 + error_code=REAUTH_REQUIRED。
 * request.ts 的响应拦截器捕获该错误码并派发 window 事件 'auth:relogin-required'，
 * 本组件监听该事件并弹出提示；用户点击「重新登录」后清除本地会话并跳转到管理员登录页。
 */
export default function ReauthModal() {
  const { t } = useTranslation()
  const { logout } = useAdminAuth()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(true)
    window.addEventListener('auth:relogin-required', handler)
    return () => window.removeEventListener('auth:relogin-required', handler)
  }, [])

  if (!visible) return null

  const handleLoginAgain = () => {
    setVisible(false)
    // 清除本地会话（logout 内部也会调用后端 /users/session/logout/ 使 refresh cookie 失效）
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div style={overlay}>
      <div style={card} role="alertdialog" aria-modal="true" aria-labelledby="reauth-title">
        <h2 id="reauth-title" style={title}>{t('reauth.title')}</h2>
        <p style={message}>{t('reauth.message')}</p>
        <button type="button" style={button} onClick={handleLoginAgain}>
          {t('reauth.loginAgain')}
        </button>
      </div>
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.5)',
  padding: 16,
}

const card: CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  maxWidth: 420,
  width: '100%',
  padding: '28px 24px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
  textAlign: 'center',
}

const title: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: '0 0 12px',
  color: '#111',
}

const message: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: '#555',
  margin: '0 0 24px',
}

const button: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  color: '#fff',
  background: '#e0322f',
  cursor: 'pointer',
}
