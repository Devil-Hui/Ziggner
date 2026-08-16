import styled from 'styled-components'
import { Color, FontSize, Radius, Shadow } from '../../theme/tokens'
import { useTranslation } from '../../i18n'

const Container = styled.div`
  max-width: 1040px;
  margin: 0 auto;
  padding: 48px 24px 64px;
`

const Hero = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 40px;
  align-items: center;
  background: linear-gradient(135deg, ${Color.primaryLight}, #fff);
  border-radius: ${Radius.lg}px;
  padding: 40px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 800;
  color: ${Color.text.heading};
  margin-bottom: 12px;
`

const Subtitle = styled.p`
  color: ${Color.text.body};
  font-size: ${FontSize.md}px;
  margin-bottom: 28px;
  line-height: 1.6;
`

const Buttons = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`

const StoreBtn = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: ${Color.text.heading};
  color: #fff;
  padding: 14px 22px;
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.md}px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  &:hover { opacity: 0.9; }
`

const QRBox = styled.div`
  background: #fff;
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.card};
  padding: 24px;
  text-align: center;
`

const QR = styled.div`
  width: 180px;
  height: 180px;
  margin: 0 auto 12px;
  border-radius: ${Radius.md}px;
  background:
    repeating-linear-gradient(0deg, ${Color.text.heading} 0 8px, transparent 8px 16px),
    repeating-linear-gradient(90deg, ${Color.text.heading} 0 8px, transparent 8px 16px);
  background-blend-mode: multiply;
  opacity: 0.85;
`

const QRHint = styled.div`
  color: ${Color.text.secondary};
  font-size: ${FontSize.sm}px;
`

const Features = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 40px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`

const Feature = styled.div`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  padding: 24px;
  box-shadow: ${Shadow.card};
`

const FeatureTitle = styled.h3`
  color: ${Color.text.heading};
  font-size: ${FontSize.lg}px;
  margin-bottom: 8px;
`

const FeatureDesc = styled.p`
  color: ${Color.text.body};
  font-size: ${FontSize.base}px;
  line-height: 1.6;
`

const APP_STORE_URL = 'https://apps.apple.com/app/ziggner'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ziggner'

export default function DownloadApp() {
  const { t } = useTranslation()
  return (
    <Container>
      <Hero>
        <div>
          <Title>{t('store.pages.download.title')}</Title>
          <Subtitle>{t('store.pages.download.subtitle')}</Subtitle>
          <Buttons>
            <StoreBtn href={APP_STORE_URL} target="_blank" rel="noopener">
              <span aria-hidden>⌘</span> {t('store.pages.download.iosButton')}
            </StoreBtn>
            <StoreBtn href={PLAY_STORE_URL} target="_blank" rel="noopener">
              <span aria-hidden>▶</span> {t('store.pages.download.androidButton')}
            </StoreBtn>
          </Buttons>
        </div>
        <QRBox>
          <QR />
          <QRHint>{t('store.pages.download.scanHint')}</QRHint>
        </QRBox>
      </Hero>

      <h2 style={{ margin: '40px 0 0', color: Color.text.heading }}>{t('store.pages.download.featuresTitle')}</h2>
      <Features>
        <Feature>
          <FeatureTitle>{t('store.pages.download.feature1Title')}</FeatureTitle>
          <FeatureDesc>{t('store.pages.download.feature1Desc')}</FeatureDesc>
        </Feature>
        <Feature>
          <FeatureTitle>{t('store.pages.download.feature2Title')}</FeatureTitle>
          <FeatureDesc>{t('store.pages.download.feature2Desc')}</FeatureDesc>
        </Feature>
        <Feature>
          <FeatureTitle>{t('store.pages.download.feature3Title')}</FeatureTitle>
          <FeatureDesc>{t('store.pages.download.feature3Desc')}</FeatureDesc>
        </Feature>
      </Features>
    </Container>
  )
}
