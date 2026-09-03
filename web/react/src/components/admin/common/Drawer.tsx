/**
 * Drawer（右侧滑入辅助面板 / Contextual Drawer）
 * ─────────────────────────────────────────────
 * - 默认宽度 440px（400–480 区间）；角色抽屉等窄场景传 width="360px"。
 * - 从右滑入（0.28s cubic-bezier），带遮罩与细腻阴影；zIndex.drawer(700) < modal。
 * - 不遮挡左侧导航、不遮盖主内容区关键操作；Esc 关闭；body 滚动锁定。
 * - 遮罩关闭策略（统一规则）：
 *   - 只读/详情类（订单详情、券详情）→ maskClosable 默认 true（点遮罩关闭）；
 *   - 表单/编辑类（角色编辑、编辑表单）→ 必须传 maskClosable={false}（防误触丢已填内容）。
 * - 打开时记录/关闭时恢复列表滚动位置由调用方负责（onClose 回调后恢复）。
 */
import { useEffect, type ReactNode, type CSSProperties } from 'react'
import styled, { keyframes } from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, FontWeight, Transition } from '../../../theme/tokens'
import { ZIndex } from '../../../theme/zIndex'
import { useTranslation } from '@/i18n'

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: ${ZIndex.drawer};
`

const Panel = styled.div<{ $width: string }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 100%;
  max-width: ${({ $width }) => $width};
  display: flex;
  flex-direction: column;
  background: ${Color.bg.card};
  box-shadow: ${Shadow.modal};
  z-index: ${ZIndex.drawer};
  animation: ${slideIn} 0.28s cubic-bezier(0.4, 0, 0.2, 1);
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

export interface DrawerProps {
  open: boolean
  title: ReactNode
  width?: string
  footer?: ReactNode
  onClose: () => void
  maskClosable?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export default function Drawer({
  open,
  title,
  width = '440px',
  footer,
  onClose,
  maskClosable = true,
  className,
  style,
  children,
}: DrawerProps) {
  const { t } = useTranslation()
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

  return (
    <>
      <Overlay onClick={maskClosable ? onClose : undefined} />
      <Panel $width={width} className={className} style={style} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose} aria-label={t('common.close')}>&times;</CloseBtn>
        </Header>
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Panel>
    </>
  )
}
