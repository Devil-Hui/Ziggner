import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import Navigation from '../../components/layout/Navigation/Navigation'
import { useTranslation } from '../../i18n'
import { Color, Radius, Transition, Layout } from '../../theme/tokens'
import { landingImages } from '../../assets/landing'

// ==================== 类型 ====================

type AuthTab = 'login' | 'register'

// ==================== 布局骨架 ====================

const AuthShell = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  display: grid;
  grid-template-columns: minmax(420px, 44%) 1fr;
  background: #fff;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const FormPane = styled.div`
  display: flex;
  flex-direction: column;
  padding: 40px 56px 48px;

  @media (max-width: 1200px) {
    padding: 32px 40px 40px;
  }
  @media (max-width: 520px) {
    padding: 24px 20px 32px;
  }
`

const BrandMark = styled(Link)`
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: ${Color.text.primary};
  text-decoration: none;
  line-height: 1;
`

const FormArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 440px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 0;
`

// ==================== 左侧文案 ====================

const Eyebrow = styled.p`
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${Color.text.muted};
  margin-bottom: 12px;
`

const Headline = styled.h1`
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -1.5px;
  line-height: 1.02;
  color: ${Color.text.primary};
  margin-bottom: 14px;
`

const Subline = styled.p`
  font-size: 0.95rem;
  color: ${Color.text.secondary};
  line-height: 1.55;
  margin-bottom: 32px;
  max-width: 40ch;
`

// ==================== 切换开关（Log in / Sign up 药丸） ====================

const ToggleBar = styled.div`
  position: relative;
  display: inline-flex;
  align-self: flex-start;
  background: ${Color.border.light};
  border-radius: 999px;
  padding: 4px;
  margin-bottom: 40px;
`

const ToggleItem = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: 999px;
  background: ${(props) => (props.$active ? Color.text.primary : 'transparent')};
  color: ${(props) => (props.$active ? '#fff' : Color.text.secondary)};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${Transition.slow};
  padding: 8px 22px;

  &:hover {
    color: ${(props) => (props.$active ? '#fff' : Color.text.primary)};
  }
`

// ==================== 右侧视觉面板 ====================

const VisualPane = styled.div`
  position: relative;
  overflow: hidden;
  background: #1a1214;

  @media (max-width: 900px) {
    display: none;
  }
`

const BgImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, rgba(10, 8, 9, 0.72) 0%, rgba(10, 8, 9, 0.18) 38%, rgba(10, 8, 9, 0) 60%),
    linear-gradient(to bottom, rgba(10, 8, 9, 0.38) 0%, rgba(10, 8, 9, 0) 22%);
`

const TopBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`

const MatchCard = styled.div`
  position: absolute;
  top: 72px;
  right: 28px;
  width: 180px;
  background: #fff;
  border-radius: ${Radius.md}px;
  padding: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
`

const MatchLabel = styled.p`
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${Color.text.muted};
`

const MatchValue = styled.p`
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -1px;
  color: ${Color.text.primary};
  margin: 6px 0 10px;
`

const MatchBar = styled.div`
  height: 3px;
  background: ${Color.border.light};
  border-radius: 999px;
  overflow: hidden;

  &::before {
    content: '';
    display: block;
    height: 100%;
    width: 94%;
    background: ${Color.text.primary};
  }
`

const MatchFoot = styled.p`
  margin-top: 8px;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${Color.text.muted};
`

const Slogan = styled.div`
  position: absolute;
  left: 28px;
  right: 28px;
  bottom: 26px;
  color: #fff;
`

const SloganTitle = styled.p`
  font-size: clamp(2.4rem, 4.5vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -1.5px;
  line-height: 1.02;

  em {
    display: block;
    font-style: italic;
    font-weight: 700;
  }
`

const SloganCaption = styled.p`
  margin-top: 12px;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.78);
  max-width: 46ch;
`

// ==================== 组件 ====================

export default function AuthPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: AuthTab = rawTab === 'register' ? 'register' : 'login'

  const handleToggle = (tab: AuthTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next)
  }

  return (
    <>
      <Navigation />
      <AuthShell>
      {/* 左侧：品牌 + 表单 */}
      <FormPane>
        <BrandMark to="/">Ziggner</BrandMark>

        <FormArea>
          <ToggleBar>
            <ToggleItem
              $active={activeTab === 'login'}
              onClick={() => handleToggle('login')}
            >
              {t('store.auth.login')}
            </ToggleItem>
            <ToggleItem
              $active={activeTab === 'register'}
              onClick={() => handleToggle('register')}
            >
              {t('store.auth.signUp')}
            </ToggleItem>
          </ToggleBar>

          <Eyebrow>
            {activeTab === 'login' ? t('store.auth.signIn') : t('store.auth.createAccount')}
          </Eyebrow>
          <Headline>{t('store.auth.signalTitle')}</Headline>
          <Subline>{t('store.auth.signalDesc')}</Subline>

          {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
        </FormArea>
      </FormPane>

      {/* 右侧：整块背景视觉 */}
      <VisualPane>
        <BgImage
          src={landingImages.authBg.src}
          alt={landingImages.authBg.alt}
        />
        <Scrim />

        <TopBar>
          <span>Ziggner / Members</span>
          <span>02 / 02</span>
        </TopBar>

        <MatchCard>
          <MatchLabel>Your agent match quality</MatchLabel>
          <MatchValue>94%</MatchValue>
          <MatchBar />
          <MatchFoot>Profile signal</MatchFoot>
        </MatchCard>

        <Slogan>
          <SloganTitle>
            {t('store.auth.promoTitle')}
            <em>{t('store.auth.promoTitleAccent')}</em>
          </SloganTitle>
          <SloganCaption>{t('store.auth.promoCaption')}</SloganCaption>
        </Slogan>
      </VisualPane>
      </AuthShell>
    </>
  )
}
