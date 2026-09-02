import { useSearchParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import Navigation from '../../components/layout/Navigation/Navigation'
import { useTranslation } from '../../i18n'
import { Color, Transition, Layout } from '../../theme/tokens'
import { landingImages } from '../../assets/landing'
// 复用落地页设计令牌，保证与 Home 落地页视觉完全一致
import { Ink, Font, Type, Radius, Elevation, Ease } from '../Home/editorial'

// ==================== 类型 ====================

type AuthTab = 'login' | 'register'

// ==================== 布局骨架 ====================

const AuthShell = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  display: grid;
  grid-template-columns: minmax(420px, 44%) 1fr;
  align-items: stretch;
  background: ${Ink.paper};

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
  font-family: ${Font.display};
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${Ink.black};
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

  /* ── 表单样式统一到落地页体系 ──────────────────────
   * 全局 Input/Button 是旧后台风格（小圆角、蓝色 focus、彩色主按钮），
   * 此处用后代选择器覆盖为 editorial 风格，不动全局组件。 */

  /* 表单纵向节奏：固定 16px，替代旧 2vh 视口单位；
   * 清零子元素自带 margin（旧 24px / 2vh），间距统一交给 gap */
  & form {
    gap: 16px;
  }
  & form > div {
    margin-bottom: 0;
  }

  /* 输入框：白底 + 1px 细线 + 12px 圆角 + 墨黑 focus */
  & form input {
    border-radius: ${Radius.md}px;
    border-color: ${Ink.ruleStrong};
    background: ${Ink.paper};
    color: ${Ink.black};
    padding: 12px 14px;
    font-size: 0.9rem;
    transition: border-color 0.2s ease;
  }
  & form input::placeholder {
    color: ${Ink.faint};
  }
  & form input:focus,
  & form input:focus-visible {
    outline: none;
    border-color: ${Ink.black};
    box-shadow: none;
  }

  /* 条款复选框：墨黑勾选 */
  & form input[type='checkbox'] {
    accent-color: ${Ink.black};
  }

  /* 验证码等次级按钮：细线 + 圆角 + hover 墨黑描边 */
  & form button[type='button'] {
    border-radius: ${Radius.md}px;
    border: 1px solid ${Ink.ruleStrong};
    background: ${Ink.paper};
    color: ${Ink.black};
    font-weight: 600;
    white-space: nowrap;
    transition: border-color 0.2s ease;
  }
  & form button[type='button']:hover:not(:disabled) {
    border-color: ${Ink.black};
    background: ${Ink.paper};
  }

  /* 主提交按钮：全宽墨黑大按钮（参考图样式） */
  & form button[type='submit'] {
    width: 100%;
    background: ${Ink.black};
    color: ${Ink.paper};
    border-radius: ${Radius.md}px;
    padding: 14px 20px;
    font-size: 0.9rem;
    font-weight: 700;
    box-shadow: ${Elevation.ink};
    transition: background 0.3s ${Ease.cinema}, transform 0.3s ${Ease.cinema};
  }
  & form button[type='submit']:hover:not(:disabled) {
    background: #000;
    transform: translateY(-2px);
  }
`

// ==================== 左侧文案 ====================

const Eyebrow = styled.p`
  ${Type.wideCaps}
  font-size: 0.7rem;
  font-weight: 700;
  color: ${Ink.brand};
  margin-bottom: 12px;
`

const Headline = styled.h1`
  font-family: ${Font.display};
  font-size: clamp(2rem, 3.6vw, 3.1rem);
  font-weight: 800;
  ${Type.tighter}
  line-height: 1.05;
  color: ${Ink.black};
  margin-bottom: 14px;
`

const Subline = styled.p`
  font-size: 0.95rem;
  color: ${Ink.graphite};
  line-height: 1.65;
  margin-bottom: 32px;
  max-width: 44ch;
`

// ==================== 切换开关（Log in / Sign up 药丸） ====================

const ToggleBar = styled.div`
  position: relative;
  display: inline-flex;
  align-self: flex-start;
  background: ${Ink.paperAlt};
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.full}px;
  padding: 4px;
  margin-bottom: 32px;
`

const ToggleItem = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: ${Radius.full}px;
  background: ${(props) => (props.$active ? Ink.black : 'transparent')};
  color: ${(props) => (props.$active ? Ink.paper : Ink.graphite)};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${Transition.slow};
  padding: 8px 22px;

  &:hover {
    color: ${(props) => (props.$active ? Ink.paper : Ink.black)};
  }
`

