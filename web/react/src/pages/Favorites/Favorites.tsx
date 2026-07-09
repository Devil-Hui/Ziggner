import { useState, useEffect } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, FontSize, Layout } from '../../theme/tokens'
import { publicAPI } from '../../api/public'

const Container = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  background-color: ${Color.bg.page};
  padding: 5vh 5vw;
`

const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2vw;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const ModuleTitle = styled.div`
  font-size: ${FontSize.xl}px;
  font-weight: 700;
  color: ${Color.text.primary};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
`

const Card = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${Shadow.hover || '0 4px 16px rgba(0,0,0,0.12)'};
  }
`

const CardImage = styled.div<{ $src?: string }>`
  width: 100%;
  height: 200px;
  background: ${p => p.$src ? `url(${p.$src}) center/cover no-repeat` : '#f0f0f0'};
  background-color: #f0f0f0;
`

const CardBody = styled.div`
  padding: 12px 16px 16px;
`

const CardName = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.primary};
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardPrice = styled.div`
  font-size: ${FontSize.md}px;
  font-weight: 700;
  color: #e74c3c;
`

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: ${Color.text.muted};
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  float: right;
  &:hover { color: #e74c3c; }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${Color.text.muted};
  font-size: ${FontSize.md}px;
`

interface FavoriteItem {
  id: number
  user: number
  spu: number
  spu_name?: string
  spu_image?: string
  spu_price?: string
  spu_id?: number
  created_at: string
}

export default function Favorites() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    publicAPI.getFavorites({ page: 1, per_page: 50 })
      .then(res => {
        const items = (res as any).items || (res as any).results || []
        setFavorites(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (e: React.MouseEvent, spuId: number) => {
    e.stopPropagation()
    try {
      await publicAPI.removeFavorite(spuId)
      setFavorites(prev => prev.filter(f => (f.spu_id || f.spu) !== spuId))
    } catch { /* fail silently */ }
  }

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <ModuleTitle>My Favorites</ModuleTitle>

          {!loading && favorites.length === 0 && (
            <EmptyState>No favorites yet — browse products to add some!</EmptyState>
          )}

          <Grid>
            {favorites.map(f => {
              const spuId = f.spu_id || f.spu
              return (
                <Card key={f.id} onClick={() => navigate(`/product/${spuId}`)}>
                  <CardImage $src={f.spu_image} />
                  <CardBody>
                    <RemoveBtn onClick={e => handleRemove(e, spuId)}>×</RemoveBtn>
                    <CardName>{f.spu_name || `Product #${spuId}`}</CardName>
                    <CardPrice>{f.spu_price ? `$${f.spu_price}` : ''}</CardPrice>
                  </CardBody>
                </Card>
              )
            })}
          </Grid>
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
