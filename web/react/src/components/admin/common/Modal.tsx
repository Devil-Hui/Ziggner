/**
 * Modal（标准模态弹窗）
 * ─────────────────────
 * - 表单类 max 720px；列表/详情类 max 960px；高度 ≤85vh；position:fixed 居中于视口。
 * - 遮罩 rgba(0,0,0,0.35) + backdrop-filter:blur(2px)（不支持时纯色）；zIndex.modal(1100)。
 * - 顶部固定标题栏（含关闭 X）、中间内容 overflow-y:auto、底部固定操作栏。
 * - maskClosable 默认 true；表单类建议传 false（防误触丢内容）。
 */
import { useEffect, type ReactNode, type CSSProperties } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, FontWeight, Transition } from '../../../theme/tokens'
import { ZIndex } from '../../../theme/zIndex'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${ZIndex.modal};
`

const Dialog = styled.div<{ $width: string }>`
  width: 100%;
  max-width: ${({ $width }) => $width};
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.modal};
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: ${Spacing.lg}px ${Spacing.xl}px;
  border-bottom: 1px solid ${Color.border.light};
`

const Title = styled.h2`
  margin: 0;
  font-size: ${FontSize.lg}px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.text.heading};
`

const CloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 18px;
  line-height: 1;
  color: ${Color.text.muted};
  cursor: pointer;
  border-radius: ${Radius.xs}px;
  transition: all ${Transition.fast};

  &:hover { background: ${Color.primaryLight}; color: ${Color.primaryHover}; }
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${Spacing.xl}px;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${Spacing.sm}px;
  flex-shrink: 0;
  padding: ${Spacing.lg}px ${Spacing.xl}px;
  border-top: 1px solid ${Color.border.light};
`

const Btn = styled.button<{ $kind?: 'primary' | 'default' | 'danger' }>`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.medium};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: all ${Transition.fast};

  ${({ $kind }) =>
    $kind === 'primary'
      ? `background: ${Color.primary}; color: #fff; border: 1px solid ${Color.primary};
         &:hover { background: ${Color.primaryHover}; }`
      : $kind === 'danger'
      ? `background: ${Color.status.error}; color: #fff; border: 1px solid ${Color.status.error};
         &:hover { background: #c0392b; }`
      : `background: ${Color.bg.card}; color: ${Color.text.secondary}; border: 1px solid ${Color.border.medium};
         &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }`}

  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

export interface ModalProps {
  open: boolean
  title: ReactNode
  /** 最大宽度：默认 '720px'（表单）；列表/详情传 '960px' */
  width?: string
  /** 底部操作栏（默认：取消/确认） */
  footer?: ReactNode
  okText?: string
  cancelText?: string
  /** 确认按钮 loading 文案（默认「处理中…」） */
  okLoadingText?: string
  onOk?: () => void
  onClose: () => void
  confirmLoading?: boolean
  okDanger?: boolean
  /** 点击遮罩是否关闭（默认 true；表单类建议 false） */
  maskClosable?: boolean
  destroyOnClose?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export default function Modal({
  open,
  title,
  width = '720px',
  footer,
  okText = '确认',
  cancelText = '取消',
  okLoadingText = '处理中…',
  onOk,
  onClose,
  confirmLoading = false,
  okDanger = false,
  maskClosable = true,
  destroyOnClose = false,
  className,
  style,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  if (destroyOnClose) {
    // destroyOnClose 语义：关闭后不保留内部状态；此处直接渲染（状态由调用方控制）
  }

  return (
    <Overlay onClick={maskClosable ? onClose : undefined}>
      <Dialog $width={width} onClick={e => e.stopPropagation()} className={className} style={style} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose} aria-label="关闭">&times;</CloseBtn>
        </Header>
        <Body>{children}</Body>
        <Footer>
          {footer ?? (
            <>
              <Btn onClick={onClose} disabled={confirmLoading}>{cancelText}</Btn>
              <Btn $kind={okDanger ? 'danger' : 'primary'} onClick={onOk} disabled={confirmLoading}>
                {confirmLoading ? okLoadingText : okText}
              </Btn>
            </>
          )}
        </Footer>
      </Dialog>
    </Overlay>
  )
}
