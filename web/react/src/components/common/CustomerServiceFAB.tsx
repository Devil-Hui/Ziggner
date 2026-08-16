import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, FontSize } from '../../theme/tokens'

// 买家端常驻客服入口：除管理台 / 登录 / 支付流程外，所有页面右下角可见
const HIDDEN_PREFIXES = [
  '/admin', '/auth', '/mock-payment', '/payment/return', '/login', '/register',
]

const Fab = styled.button<{ $hidden: boolean }>`
  position: fixed;
  right: 24px;
  bottom: 28px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #1a56db, #1e40af);
  color: #fff;
  display: ${p => (p.$hidden ? 'none' : 'flex')};
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(26, 86, 219, 0.35);
  z-index: 999;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s;

  &:hover {
    transform: translateY(-3px) scale(1.06);
    box-shadow: 0 12px 30px rgba(255, 61, 110, 0.45);
  }
  &:active {
    transform: scale(0.96);
  }
  svg {
    width: 26px;
    height: 26px;
  }
`

const Tooltip = styled.span`
  position: absolute;
  right: 66px;
  white-space: nowrap;
  background: ${Color.bg.card};
  color: ${Color.text.heading};
  font-size: ${FontSize.xs}px;
  padding: 6px 10px;
  border-radius: ${Radius.sm}px;
  box-shadow: ${Shadow.card};
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;

  ${Fab}:hover & {
    opacity: 1;
  }
`

export default function CustomerServiceFAB() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const hidden = HIDDEN_PREFIXES.some(p => pathname.startsWith(p))

  return (
    <Fab
      $hidden={hidden}
      onClick={() => navigate('/support')}
      aria-label={t('store.product.contactSupport')}
    >
      <Tooltip>{t('store.product.contactSupport')}</Tooltip>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    </Fab>
  )
}
