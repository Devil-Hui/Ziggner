import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Color, Radius, Spacing, FontSize } from '../../../theme/tokens'

// ── Types ──

export type OrderStatus =
  | 'not_ordered'   // 未下单
  | 'pending_pay'   // 待付款
  | 'paid'          // 已付款
  | 'shipped'       // 已发货
  | 'received'      // 已签收
  | 'refunding'     // 退款中

export interface ProductCardData {
  id: number
  name: string
  main_image: string
  price: string
  order_status?: string
  order_id?: number
}

export interface ProductCardProps {
  product: ProductCardData
  loading?: boolean
  imageError?: boolean
}

// ── Status config ──

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  not_ordered:       { label: '未下单', bg: '#f3f4f6', color: '#999' },
  pending_pay:       { label: '待付款', bg: '#fff7ed', color: '#f59e0b' },
  pending_payment:   { label: '待付款', bg: '#fff7ed', color: '#f59e0b' },
  paid:              { label: '已付款', bg: '#eff6ff', color: '#2563eb' },
  shipped:           { label: '已发货', bg: '#ecfdf5', color: '#059669' },
  delivered:         { label: '已签收', bg: '#ecfeff', color: '#0891b2' },
  received:          { label: '已签收', bg: '#ecfeff', color: '#0891b2' },
  completed:         { label: '已完成', bg: '#ecfdf5', color: '#047857' },
  cancelled:         { label: '已取消', bg: '#f3f4f6', color: '#9ca3af' },
  refunding:         { label: '退款中', bg: '#fef2f2', color: '#e74c3c' },
}

const DEFAULT_STATUS = { label: '订单', bg: '#f3f4f6', color: '#666' }

// ── Animations ──

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

// ── Styled Components ──

const Card = styled.div`
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  overflow: hidden;
  max-width: 300px;
  min-width: 260px;
  margin-top: 8px;
`

const Body = styled.div`
  display: flex;
  padding: 10px;
  gap: 10px;
`

const Thumb = styled.div`
  width: 80px;
  height: 80px;
  border-radius: ${Radius.sm}px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const BrokenImgPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #ccc;
  font-size: 11px;
  gap: 4px;

  svg { width: 28px; height: 28px; opacity: 0.4; }
`

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Name = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PriceSymbol = styled.span`
  font-size: 12px;
  color: #e74c3c;
  font-weight: 600;
`

const PriceValue = styled.span`
  font-size: 16px;
  color: #e74c3c;
  font-weight: 700;
  line-height: 1;
`

const StatusTag = styled.span<{ $bg: string; $color: string }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  background: ${p => p.$bg};
  color: ${p => p.$color};
  white-space: nowrap;
`

const Actions = styled.div`
  display: flex;
  border-top: 1px solid ${Color.border.light};
`

const ActionBtn = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 9px 0;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: ${p => p.$primary ? '#e74c3c' : '#666'};
  transition: background 0.15s;
  position: relative;

  &:hover {
    background: ${p => p.$primary ? '#fef2f2' : '#f5f5f5'};
  }

  &:first-child::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 16px;
    background: ${Color.border.light};
  }
`

// ── Skeleton ──

const SkeletonBlock = styled.div`
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
`

const SkeletonThumb = styled(SkeletonBlock)`
  width: 80px;
  height: 80px;
`

const SkeletonLine = styled(SkeletonBlock)<{ $w: string }>`
  width: ${p => p.$w};
  height: 14px;
`

const SkeletonCard = () => (
  <Card>
    <Body>
      <SkeletonThumb />
      <Info>
        <SkeletonLine $w="80%" />
        <SkeletonLine $w="40%" />
        <SkeletonLine $w="30%" />
      </Info>
    </Body>
    <Actions>
      <ActionBtn disabled style={{ color: '#ccc' }}>查看商品</ActionBtn>
      <ActionBtn disabled style={{ color: '#ccc' }}>查看订单</ActionBtn>
    </Actions>
  </Card>
)

// ── Broken Image Icon ──

const BrokenImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
    <line x1="3" y1="3" x2="21" y2="21" stroke="#e74c3c" strokeWidth="1.5" />
  </svg>
)

// ── Component ──

export default function ProductCard({ product, loading = false, imageError = false }: ProductCardProps) {
  const navigate = useNavigate()
  const statusCfg = product.order_status ? (STATUS_CONFIG[product.order_status] ?? DEFAULT_STATUS) : null
  const [imgErr, setImgErr] = useState(false)

  if (loading) return <SkeletonCard />

  const displayImgErr = imageError || imgErr

  return (
    <Card>
      <Body>
        <Thumb>
          {displayImgErr ? (
            <BrokenImgPlaceholder>
              <BrokenImageIcon />
              图片加载失败
            </BrokenImgPlaceholder>
          ) : (
            <ThumbImg
              src={product.main_image}
              alt={product.name}
              loading="lazy"
              onError={() => setImgErr(true)}
            />
          )}
        </Thumb>
        <Info>
          <Name>{product.name}</Name>
          <PriceRow>
            <PriceSymbol>¥</PriceSymbol>
            <PriceValue>{product.price}</PriceValue>
            {statusCfg && (
              <StatusTag $bg={statusCfg.bg} $color={statusCfg.color}>
                {statusCfg.label}
              </StatusTag>
            )}
          </PriceRow>
        </Info>
      </Body>
      <Actions>
        <ActionBtn $primary onClick={() => navigate(`/product/${product.id}`)}>
          查看商品
        </ActionBtn>
        <ActionBtn onClick={() => {
          if (product.order_id) {
            navigate(`/profile/orders/${product.order_id}`)
          }
        }}>
          查看订单
        </ActionBtn>
      </Actions>
    </Card>
  )
}
