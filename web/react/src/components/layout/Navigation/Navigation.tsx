// Ziggner Navigation — Main site header with category mega menu, search, and cart dropdown
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../../store/CartContext'
import { useUser } from '../../../store/UserContext'
import CartDropdown from '../../../components/business/CartDropdown/CartDropdown'
import { useCategories } from '../../../hooks/useProducts'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import { patch, post as apiPost } from '../../../api/request'
import styled, { css, keyframes } from 'styled-components'
import {
  OPEN_CART_DROPDOWN_EVENT,
  type OpenCartDropdownDetail,
} from '../../../utils/cartEvents'

// Lumiere editorial palette — keep header in sync with the storefront
const CREAM = '#f7f4ef'
const INK = '#1a1712'
const CLAY = '#1a56db'
const LINE = 'rgba(26, 23, 18, 0.10)'

// ── SVG icons ──

const ArrowDown = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <polyline points="1 1 5 5 9 1" />
  </svg>
)

const ArrowRight = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 1 7 5 3 9" />
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
  background-color: ${CREAM};
  border-bottom: 1px solid ${LINE};
  position: relative;
  z-index: ${zIndex.header};
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5vh 2vw;
  border-radius: 0 0 ${Radius.md}px ${Radius.md}px;
`

const Logo = styled.img`
  height: 32px;
  cursor: pointer;
`

const SearchBar = styled.form`
  flex-grow: 1;
  margin: 0 4vw;
  display: flex;

  input {
    width: auto;
    flex: 1;
    min-width: 0;
    padding: 10px 20px;
    border: 1px solid transparent;
    border-radius: 20px 0 0 20px;
    font-size: 1rem;
    background: rgba(26, 23, 18, 0.05);
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus {
      border-color: ${CLAY};
      box-shadow: 0 0 0 2px rgba(26, 86, 219, 0.12);
    }
  }

  button {
    min-width: 64px;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid ${CLAY};
    border-radius: 0 20px 20px 0;
    background: ${CLAY};
    color: #fff;
    cursor: pointer;
    font-weight: 600;
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
  top: 110%;
  right: 0;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  min-width: 12vw;
  border-radius: ${Radius.sm};
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
  top: 110%;
  right: 0;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  min-width: 15vw;
  border-radius: ${Radius.sm};
  z-index: ${zIndex.dropdownContent};
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.3s ease;

  .user-info {
    padding: 1.5vh 1.5vw;
    border-bottom: 1px solid ${Color.border.light};
    font-weight: bold;
    font-size: 1rem;
  }

  .dropdown-divider {
    border-bottom: 1px solid ${Color.border.light};
  }

  .dropdown-logout {
    color: #ff4646;
  }
`

const BottomNav = styled.nav`
  display: flex;
  align-items: center;
  padding: 0 2vw;
  border-top: 1px solid #f0f0f0;
`

const CategoryButton = styled.button`
  background: ${CLAY};
  color: #fff;
  padding: 10px 20px;
  margin-left: 1.5vw;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  border: none;
  border-radius: ${Radius.full}px;
  display: flex;
  align-items: center;
  gap: 0.5vw;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px -8px rgba(26, 86, 219, 0.6);
  }
`

const MegaMenu = styled.div<{ $active?: boolean }>`
  position: absolute;
  top: 100%;
  left: 2vw;
  width: calc(100% - 4vw);
  max-width: 1200px;
  background: ${Color.bg.card};
  box-shadow: 0 15px 35px rgba(0,0,0,0.2);
  display: ${props => props.$active ? 'grid' : 'none'};
  grid-template-columns: 200px 350px 1fr;
  height: auto;
  max-height: 450px;
  z-index: ${zIndex.dropdown};
  border-radius: 0 0 ${Radius.md} ${Radius.md};

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    height: auto;
    max-height: 70vh;
    overflow-y: auto;
  }
`

const MenuSidebar = styled.div`
  background: #f9f9f9;
  border-right: 1px solid ${Color.border.light};
  overflow-y: auto;
`

const MenuLink = styled.div`
  padding: 1.5vh 2vw;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;

  &:hover, &.active {
    background: ${Color.bg.card};
    color: ${CLAY};
    font-weight: bold;
  }
`

const MenuSub = styled.div`
  padding: 2.5vh;
  border-right: 1px solid #f0f0f0;
  overflow-y: auto;
`

const SubGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5vw;
`

const SubGridItem = styled.div`
  text-align: center;
  cursor: pointer;
`

