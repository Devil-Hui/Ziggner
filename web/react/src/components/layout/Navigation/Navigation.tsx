// Ziggner Navigation — Main site header with category mega menu and cart dropdown
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../../store/CartContext'
import { useUser } from '../../../store/UserContext'
import { useCategories } from '../../../hooks/useProducts'
import CartDropdown from '../../../components/business/CartDropdown/CartDropdown'
import UtilityBar from './UtilityBar'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import { patch, post as apiPost } from '../../../api/request'
import styled, { css, keyframes } from 'styled-components'
import {
  OPEN_CART_DROPDOWN_EVENT,
  type OpenCartDropdownDetail,
} from '../../../utils/cartEvents'

// 品牌配色一律取自 theme 令牌（改令牌即全局联动，此处禁止写十六进制字面量）
const CLAY = Color.primary
const LINE = Color.border.light

// ── SVG icons ──

const ArrowDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <polyline points="1 1 5 5 9 1" />
  </svg>
)

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const Header = styled.header`
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid ${LINE};
  position: relative;
  z-index: ${zIndex.header};
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem clamp(1.25rem, 4vw, 4.5rem);
  border-radius: 0 0 ${Radius.md}px ${Radius.md}px;
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  flex-shrink: 0;
`

const LogoImg = styled.img`
  height: 40px;
  width: auto;
  display: block;
`


const NavActions = styled.div`
  display: flex;
  gap: 1.5vw;
  align-items: center;
  position: relative;
`

const DropButton = styled.button`
  background: transparent;
  border: 1px solid ${LINE};
  padding: 0 ${Spacing.md};
  height: 40px;
  min-width: 40px;
  border-radius: ${Radius.full}px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5vw;
  transition: border-color 0.2s ease, color 0.2s ease;

  &:hover {
    border-color: ${CLAY};
    color: ${CLAY};
  }
`

const CartIcon = styled.img`
  width: 24px;
  height: 24px;
`

const popBadge = keyframes`
  0% { transform: scale(1); }
  30% { transform: scale(1.22); }
  60% { transform: scale(0.94); }
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
  background: ${Color.status.error};
  color: ${Color.text.inverse};
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

  &:hover .cart-dropdown,
  &:hover .user-dropdown {
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
  top: calc(100% + 8px);
  right: 0;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 12vw;
  border-radius: 10px;
  padding: 6px;
  z-index: ${zIndex.dropdownContent};
  animation: langMenuIn 0.18s ease;
  @keyframes langMenuIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

const DropdownItem = styled.div`
  padding: 9px 12px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${Color.primaryLight};
    color: ${CLAY};
  }
`

/* ── 主站导航（与落地页 EditorialNav 一致，hover 展开子项） ── */
const MainNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 1.4vw;
  margin-left: 1.5vw;
  flex-shrink: 0;

  @media (max-width: 1100px) {
    display: none;
  }
`

const NavItem = styled.div`
  position: relative;

  &:hover .nav-submenu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }
`

const NavLink = styled.a`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${Color.text.primary};
  text-decoration: none;
  padding: 0.5rem 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: ${CLAY};
  }
`

const NavCaret = styled.span`
  font-size: 0.6rem;
  opacity: 0.6;
`

const SubMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 15vw;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  z-index: ${zIndex.dropdownContent};
`

const SubItem = styled.a`
  display: block;
  padding: 9px 12px;
  border-radius: 7px;
  font-size: 0.85rem;
  color: ${Color.text.primary};
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${Color.primaryLight};
    color: ${CLAY};
  }
`

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${Color.border.medium};
  margin-right: 0.5vw;
  position: relative;
  cursor: pointer;
  overflow: visible;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-camera {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;

    svg {
      width: 10px;
      height: 10px;
    }

    &:hover {
      background: rgba(0, 0, 0, 0.75);
    }
  }
`

const CameraIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const NicknameModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: ${zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
`

const NicknameModalCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  padding: ${Spacing.xxl}px;
  min-width: 360px;
  box-shadow: ${Shadow.modal};

  h3 {
    margin: 0 0 ${Spacing.lg}px;
    font-size: ${FontSize.lg}px;
    color: ${Color.text.heading};
  }

  input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid ${Color.border.medium};
    border-radius: ${Radius.sm}px;
    font-size: 1rem;
    margin-bottom: ${Spacing.lg}px;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: ${Color.primary};
      box-shadow: ${Shadow.focus};
    }
  }

  .modal-actions {
    display: flex;
    gap: ${Spacing.sm}px;
    justify-content: flex-end;
  }
`

const ModalBtn = styled.button<{ $primary?: boolean }>`
  padding: 8px 20px;
  border-radius: ${Radius.sm}px;
  border: 1px solid ${props => props.$primary ? 'transparent' : Color.border.medium};
  background: ${props => props.$primary ? Color.primary : 'transparent'};
  color: ${props => props.$primary ? Color.text.inverse : Color.text.body};
  cursor: pointer;
  font-size: 0.9rem;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const UserMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 15vw;
  border-radius: 10px;
  padding: 6px;
  z-index: ${zIndex.dropdownContent};
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.3s ease;

  .user-info {
    padding: 10px 12px;
    border-bottom: 1px solid ${Color.border.light};
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .dropdown-divider {
    border-bottom: 1px solid ${Color.border.light};
    margin: 4px 0;
  }

  .dropdown-logout {
    color: ${Color.status.error};
  }
`

/** 主站导航项 —— 价值导向动词，与落地页各 section 覆盖内容对齐，未登录同样可见 */
const NAV_ITEMS: { label: string; href: string; children: { label: string; href: string }[] }[] = [
  {
    label: 'Optimize',
    href: '/#optimizer',
    children: [
      { label: 'AI Optimizer', href: '/#optimizer' },
      { label: 'Shop Products', href: '/category' },
    ],
  },
  {
    label: 'Automate',
    href: '/#paths',
    children: [
      { label: 'Competitor Analysis', href: '/#paths' },
      { label: 'Site Builder', href: '/#paths' },
      { label: 'AI Marketing', href: '/#paths' },
    ],
  },
  {
    label: 'Launch',
    href: '/#journey',
    children: [
      { label: '30-day Workflow', href: '/#journey' },
      { label: 'AI Agents', href: '/#paths' },
    ],
  },
]

export default function Navigation() {
  const navigate = useNavigate()
  const { count } = useCart()
  const { user, isLoggedIn, logout, refreshUser } = useUser()
  const { t, lang, setLang } = useTranslation()
  const { categories: shopCategories } = useCategories()
  const [showLangMenu, setShowLangMenu] = useState(false)

  // Nickname modal state
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  const langRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [cartForceOpen, setCartForceOpen] = useState(false)
  const [badgeBump, setBadgeBump] = useState(false)

  useEffect(() => {
    if (count <= 0) return
    setBadgeBump(true)
    const t = window.setTimeout(() => setBadgeBump(false), 450)
    return () => window.clearTimeout(t)
  }, [count])

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (langRef.current && !langRef.current.contains(target)) {
        setShowLangMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  const handleLoginClick = () => navigate('/login')
  const handleLogout = () => {
    logout()
    navigate('/')
  }
  const handleAvatarClick = () => {
    avatarInputRef.current?.click()
  }
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      // 不要手动覆盖 Content-Type：axios/browser 会为 FormData 自动带上
      // multipart/form-data; boundary=xxx。若写死 multipart/form-data，
      // boundary 丢失 → 后端 request.FILES 解析为空 → 400 上传失败。
      await apiPost('/users/upload-avatar/', formData)
      await refreshUser()
    } catch {
      // silently fail — user keeps current avatar
    }
    // reset input so same file can be re-selected
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }
  const handleOpenNicknameModal = () => {
    setNewNickname(user?.nickname || user?.name || '')
    setShowNicknameModal(true)
  }
  const handleSaveNickname = async () => {
    if (!newNickname.trim()) return
    setSavingNickname(true)
    try {
      await patch('/users/me/', { nickname: newNickname.trim() })
      await refreshUser()
      setShowNicknameModal(false)
    } catch {
      // keep modal open on failure
    } finally {
      setSavingNickname(false)
    }
  }
  return (
    <Header>
      <UtilityBar />
      <TopBar>
        <Logo onClick={handleLogoClick}>
          <LogoImg src="/static/images/logo.png" alt="Ziggner" />
        </Logo>

        <MainNav>
          {NAV_ITEMS.map(item => (
            <NavItem key={item.label}>
              <NavLink
                href={item.href}
                onClick={e => {
                  e.preventDefault()
                  navigate(item.href)
                }}
              >
                {item.label}
                <NavCaret>▾</NavCaret>
              </NavLink>
              <SubMenu className="nav-submenu">
                {item.children.map(child => (
                  <SubItem
                    key={child.label}
                    href={child.href}
                    onClick={e => {
                      e.preventDefault()
                      navigate(child.href)
                    }}
                  >
                    {child.label}
                  </SubItem>
                ))}
              </SubMenu>
            </NavItem>
          ))}

          {/* 商城分类：一级标题 = 商城大类，子项 = 二级分类，前瞻性设计 */}
          {shopCategories.map(cat => (
            <NavItem key={cat.id}>
              <NavLink
                href={`/category?cat_id=${cat.id}`}
                onClick={e => {
                  e.preventDefault()
                  navigate(`/category?cat_id=${cat.id}`)
                }}
              >
                {cat.name}
                {cat.children && cat.children.length > 0 && <NavCaret>▾</NavCaret>}
              </NavLink>
              {cat.children && cat.children.length > 0 && (
                <SubMenu className="nav-submenu">
                  {cat.children.map(child => (
                    <SubItem
                      key={child.id}
                      href={`/category?cat_id=${child.id}`}
                      onClick={e => {
                        e.preventDefault()
                        navigate(`/category?cat_id=${child.id}`)
                      }}
                    >
                      {child.name}
                    </SubItem>
                  ))}
                </SubMenu>
              )}
            </NavItem>
          ))}
        </MainNav>

        <NavActions>
          <Dropdown ref={langRef}>
            <DropButton onClick={(e) => {
              e.stopPropagation()
              setShowLangMenu(!showLangMenu)
            }}>
              <GlobeIcon />
            </DropButton>
            <LangMenu $show={showLangMenu}>
              <DropdownItem onClick={() => { setLang('en-US'); setShowLangMenu(false) }}>{t('store.nav.langEN')}</DropdownItem>
              <DropdownItem onClick={() => { setLang('zh-CN'); setShowLangMenu(false) }}>{t('store.nav.langCN')}</DropdownItem>
            </LangMenu>
          </Dropdown>

          <Dropdown $forceOpen={cartForceOpen}>
            <DropButton onClick={(e) => {
              e.stopPropagation()
              navigate('/cart')
            }}>
              <CartIcon src="/static/images/icons/cart.svg" alt="cart" />
              {count > 0 ? <CartCount $bump={badgeBump}>{count}</CartCount> : <span>(0)</span>}
            </DropButton>
            <CartDropdown />
          </Dropdown>

          {isLoggedIn ? (
            <Dropdown ref={userRef}>
              <DropButton onClick={(e) => e.stopPropagation()}>
                <UserAvatar onClick={handleAvatarClick} title={t('store.nav.changeNickname')}>
                  {user?.avatar ? <img src={user.avatar} alt={user?.name || ''} /> : null}
                  <span className="avatar-camera"><CameraIcon /></span>
                </UserAvatar>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
                {user?.nickname || user?.name || t('store.nav.user')} <ArrowDown />
              </DropButton>
              <UserMenu className="user-dropdown">
                <div className="user-info">{user?.nickname || user?.name || t('store.nav.user')}</div>
                <DropdownItem onClick={handleProfileClick}>{t('store.nav.profile')}</DropdownItem>
                <DropdownItem onClick={handleOpenNicknameModal}>{t('store.nav.changeNickname')}</DropdownItem>
                <DropdownItem onClick={() => navigate('/profile')}>{t('store.nav.myOrders')}</DropdownItem>
                <DropdownItem onClick={() => navigate('/coupons')}>{t('store.nav.myCoupons')}</DropdownItem>
                <DropdownItem onClick={() => navigate('/coupons/center')}>{t('store.nav.couponCenter')}</DropdownItem>
                <DropdownItem onClick={() => navigate('/history')}>{t('store.nav.recentlyViewed')}</DropdownItem>
                <DropdownItem onClick={() => navigate('/support')}>{t('store.nav.support')}</DropdownItem>
                <div className="dropdown-divider"></div>
                <DropdownItem className="dropdown-logout" onClick={handleLogout}>{t('store.nav.logout')}</DropdownItem>
              </UserMenu>
            </Dropdown>
          ) : (
            <DropButton onClick={handleLoginClick}><UserIcon /></DropButton>
          )}
        </NavActions>
      </TopBar>

      {showNicknameModal && (
        <NicknameModalOverlay onClick={() => setShowNicknameModal(false)}>
          <NicknameModalCard onClick={(e) => e.stopPropagation()}>
            <h3>{t('store.nav.editNicknameTitle')}</h3>
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder={t('store.nav.newNicknamePlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNickname() }}
              autoFocus
            />
            <div className="modal-actions">
              <ModalBtn onClick={() => setShowNicknameModal(false)}>{t('common.cancel')}</ModalBtn>
              <ModalBtn $primary onClick={handleSaveNickname} disabled={savingNickname || !newNickname.trim()}>
                {savingNickname ? t('store.nav.savingNickname') : t('store.nav.saveNickname')}
              </ModalBtn>
            </div>
          </NicknameModalCard>
        </NicknameModalOverlay>
      )}
    </Header>
  )
}
