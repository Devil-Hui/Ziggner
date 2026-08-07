import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import { useTranslation } from '../../i18n'
import { Color, Radius, Transition, Layout } from '../../theme/tokens'

// ==================== 类型 ====================

type AuthTab = 'login' | 'register'

// ==================== 样式组件 ====================

const AuthContainer = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  background-color: ${Color.bg.page};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5vh 2vw;
`

const AuthCard = styled.div`
  width: 100%;
  max-width: 960px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: grid;
  grid-template-columns: 40% 60%;
  overflow: hidden;
  min-height: 560px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 480px;
  }
`

const LeftPanel = styled.div`
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const RightPanel = styled.div`
  background: ${Color.bg.page};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;

  @media (max-width: 768px) {
    display: none;
  }
`

const BrandName = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -1px;
  margin-bottom: 16px;
`

const BrandTagline = styled.p`
  font-size: 1.1rem;
  color: ${Color.text.secondary};
  line-height: 1.6;
  max-width: 320px;
`

const BrandDivider = styled.div`
  width: 40px;
  height: 3px;
  background: #111;
  margin: 20px auto;
`

// ==================== Switch 切换开关 ====================

const ToggleWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
`

const ToggleBar = styled.div`
  position: relative;
  display: flex;
  background: ${Color.border.light};
  border-radius: 50px;
  padding: 4px;
  width: 200px;
  height: 40px;
`

const ToggleItem = styled.button<{ $active: boolean }>`
  flex: 1;
  border: none;
  border-radius: 50px;
  background: ${(props) => (props.$active ? '#111' : 'transparent')};
  color: ${(props) => (props.$active ? Color.text.inverse : Color.text.muted)};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${Transition.slow};
  padding: 0;
  z-index: 1;

  &:hover {
    color: ${(props) => (props.$active ? Color.text.inverse : Color.text.secondary)};
  }
`

const FormTitle = styled.h2`
  font-size: 1.3rem;
  font-weight: bold;
  color: #111;
  text-align: center;
  margin-bottom: 4px;
`

const FormDesc = styled.p`
  font-size: 0.9rem;
  color: ${Color.text.secondary};
  text-align: center;
  margin-bottom: 24px;
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
    <PageLayout>
      <AuthContainer>
        <AuthCard>
          {/* 左侧：表单面板 */}
          <LeftPanel>
            <ToggleWrapper>
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
            </ToggleWrapper>

            {activeTab === 'login' ? (
              <>
                <FormTitle>{t('store.auth.signIn')}</FormTitle>
                <FormDesc>{t('store.auth.welcomeBack')}</FormDesc>
                <LoginForm />
              </>
            ) : (
              <>
                <FormTitle>{t('store.auth.createAccount')}</FormTitle>
                <FormDesc>{t('store.auth.joinZiggner')}</FormDesc>
                <RegisterForm />
              </>
            )}
          </LeftPanel>

          {/* 右侧：品牌面板 */}
          <RightPanel>
            <BrandName>Ziggner</BrandName>
            <BrandDivider />
            <BrandTagline>
              {t('store.auth.brandDesc')}
            </BrandTagline>
          </RightPanel>
        </AuthCard>
      </AuthContainer>
    </PageLayout>
  )
}
