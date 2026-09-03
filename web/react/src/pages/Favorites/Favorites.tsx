import { useState, useEffect } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import EmptyState from '../../components/common/EmptyState'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { useCurrency } from '../../store/CurrencyContext'
import { Color, Radius, Shadow, FontSize, Spacing, Breakpoint } from '../../theme/tokens'
import { publicAPI } from '../../api/public'
import type { FavoriteItem } from '../../api/public'

const Container = styled.div`
  min-height: calc(100vh - 320px);
  background-color: ${Color.bg.page};
  padding: ${Spacing.xxl}px 5vw 80px;
`

const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${Spacing.xl}px;
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ModuleTitle = styled.h1`
  margin: 0;
  font-size: ${FontSize.xxl}px;
  font-weight: 700;
  color: ${Color.text.heading};
`

const ModuleSub = styled.p`
  margin: 0;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${Spacing.lg}px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${Spacing.md}px;
  }
`

const Card = styled.div`
  position: relative;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${Shadow.dropdown || '0 4px 16px rgba(0,0,0,0.12)'};
  }

  &:hover .fav-remove {
    opacity: 1;
  }
`

const CardImage = styled.div<{ $src?: string }>`
  width: 100%;
  aspect-ratio: 1 / 1;
  background: ${p => p.$src ? `url(${p.$src}) center/cover no-repeat` : Color.primaryLight};
  background-color: ${Color.primaryLight};
`

const CardBody = styled.div`
  padding: ${Spacing.md}px;
`

const CardName = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.heading};
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
`

const CardPrice = styled.div`
  font-size: ${FontSize.md}px;
  font-weight: 700;
  color: ${Color.brand};
`

const CardDate = styled.div`
  margin-top: 6px;
  font-size: 11px;
  color: ${Color.text.muted};
`

const RemoveBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: ${Radius.full}px;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: ${Color.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s, background 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);

  &:hover {
    color: ${Color.status.error};
    background: #fff;
  }

  @media (max-width: ${Breakpoint.mobile}px) {
    opacity: 1;
  }
`

const SkeletonCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  overflow: hidden;
  box-shadow: ${Shadow.card};
`

const SkeletonImg = styled.div`
  width: 100%;
  aspect-ratio: 1 / 1;
  background: ${Color.bg.sunken};
  animation: pulse 1.4s ease-in-out infinite;
`

const SkeletonLine = styled.div<{ $w?: string }>`
  height: 12px;
  margin: ${Spacing.md}px ${Spacing.md}px 0;
  width: ${p => p.$w || '100%'};
  background: ${Color.bg.sunken};
  border-radius: 6px;
  animation: pulse 1.4s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const ActionRow = styled.div`
  display: flex;
  justify-content: center;
`

const BrowseBtn = styled.button`
  padding: 10px 28px;
  border: none;
  border-radius: ${Radius.sm}px;
  background: ${Color.brand};
  color: ${Color.text.inverse};
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
`

const HeartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21s-7.5-4.7-9.6-9.2C.7 8.2 2.6 4.5 6.1 4.5c2 0 3.4 1.1 4.3 2.3l1.6 2.1 1.6-2.1c.9-1.2 2.3-2.3 4.3-2.3 3.5 0 5.4 3.7 3.7 7.3C19.5 16.3 12 21 12 21z" />
  </svg>
)

export default function Favorites() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { format } = useCurrency()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    publicAPI.getFavorites({ page: 1, per_page: 50 })
      .then(res => {
        if (cancelled) return
        const items = res.items || res.results || []
        setFavorites(items)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleRemove = async (e: React.MouseEvent, spuId: number) => {
    e.stopPropagation()
    // 乐观更新：先移出列表，失败再回滚
    const snapshot = favorites
    setFavorites(prev => prev.filter(f => f.spu_id !== spuId))
    try {
      await publicAPI.removeFavorite(spuId)
    } catch {
      setFavorites(snapshot)
      alert(t('store.favorites.removeFailed'))
    }
  }

  const formatDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString()
    } catch {
      return ''
    }
  }

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <Header>
            <ModuleTitle>{t('store.favorites.title')}</ModuleTitle>
            <ModuleSub>{t('store.favorites.subtitle')}</ModuleSub>
          </Header>

          {loading ? (
            <Grid>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i}>
                  <SkeletonImg />
                  <SkeletonLine $w="80%" />
                  <SkeletonLine $w="40%" />
                </SkeletonCard>
              ))}
            </Grid>
          ) : favorites.length === 0 ? (
            <>
              <EmptyState
                icon={<HeartIcon />}
                title={t('store.favorites.emptyTitle')}
                message={t('store.favorites.emptyDesc')}
              />
              <ActionRow>
                <BrowseBtn onClick={() => navigate('/')}>
                  {t('store.favorites.browseProducts')}
                </BrowseBtn>
              </ActionRow>
            </>
          ) : (
            <Grid>
              {favorites.map(f => (
                <Card key={f.id} onClick={() => navigate(`/product/${f.spu_id}`)}>
                  <CardImage $src={f.spu_image} />
                  <RemoveBtn
                    className="fav-remove"
                    title={t('store.favorites.remove')}
                    aria-label={t('store.favorites.remove')}
                    onClick={e => handleRemove(e, f.spu_id)}
                  >
                    ×
                  </RemoveBtn>
                  <CardBody>
                    <CardName>{f.spu_name || `Product #${f.spu_id}`}</CardName>
                    <CardPrice>{f.spu_price ? format(Number(f.spu_price)) : ''}</CardPrice>
                    {f.created_at && (
                      <CardDate>
                        {t('store.favorites.addedOn')} {formatDate(f.created_at)}
                      </CardDate>
                    )}
                  </CardBody>
                </Card>
              ))}
            </Grid>
          )}
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
