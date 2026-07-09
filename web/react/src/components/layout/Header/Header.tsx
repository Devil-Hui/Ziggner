// TypeScript strict mode enabled
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../../store/CartContext'
import { useUser } from '../../../store/UserContext'
import CartDropdown from '../../../components/business/CartDropdown/CartDropdown'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import styled from 'styled-components'

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

const Dropdown = styled.div`
  position: relative;

  &:hover .cart-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
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

        <Dropdown>
          <DropButton className="cart-btn" onClick={(e) => {
            e.stopPropagation()
          }}>
            <CartIcon src="/static/images/icons/cart.svg" alt="cart" />
            ({count})
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
