/**
 * Drawer — 统一侧滑抽屉（P0-2 组件收敛）
 * ───────────────────────────────────────────────────
 * 收敛为：
 *   Drawer       — 基础抽屉（右侧滑入，zIndex.drawer=700 < modal）
 *   DetailDrawer — 详情抽屉（maskClosable 默认 true：点遮罩关闭）
 *   FormDrawer   — 表单抽屉（maskClosable 默认 false + 脏数据保护）
 * 宽度：sm 360 / md 440 / lg 560（对齐 Component.Drawer.width）。
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { Component, Semantic } from '@/theme'
import { ZIndex } from '@/theme/zIndex'
import { ConfirmDialog } from './Dialog'
import { useTranslation } from '@/i18n'

export type DrawerSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<DrawerSize, string> = {
  sm: `${Component.Drawer.width.sm}px`,
  md: `${Component.Drawer.width.md}px`,
  lg: `${Component.Drawer.width.lg}px`,
}

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${Semantic.surface.overlay};
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
  background: ${Semantic.surface.card};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: ${ZIndex.drawer};
  animation: ${slideIn} 0.28s cubic-bezier(0.4, 0, 0.2, 1);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid ${Semantic.border.light};
`

const Title = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: ${Semantic.text.heading};
`

const CloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 18px;
  line-height: 1;
  color: ${Semantic.text.muted};
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: #dbeafe;
    color: #1e40af;
  }
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 1px solid ${Semantic.border.light};
`

export interface DrawerProps {
  open: boolean
  title: ReactNode
  size?: DrawerSize
  footer?: ReactNode
  onClose: () => void
  maskClosable?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function Drawer({
  open,
  title,
  size = 'md',
  footer,
  onClose,
  maskClosable = false,
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
      <Panel
        $width={SIZE_MAP[size]}
        className={className}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose} aria-label={t('common.close')}>
            &times;
          </CloseBtn>
        </Header>
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Panel>
    </>
  )
}

/* ── DetailDrawer：只读/详情（点遮罩可关） ────────────── */

export interface DetailDrawerProps extends Omit<DrawerProps, 'maskClosable'> {}

export function DetailDrawer(props: DetailDrawerProps) {
  return <Drawer {...props} maskClosable />
}

/* ── FormDrawer：编辑/表单（遮罩不可关 + 脏数据保护） ──── */

export interface FormDrawerProps extends Omit<DrawerProps, 'maskClosable'> {
  /** 表单是否有未保存修改；true 时关闭需二次确认 */
  dirty?: boolean
}

export function FormDrawer({ dirty = false, onClose, children, ...rest }: FormDrawerProps) {
  const { t } = useTranslation()
  const [showLeave, setShowLeave] = useState(false)

  useEffect(() => {
    if (!rest.open) setShowLeave(false)
  }, [rest.open])

  const requestClose = () => {
    if (dirty) setShowLeave(true)
    else onClose()
  }

  return (
    <>
      <Drawer {...rest} onClose={requestClose} maskClosable={false}>
        {children}
      </Drawer>
      <ConfirmDialog
        open={showLeave}
        title={t('admin.dialog.leaveTitle')}
        message={t('admin.dialog.leaveMessage')}
        tone="warning"
        confirmLabel={t('admin.dialog.discardChanges')}
        cancelLabel={t('admin.dialog.keepEditing')}
        onConfirm={() => {
          setShowLeave(false)
          onClose()
        }}
        onCancel={() => setShowLeave(false)}
      />
    </>
  )
}