// ==================== 右侧视觉面板 ====================

const VisualPane = styled.div`
  position: relative;
  overflow: hidden;
  background: ${Ink.near};

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
  animation: authBgFade 0.5s ${Ease.cinema};

  @keyframes authBgFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, rgba(14, 16, 19, 0.74) 0%, rgba(14, 16, 19, 0.2) 38%, rgba(14, 16, 19, 0) 60%),
    linear-gradient(to bottom, rgba(14, 16, 19, 0.4) 0%, rgba(14, 16, 19, 0) 22%);
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
  ${Type.wideCaps}
  font-size: 0.66rem;
  font-weight: 700;
`

const MatchCard = styled.div`
  position: absolute;
  top: 72px;
  right: 28px;
  width: 186px;
  background: ${Ink.paper};
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.xl}px;
  padding: 16px;
  box-shadow: ${Elevation.float};
`

const MatchLabel = styled.p`
  ${Type.wideCaps}
  font-size: 0.6rem;
  font-weight: 700;
  color: ${Ink.faint};
`

const MatchValue = styled.p`
  ${Type.tnum}
  font-family: ${Font.display};
  font-size: 1.9rem;
  font-weight: 800;
  ${Type.tighter}
  color: ${Ink.black};
  margin: 6px 0 10px;
`

const MatchBar = styled.div<{ $pct: number }>`
  height: 4px;
  background: ${Ink.paperAlt};
  border-radius: ${Radius.full}px;
  overflow: hidden;

  &::before {
    content: '';
    display: block;
    height: 100%;
    width: ${(props) => props.$pct}%;
    background: ${Ink.brand};
  }
`

const MatchFoot = styled.p`
  margin-top: 8px;
  ${Type.wideCaps}
  font-size: 0.6rem;
  font-weight: 700;
  color: ${Ink.faint};
`

const Slogan = styled.div`
  position: absolute;
  left: 28px;
  right: 28px;
  bottom: 26px;
  color: ${Ink.paper};
`

const SloganTitle = styled.p`
  font-family: ${Font.display};
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 800;
  ${Type.tighter}
  line-height: 1.04;

  em {
    display: block;
    font-style: normal;
    color: rgba(255, 255, 255, 0.92);
  }
`

const SloganCaption = styled.p`
  margin-top: 12px;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.78);
  max-width: 48ch;
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

  // 登录/注册两个 tab 使用不同的落地页同款背景图与卖点文案：
  // 登录 → journey（六步旅程拍摄场景）+ Hero 的 AI 优化数据卡
  // 注册 → creatorDesk（创作者工作台）+ Journey 30 天开店旅程卡
  const isLogin = activeTab === 'login'
  const bg = isLogin ? landingImages.journey : landingImages.creatorDesk
  const promoTitle = isLogin ? t('store.auth.loginPromoTitle') : t('store.auth.registerPromoTitle')
  const promoAccent = isLogin
    ? t('store.auth.loginPromoAccent')
    : t('store.auth.registerPromoAccent')
  const promoCaption = isLogin
    ? t('store.auth.loginPromoCaption')
    : t('store.auth.registerPromoCaption')
  // 浮动数据卡：登录呼应落地页 Hero「AI Optimizer +1,017% views」；
  // 注册呼应 Journey「30-day store journey」第 1 步 Pick a Product
  const matchLabel = isLogin ? 'AI Optimizer' : 'Your 30-day journey'
  const matchValue = isLogin ? '+1,017%' : 'Day 01'
  const matchPct = isLogin ? 94 : 12
  const matchFoot = isLogin ? 'Views after AI pass' : 'Step 1 — Pick a product'

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

        {/* 右侧：整块背景视觉（落地页同款素材与数据） */}
        <VisualPane>
          <BgImage key={activeTab} src={bg.src} alt={bg.alt} />
          <Scrim />

          <TopBar>
            <span>Ziggner / AI Creator Incubator</span>
            <span>02 / 02</span>
          </TopBar>

          <MatchCard>
            <MatchLabel>{matchLabel}</MatchLabel>
            <MatchValue>{matchValue}</MatchValue>
            <MatchBar $pct={matchPct} />
            <MatchFoot>{matchFoot}</MatchFoot>
          </MatchCard>

          <Slogan>
            <SloganTitle>
              {promoTitle}
              <em>{promoAccent}</em>
            </SloganTitle>
            <SloganCaption>{promoCaption}</SloganCaption>
          </Slogan>
        </VisualPane>
      </AuthShell>
    </>
  )
}
