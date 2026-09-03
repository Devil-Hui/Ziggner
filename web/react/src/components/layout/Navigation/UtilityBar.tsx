import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, FontSize, Shadow } from '../../../theme/tokens'
import { useTranslation } from '../../../i18n'
import { useUser } from '../../../store/UserContext'
import { useCurrency, CURRENCIES } from '../../../store/CurrencyContext'

const Bar = styled.div`
  background: ${Color.bg.page};
  border-bottom: 1px solid ${Color.border.light};
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
`

// Layout max content width mirrored from theme tokens (Layout.maxContentWidth may differ)
const Layout_max = '1200px'

const Inner = styled.div`
  max-width: ${Layout_max};
  margin: 0 auto;
  padding: 6px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const LinkBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  color: ${Color.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  &:hover { color: ${Color.text.primary}; }
`

const Divider = styled.span`
  color: ${Color.border.medium};
`

const DropWrap = styled.div`
  position: relative;
`

const Menu = styled.div<{ $show: boolean }>`
  display: ${({ $show }) => ($show ? 'block' : 'none')};
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 150px;
  padding: 6px;
  z-index: 1200;
  animation: menuIn 0.18s ease;
  @keyframes menuIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

const MenuItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 9px 12px;
  border-radius: 7px;
  font-size: ${FontSize.sm}px;
  color: ${({ $active }) => ($active ? Color.text.primary : Color.text.body)};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
  &:hover { background: ${Color.bg.page}; }
  ${({ $active }) => $active && `background: ${Color.primaryLight};`}
`

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', JPY: '¥' }

export default function UtilityBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn, user, logout } = useUser()
  const { currency, setCurrency } = useCurrency()
  const [showCurrency, setShowCurrency] = useState(false)
  const currencyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setShowCurrency(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  return (
    <Bar>
      <Inner>
        <Left>
          {isLoggedIn ? (
            <>
              <span>{t('store.nav.hi')} {user?.nickname || user?.name}</span>
              <LinkBtn onClick={() => { logout(); navigate('/') }}>{t('store.nav.signOut')}</LinkBtn>
            </>
          ) : (
            <>
              <span>{t('store.nav.hi')}</span>
              <LinkBtn onClick={() => navigate('/auth?tab=login')}>{t('store.nav.signIn')}</LinkBtn>
              <span>/</span>
              <LinkBtn onClick={() => navigate('/auth?tab=register')}>{t('store.nav.register')}</LinkBtn>
            </>
          )}
        </Left>

        <Right>
          <LinkBtn onClick={() => navigate('/profile')}>{t('store.nav.ordersReturns')}</LinkBtn>
          <Divider>|</Divider>
          <LinkBtn onClick={() => navigate('/profile?tab=support')}>{t('store.nav.helpCenter')}</LinkBtn>
          <Divider>|</Divider>
          <DropWrap ref={currencyRef}>
            <LinkBtn onClick={() => setShowCurrency((v) => !v)}>
              {SYMBOL[currency]} {currency}
            </LinkBtn>
            <Menu $show={showCurrency}>
              {CURRENCIES.map((c) => (
                <MenuItem
                  key={c}
                  $active={c === currency}
                  onClick={() => { setCurrency(c); setShowCurrency(false) }}
                >
                  {SYMBOL[c]} {c}
                </MenuItem>
              ))}
            </Menu>
          </DropWrap>
        </Right>
      </Inner>
    </Bar>
  )
}
