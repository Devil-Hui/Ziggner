import { useState } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize } from '../../../theme/tokens'
import ProductCard from './ProductCard'
import type { ProductCardData } from './ProductCard'
import { resolveMediaUrl } from '../../../api/chat'

// ── Types ──

export type MessageType = 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share'

export interface ProductSnapshot {
  id: number
  name: string
  main_image: string
  price: string
  link?: string
}

export interface CartItem {
  spec: string
  quantity: number
  unit_price: string
}

export interface ChatBubbleProps {
  type: MessageType
  content: string
  isMine: boolean
  timestamp: string
  fileUrl?: string
  productSnapshot?: ProductSnapshot | null
  productCardData?: ProductCardData | null
  cartItems?: CartItem[]
  onProductClick?: (productId: number) => void
  /** 发送状态回执（推特式）：发送中 / 已送达 / 已读，仅自己发的消息显示 */
  receipt?: 'sending' | 'sent' | 'read'
}

// ── Format time: 今天 HH:mm / 昨天 HH:mm / MM-DD ──

function formatTime(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (msgDay.getTime() === today.getTime()) return `今天 ${time}`
  if (msgDay.getTime() === yesterday.getTime()) return `昨天 ${time}`
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

// ── Media Preview Modal ──

const PreviewOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const PreviewContent = styled.div`
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
`

const PreviewMedia = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: ${Radius.md}px;
`

// ── Styled Components ──

const Wrapper = styled.div<{ $isMine: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$isMine ? 'flex-end' : 'flex-start'};
  margin-bottom: ${Spacing.md}px;
  padding: 0 ${Spacing.lg}px;
`

const Bubble = styled.div<{ $isMine: boolean }>`
  max-width: 72%;
  padding: 10px 16px;
  border-radius: ${props => props.$isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  /* 微信风格：自己发的绿色白字，对方白底深字 + 浅边框阴影，背景色强区分 */
  background: ${props => props.$isMine ? '#07c160' : '#ffffff'};
  color: ${props => props.$isMine ? '#ffffff' : '#1f1f1f'};
  border: ${props => props.$isMine ? 'none' : '1px solid #e6e6e6'};
  box-shadow: ${props => props.$isMine ? '0 1px 2px rgba(7,193,96,0.25)' : '0 1px 2px rgba(0,0,0,0.05)'};
  font-size: ${FontSize.base}px;
  line-height: 1.5;
  word-break: break-word;
  position: relative;
`

const SystemBubble = styled.div`
  align-self: center;
  max-width: 80%;
  padding: 6px 16px;
  background: #f0f0f0;
  color: #999;
  border-radius: 12px;
  font-size: ${FontSize.xs}px;
  text-align: center;
  margin: ${Spacing.sm}px auto;
`

const TimeRow = styled.div<{ $isMine: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  text-align: ${props => props.$isMine ? 'right' : 'left'};
`

const TimeText = styled.span`
  font-size: 11px;
  color: #bbb;
`

const ReadStatus = styled.span`
  color: #1a56db;
  font-size: 12px;
  letter-spacing: -1px;
`

const ReceiptText = styled.span<{ $state: 'sending' | 'sent' | 'read' }>`
  font-size: 11px;
  color: ${props => (props.$state === 'read' ? '#1a56db' : '#bbb')};
  margin-left: 2px;
`

// ── Media ──

const MediaImage = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  object-fit: cover;
  margin-top: 4px;
`

const MediaVideo = styled.video`
  max-width: 240px;
  max-height: 200px;
  border-radius: ${Radius.sm}px;
  margin-top: 4px;
`

// ── Product Link Card ──

const ProductCardWrap = styled.div<{ $isMine: boolean }>`
  display: flex;
  gap: 10px;
  padding: 8px;
  background: ${props => props.$isMine ? 'rgba(255,255,255,0.15)' : '#fff'};
  border: 1px solid ${props => props.$isMine ? 'rgba(255,255,255,0.3)' : Color.border.light};
  border-radius: ${Radius.sm}px;
  margin-top: 8px;
  cursor: pointer;
  max-width: 260px;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${props => props.$isMine ? 'rgba(255,255,255,0.6)' : '#e74c3c'};
  }
`

const ProductCardImg = styled.img`
  width: 56px;
  height: 56px;
  border-radius: ${Radius.xs}px;
  object-fit: cover;
  flex-shrink: 0;
`

const ProductCardInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
`

const ProductCardName = styled.div<{ $isMine: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.$isMine ? 'rgba(255,255,255,0.9)' : '#333'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ProductCardPrice = styled.div<{ $isMine: boolean }>`
  font-size: 14px;
  color: ${props => props.$isMine ? '#ffd700' : '#e74c3c'};
  font-weight: 600;
`

const ProductCardLink = styled.div<{ $isMine: boolean }>`
  font-size: 11px;
  color: ${props => props.$isMine ? 'rgba(255,255,255,0.5)' : '#999'};
`

// ── Cart Share ──

const CartShareWrap = styled.div<{ $isMine: boolean }>`
  margin-top: 8px;
  background: ${props => props.$isMine ? 'rgba(255,255,255,0.15)' : '#fff'};
  border: 1px solid ${props => props.$isMine ? 'rgba(255,255,255,0.3)' : Color.border.light};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
  max-width: 280px;
`

const CartShareHeader = styled.div<{ $isMine: boolean }>`
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$isMine ? 'rgba(255,255,255,0.9)' : '#333'};
  border-bottom: 1px solid ${props => props.$isMine ? 'rgba(255,255,255,0.15)' : Color.border.light};
`

const CartShareItem = styled.div<{ $isMine: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  border-bottom: 1px solid ${props => props.$isMine ? 'rgba(255,255,255,0.08)' : Color.border.light};

  &:last-child {
    border-bottom: none;
  }
`

const CartItemSpec = styled.span<{ $isMine: boolean }>`
  color: ${props => props.$isMine ? 'rgba(255,255,255,0.8)' : '#666'};
`

const CartItemQty = styled.span<{ $isMine: boolean }>`
  color: ${props => props.$isMine ? 'rgba(255,255,255,0.5)' : '#999'};
  margin-left: 6px;
`

const CartItemPrice = styled.span<{ $isMine: boolean }>`
  color: ${props => props.$isMine ? '#ffd700' : '#e74c3c'};
  font-weight: 500;
`

// ── Typing Indicator ──

const TypingBubble = styled.div`
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  margin-bottom: ${Spacing.md}px;
  margin-left: ${Spacing.lg}px;
  background: #f0f0f0;
  border-radius: 16px 16px 16px 4px;
  font-size: ${FontSize.xs}px;
  color: #999;
`

const TypingDots = styled.span`
  display: inline-flex;
  gap: 3px;
  align-items: center;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #bbb;
    animation: typingBounce 1.4s infinite ease-in-out both;
  }
  span:nth-child(1) { animation-delay: 0s; }
  span:nth-child(2) { animation-delay: 0.2s; }
  span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes typingBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
`

// ── Component ──

export default function ChatBubble({
  type,
  content,
  isMine,
  timestamp,
  fileUrl,
  productSnapshot,
  productCardData,
  cartItems,
  onProductClick,
  receipt,
}: ChatBubbleProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)

  const renderContent = () => {
    // Normalize content to a render-safe string so an object payload (e.g. a malformed
    // WebSocket message) can never crash React with "Objects are not valid as a React child" (#310).
    const safeContent: string = typeof content === 'string'
      ? content
      : content == null
        ? ''
        : typeof content === 'object'
          ? JSON.stringify(content)
          : String(content)
    switch (type) {
      case 'image':
        return fileUrl ? (
          <MediaImage
            src={fileUrl}
            alt={content || '图片'}
            onClick={(e) => { e.stopPropagation(); setPreviewSrc(fileUrl) }}
            loading="lazy"
          />
        ) : (
          <span>📷 {safeContent}</span>
        )

      case 'video':
        return fileUrl ? (
          <MediaVideo src={fileUrl} controls preload="metadata" />
        ) : (
          <span>🎬 {safeContent}</span>
        )

      case 'product_link':
        return (
          <div>
            {safeContent && <div>{safeContent}</div>}
            {productSnapshot && (
              <ProductCardWrap
                $isMine={isMine}
                onClick={() => {
                  if (productSnapshot.link) {
                    window.open(productSnapshot.link, '_blank')
                  } else if (onProductClick) {
                    onProductClick(productSnapshot.id)
                  }
                }}
              >
                <ProductCardImg
                  src={resolveMediaUrl(productSnapshot.main_image) || productSnapshot.main_image}
                  alt={productSnapshot.name}
                />
                <ProductCardInfo>
                  <ProductCardName $isMine={isMine}>{productSnapshot.name}</ProductCardName>
                  <ProductCardPrice $isMine={isMine}>¥{productSnapshot.price}</ProductCardPrice>
                  <ProductCardLink $isMine={isMine}>
                    {isMine ? '点击查看详情' : '点击查看商品'}
                  </ProductCardLink>
                </ProductCardInfo>
              </ProductCardWrap>
            )}
          </div>
        )

      case 'product_card':
        return (
          <div>
            {safeContent && <div style={{ marginBottom: 4 }}>{safeContent}</div>}
            {productCardData && <ProductCard product={productCardData} />}
            {/* Fallback: use productSnapshot if productCardData is not available */}
            {!productCardData && productSnapshot && (
              <ProductCard product={{
                id: productSnapshot.id,
                name: productSnapshot.name,
                main_image: resolveMediaUrl(productSnapshot.main_image) || productSnapshot.main_image,
                price: productSnapshot.price,
              }} />
            )}
          </div>
        )

      case 'cart_share':
        return (
          <div>
            {safeContent && <div style={{ marginBottom: 4 }}>{safeContent}</div>}
            {cartItems && cartItems.length > 0 && (
              <CartShareWrap $isMine={isMine}>
                <CartShareHeader $isMine={isMine}>🛒 购物车分享</CartShareHeader>
                {cartItems.map((item, idx) => (
                  <CartShareItem key={idx} $isMine={isMine}>
                    <span>
                      <CartItemSpec $isMine={isMine}>{item.spec}</CartItemSpec>
                      <CartItemQty $isMine={isMine}>x{item.quantity}</CartItemQty>
                    </span>
                    <CartItemPrice $isMine={isMine}>¥{item.unit_price}</CartItemPrice>
                  </CartShareItem>
                ))}
              </CartShareWrap>
            )}
          </div>
        )

      case 'text':
      default:
        return <span>{safeContent}</span>
    }
  }

  return (
    <>
      {/* Media preview modal */}
      {previewSrc && (
        <PreviewOverlay onClick={() => setPreviewSrc(null)}>
          <PreviewContent onClick={(e) => e.stopPropagation()}>
            <PreviewMedia src={previewSrc} alt="预览" />
          </PreviewContent>
        </PreviewOverlay>
      )}

      <Wrapper $isMine={isMine}>
        <Bubble $isMine={isMine}>
          {renderContent()}
        </Bubble>
        <TimeRow $isMine={isMine}>
          {isMine && receipt === 'sending' && <ReceiptText $state="sending">发送中…</ReceiptText>}
          {isMine && receipt === 'sent' && <ReceiptText $state="sent">已送达</ReceiptText>}
          {isMine && receipt === 'read' && <ReceiptText $state="read">已读</ReceiptText>}
          <TimeText>{formatTime(timestamp)}</TimeText>
        </TimeRow>
      </Wrapper>
    </>
  )
}

/** System message bubble */
export function SystemBubbleMessage({ content }: { content: string }) {
  return <SystemBubble>{content}</SystemBubble>
}

/** Typing indicator — shown when other party is typing */
export function TypingIndicator({ name }: { name?: string }) {
  return (
    <TypingBubble>
      <TypingDots>
        <span />
        <span />
        <span />
      </TypingDots>
      {name ? `${name}正在输入...` : '正在输入...'}
    </TypingBubble>
  )
}