const SubThumb = styled.div`
  width: 60px;
  height: 60px;
  background: #f0f0f0;
  border-radius: 50%;
  margin: 0 auto 0.8vh;
`

const MenuDetail = styled.div`
  padding: 2.5vh;
  overflow-y: auto;
  background: ${Color.bg.card};
`

const MenuGroup = styled.div`
  margin-bottom: 3vh;
`

const MenuGroupTitle = styled.div`
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 1.5vh;
  border-bottom: 1px solid ${Color.border.light};
`

const MenuTagList = styled.div`
  display: flex;
  gap: 2vw;
  flex-wrap: wrap;
`

const MenuTag = styled.div`
  text-align: center;
  width: 70px;
  cursor: pointer;

  .circle-img {
    width: 50px;
    height: 50px;
    background: #f7f7f7;
    border-radius: 50%;
    margin: 0 auto 0.5vh;
  }

  span {
    font-size: 0.85rem;
  }
`

export default function Navigation() {
  const navigate = useNavigate()
  const { count } = useCart()
  const { user, isLoggedIn, logout, refreshUser } = useUser()
  const { categories: categoryTree } = useCategories()
  const { t, lang, setLang } = useTranslation()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showMegaMenu, setShowMegaMenu] = useState(false)
  const [activeLevel1, setActiveLevel1] = useState(-1)
  const [activeLevel2, setActiveLevel2] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Nickname modal state
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  const langRef = useRef<HTMLDivElement>(null)
  const megaRef = useRef<HTMLDivElement>(null)
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
      if (megaRef.current && !megaRef.current.contains(target)) {
        setShowMegaMenu(false)
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

  const currentCategory = activeLevel1 >= 0 ? categoryTree[activeLevel1] : null
  const currentSubCategories = currentCategory?.children || []
  const currentThirdLevel = currentSubCategories[activeLevel2]?.children || []

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
      await apiPost('/users/upload-avatar/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
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
  const handleCategoryClick = (catId?: number) => {
    navigate(catId ? `/category?cat_id=${catId}` : '/category')
    setShowMegaMenu(false)
  }
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const searchParams = new URLSearchParams()
    if (searchQuery.trim()) searchParams.set('q', searchQuery.trim())
    navigate(searchParams.size ? `/category?${searchParams.toString()}` : '/category')
  }

  return (
    <Header>
      <TopBar>
        <Logo src="/logo.png" alt="Ziggner" onClick={handleLogoClick} />

        <CategoryButton onClick={() => {
          if (!showMegaMenu) { setActiveLevel1(-1); setActiveLevel2(0) }
          setShowMegaMenu(!showMegaMenu)
        }}>
          {t('store.nav.categories')} <ArrowDown />
        </CategoryButton>

        <SearchBar role="search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('store.nav.searchPlaceholder')}
          />
          <button type="submit" aria-label={t('common.search')}>
            {t('common.search')}
          </button>
        </SearchBar>

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
              <DropdownItem onClick={() => setShowLangMenu(false)}>{t('store.nav.langFR')}</DropdownItem>
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
                <DropdownItem onClick={() => navigate('/cart')}>{t('store.nav.myOrders')}</DropdownItem>
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

      <BottomNav ref={megaRef}>
        <MegaMenu $active={showMegaMenu}>
          <MenuSidebar>
            {categoryTree.map((category, index) => (
              <MenuLink
                key={category.id}
                className={activeLevel1 === index ? 'active' : ''}
                onClick={() => {
                  setActiveLevel1(index)
                  setActiveLevel2(0)
                }}
              >
                {category.name} <ArrowRight />
              </MenuLink>
            ))}
          </MenuSidebar>

          <MenuSub>
            <SubGrid>
              {currentSubCategories.map((sub, index) => (
                <SubGridItem key={sub.id} onClick={() => setActiveLevel2(index)}>
                  <SubThumb />
                  <span>{sub.name}</span>
                </SubGridItem>
              ))}
            </SubGrid>
          </MenuSub>

          <MenuDetail>
            <MenuGroup>
              <MenuGroupTitle>{currentSubCategories[activeLevel2]?.name || ''}</MenuGroupTitle>
              <MenuTagList>
                {currentThirdLevel.map((item) => (
                  <MenuTag key={item.id} onClick={() => handleCategoryClick(item.id)}>
                    <div className="circle-img" />
                    <span>{item.name}</span>
                  </MenuTag>
                ))}
              </MenuTagList>
            </MenuGroup>
          </MenuDetail>
        </MegaMenu>
      </BottomNav>

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
