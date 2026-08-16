import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, FontSize } from '../../../theme/tokens'
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
  top: calc(100% + 6px);
  right: 0;
  background: #fff;
  border: 1px solid ${Color.border.light};
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  padding: 6px 0;
  z-index: 1200;
`

const MenuItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 8px 14px;
  font-size: ${FontSize.sm}px;
  color: ${({ $active }) => ($active ? Color.text.primary : Color.text.body)};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  cursor: pointer;
  text-align: left;
  &:hover { background: ${Color.bg.page}; }
`

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥' }

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
          <LinkBtn onClick={() => navigate('/download')}>{t('store.nav.downloadApp')}</LinkBtn>
          <Divider>|</Divider>
          <LinkBtn onClick={() => navigate('/support')}>{t('store.nav.helpCenter')}</LinkBtn>
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
