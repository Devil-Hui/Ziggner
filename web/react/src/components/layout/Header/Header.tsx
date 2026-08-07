// TypeScript strict mode enabled
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../../store/CartContext'
import { useUser } from '../../../store/UserContext'
import CartDropdown from '../../../components/business/CartDropdown/CartDropdown'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import styled, { keyframes, css } from 'styled-components'
import {
  OPEN_CART_DROPDOWN_EVENT,
  type OpenCartDropdownDetail,
} from '../../../utils/cartEvents'

const TopBar = styled.header`
  background-color: #ffffff;
  padding: 1.5vh 2vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  position: relative;
  z-index: ${zIndex.content};
`

const Logo = styled.div`
  font-size: 1.75rem;
  font-weight: bold;
  color: #333;
  cursor: pointer;
`

const SearchBar = styled.div`
  flex-grow: 1;
  margin: 0 4vw;

  input {
    width: 100%;
    padding: 1vh 1.5vw;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    display: none;
  }
`

const NavActions = styled.div`
  display: flex;
  gap: 1.5vw;
  align-items: center;
  position: relative;
`

const DropButton = styled.button`
  background: #f5f5f5;
  border: 1px solid #ddd;
  padding: 0 12px;
  height: 40px;
  min-width: 40px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5vw;

  &:hover {
    background: #eee;
  }

  &.cart-btn:hover {
    background: #eee;
  }
`

const CartIcon = styled.img`
  width: 20px;
  height: 20px;
`

const popBadge = keyframes`
  0% { transform: scale(1); }
  30% { transform: scale(1.25); }
  60% { transform: scale(0.92); }
  100% { transform: scale(1); }
`

const CartCount = styled.span<{ $bump?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #e74c3c;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  ${({ $bump }) =>
    $bump &&
    css`
      animation: ${popBadge} 0.45s ease;
    `}
`

const Dropdown = styled.div<{ $forceOpen?: boolean }>`
  position: relative;

  &:hover .cart-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }

  ${({ $forceOpen }) =>
    $forceOpen &&
    css`
      .cart-dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        pointer-events: auto;
      }
    `}
`

const LangMenu = styled.div<{ $show?: boolean }>`
  display: ${props => props.$show ? 'block' : 'none'};
  position: absolute;
  top: 110%;
  right: 0;
  background: white;
  border: 1px solid #eee;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  min-width: 12vw;
  border-radius: 4px;
  z-index: ${zIndex.dropdownContent};
`

const DropdownItem = styled.div`
  padding: 1vh 1.5vw;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: #f0f0f0;
  }
`

export default function Header() {
  const navigate = useNavigate()
  const { count } = useCart()
  const { isLoggedIn, logout } = useUser()
  const { setLang } = useTranslation()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [badgeBump, setBadgeBump] = useState(false)
  const [cartForceOpen, setCartForceOpen] = useState(false)

  useEffect(() => {
    if (count <= 0) return
    setBadgeBump(true)
    const timer = window.setTimeout(() => setBadgeBump(false), 450)
    return () => window.clearTimeout(timer)
  }, [count])

  useEffect(() => {
    let timer: number | undefined
    const handler = (e: Event) => {
      const ce = e as CustomEvent<OpenCartDropdownDetail>
      const durationMs = ce.detail?.durationMs ?? 3500
      setCartForceOpen(true)
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => setCartForceOpen(false), durationMs)
    }
    window.addEventListener(OPEN_CART_DROPDOWN_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(OPEN_CART_DROPDOWN_EVENT, handler as EventListener)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  const handleLogoClick = () => navigate('/')
  const handleProfileClick = () => navigate('/profile')
  const handleRegisterClick = () => navigate('/register')
  const handleLoginClick = () => navigate('/login')
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <TopBar>
      <Logo onClick={handleLogoClick}>Logo</Logo>

      <SearchBar>
        <input type="text" placeholder="Search products..." />
      </SearchBar>

      <NavActions>
        <Dropdown>
          <DropButton onClick={(e) => {
            e.stopPropagation()
            setShowLangMenu(!showLangMenu)
          }}>
            EN ▾
          </DropButton>
          <LangMenu $show={showLangMenu}>
            <DropdownItem onClick={() => { setLang('en-US'); setShowLangMenu(false) }}>English (EN)</DropdownItem>
            <DropdownItem onClick={() => { setLang('zh-CN'); setShowLangMenu(false) }}>中文 (CN)</DropdownItem>
            <DropdownItem onClick={() => setShowLangMenu(false)}>Français (FR)</DropdownItem>
          </LangMenu>
        </Dropdown>

        <DropButton>Setting</DropButton>

        <Dropdown $forceOpen={cartForceOpen}>
          <DropButton className="cart-btn" onClick={(e) => {
            e.stopPropagation()
            navigate('/cart')
          }}>
            <CartIcon src="/static/images/icons/cart.svg" alt="cart" />
            {count > 0 ? <CartCount $bump={badgeBump}>{count}</CartCount> : <span>(0)</span>}
          </DropButton>
          <CartDropdown />
        </Dropdown>

        {isLoggedIn ? (
          <>
            <DropButton onClick={handleProfileClick}>Profile</DropButton>
            <DropButton onClick={handleLogout}>Logout</DropButton>
          </>
        ) : (
          <>
            <DropButton onClick={handleLoginClick}>Login</DropButton>
            <DropButton onClick={handleRegisterClick}>Register</DropButton>
          </>
        )}
      </NavActions>
    </TopBar>
  )
}
