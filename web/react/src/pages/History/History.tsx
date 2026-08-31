import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { useCurrency } from '../../store/CurrencyContext'
import { Color, Radius, Shadow, FontSize, Layout } from '../../theme/tokens'
import { publicAPI, type BrowseHistoryItem } from '../../api/public'

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
  gap: 25px;
`

const ModuleCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: 25px;
`

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`

const ModuleTitle = styled.div`
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
`

const ClearButton = styled.button`
  background: none;
  border: 1px solid ${Color.border.medium};
  padding: 8px 15px;
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  
  &:hover {
    background: ${Color.primaryLight};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const HistoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  
  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`

const HistoryCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  }
`

const ProductImg = styled.div`
  height: 200px;
  background: ${Color.primaryLight};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`

const ProductImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ProductPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: ${Color.text.muted};
`

const Badge = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: ${Color.brand};
  color: ${Color.text.inverse};
  padding: 3px 8px;
  border-radius: ${Radius.sm}px;
  font-size: 11px;
`

const ProductInfo = styled.div`
  padding: 15px;
`

const ProductName = styled.div`
  font-size: ${FontSize.base}px;
  color: ${Color.primaryHover};
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ProductPrice = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: ${Color.brand};
`

const ViewDate = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin-top: 8px;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px;
  color: ${Color.text.muted};
`

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 15px;
  color: ${Color.text.muted};
`

const EmptyTitle = styled.div`
  font-size: 18px;
  margin-bottom: 8px;
  color: ${Color.primaryHover};
`

const EmptyDesc = styled.div`
  font-size: ${FontSize.base}px;
`

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${Color.text.muted};
`

const ErrorState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${Color.status.error};
`

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function History() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { format } = useCurrency()
  const [historyItems, setHistoryItems] = useState<BrowseHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await publicAPI.getBrowseHistory({ page: 1, page_size: 50 })
      setHistoryItems(response.items || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleProductClick = (spuId: number) => {
    navigate(`/product/${spuId}`)
  }

  const handleClearHistory = async () => {
    if (!confirm(t('store.history.confirmClear'))) return
    setClearing(true)
    try {
      await publicAPI.clearBrowseHistory()
      setHistoryItems([])
    } catch (err: any) {
      setError(err?.message || 'Failed to clear history')
    } finally {
      setClearing(false)
    }
  }

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <ModuleCard>
            <ModuleHeader>
              <ModuleTitle>{t('store.history.title')}</ModuleTitle>
              {historyItems.length > 0 && (
                <ClearButton onClick={handleClearHistory} disabled={clearing}>
                  {clearing ? t('common.saving') : t('store.history.clearAll')}
                </ClearButton>
              )}
            </ModuleHeader>
            
            {loading ? (
              <LoadingState>{t('common.loading')}</LoadingState>
            ) : error ? (
              <ErrorState>{error}</ErrorState>
            ) : historyItems.length > 0 ? (
              <HistoryGrid>
                {historyItems.map((item) => (
                  <HistoryCard key={item.id} onClick={() => handleProductClick(item.spu_id)}>
                    <ProductImg>
                      {item.spu_image ? (
                        <ProductImage src={item.spu_image} alt={item.spu_name} />
                      ) : (
                        <ProductPlaceholder>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21,15 16,10 5,21"/>
                          </svg>
                        </ProductPlaceholder>
                      )}
                      {item.category_path && <Badge>{item.category_path.split(' / ').pop()}</Badge>}
                    </ProductImg>
                    <ProductInfo>
                      <ProductName>{item.spu_name}</ProductName>
                      <ProductPrice>
                        {item.spu_price ? format(Number(item.spu_price)) : '—'}
                      </ProductPrice>
                      <ViewDate>{t('store.history.viewed')} {formatDate(item.viewed_at)}</ViewDate>
                    </ProductInfo>
                  </HistoryCard>
                ))}
              </HistoryGrid>
            ) : (
              <EmptyState>
                <EmptyIcon>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </EmptyIcon>
                <EmptyTitle>{t('store.history.empty')}</EmptyTitle>
                <EmptyDesc>{t('store.history.emptyDesc')}</EmptyDesc>
              </EmptyState>
            )}
          </ModuleCard>
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
