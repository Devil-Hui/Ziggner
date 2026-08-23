/**
 * Dialog — 统一弹窗原语（P0-2 组件收敛）
 * ───────────────────────────────────────────────────
 * 收敛历史 7 套弹窗（Modal / ConfirmDialog / FormDialog / FormOverlay /
 * ReviewOverlay / PromptDialog / DeleteConfirmDialog）为单一原语：
 *   Dialog        — 基础容器（标题 / 内容 / footer / 遮罩 / Esc / 滚动锁定）
 *   ConfirmDialog — 确认框（tone 风险分级：danger / warning / info）
 *   FormDialog    — 表单框（内置脏数据保护：dirty 时关闭需二次确认）
 * 尺寸：sm 400 / md 560 / lg 720 / xl 960（对齐 Component.Modal.maxWidth）。
 * 遮罩关闭默认 false（防误触丢表单内容）；详情/只读场景由调用方显式开启。
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import styled from 'styled-components'
import { Component, Semantic } from '@/theme'
import { ZIndex } from '@/theme/zIndex'
import { Button } from './Button'

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl'
export type DialogTone = 'danger' | 'warning' | 'info'

const SIZE_MAP: Record<DialogSize, string> = {
  sm: `${Component.Modal.maxWidth.sm}px`,
  md: `${Component.Modal.maxWidth.md}px`,
  lg: `${Component.Modal.maxWidth.lg}px`,
  xl: `${Component.Modal.maxWidth.xl}px`,
}

const TONE_COLOR: Record<DialogTone, string> = {
  danger: Semantic.status.danger.fg,
  warning: Semantic.status.warning.fg,
  info: Semantic.interactive.default,
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${ZIndex.modal};
  background: ${Semantic.surface.overlay};
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const Panel = styled.div<{ $width: string }>`
  width: 100%;
  max-width: ${({ $width }) => $width};
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${Semantic.surface.card};
  border-radius: ${Component.Modal.radius}px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
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

export interface DialogProps {
  open: boolean
  title: ReactNode
  size?: DialogSize
  /** 自定义底部；不传则渲染 取消/确认 */
  footer?: ReactNode
  okText?: string
  cancelText?: string
  okDanger?: boolean
  loading?: boolean
  onOk?: () => void
  onClose: () => void
  /** 点击遮罩是否关闭（默认 false，防误触丢表单） */
  maskClosable?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function Dialog({
  open,
  title,
  size = 'md',
  footer,
  okText = '确认',
  cancelText = '取消',
  okDanger = false,
  loading = false,
  onOk,
  onClose,
  maskClosable = false,
  className,
  style,
  children,
}: DialogProps) {
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
    <Overlay onClick={maskClosable ? onClose : undefined}>
      <Panel
        $width={SIZE_MAP[size]}
        onClick={(e) => e.stopPropagation()}
        className={className}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose} aria-label="关闭">
            &times;
          </CloseBtn>
        </Header>
        <Body>{children}</Body>
        <Footer>
          {footer ?? (
            <>
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                {cancelText}
              </Button>
              <Button
                variant={okDanger ? 'danger' : 'primary'}
                onClick={onOk}
                disabled={loading}
              >
                {loading ? '处理中…' : okText}
              </Button>
            </>
          )}
        </Footer>
      </Panel>
    </Overlay>
  )
}

/* ── ConfirmDialog：风险分级确认 ─────────────────────── */

export interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  message: ReactNode
  tone?: DialogTone
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  tone = 'danger',
  confirmLabel = '确认',
  cancelLabel = '取消',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      size="sm"
      onClose={onCancel}
      okText={confirmLabel}
      cancelText={cancelLabel}
      okDanger={tone === 'danger'}
      loading={loading}
      onOk={onConfirm}
    >
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: Semantic.text.body,
          whiteSpace: 'pre-line',
        }}
      >
        {message}
      </p>
      {tone === 'warning' && (
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 12,
            color: Semantic.status.warning.fg,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: TONE_COLOR.warning, display: 'inline-block' }} />
          此操作存在业务影响，请确认影响范围后再继续
        </p>
      )}
    </Dialog>
  )
}

/* ── FormDialog：表单 + 脏数据保护 ───────────────────── */

export interface FormDialogProps extends Omit<DialogProps, 'footer' | 'onClose' | 'okText' | 'cancelText'> {
  onOk: () => void
  onCancel: () => void
  okText?: string
  cancelText?: string
  /** 表单是否有未保存修改；true 时关闭（X/遮罩/Esc）需二次确认 */
  dirty?: boolean
}

export function FormDialog({
  open,
  title,
  size = 'md',
  okText = '保存',
  cancelText = '取消',
  dirty = false,
  onOk,
  onCancel,
  children,
  ...rest
}: FormDialogProps) {
  const [showLeave, setShowLeave] = useState(false)

  useEffect(() => {
    if (!open) setShowLeave(false)
  }, [open])

  const requestClose = () => {
    if (dirty) setShowLeave(true)
    else onCancel()
  }

  return (
    <>
      <Dialog
        open={open}
        title={title}
        size={size}
        okText={okText}
        cancelText={cancelText}
        onOk={onOk}
        onClose={requestClose}
        {...rest}
      >
        {children}
      </Dialog>
      <ConfirmDialog
        open={showLeave}
        title="确定离开？"
        message={'当前表单存在未保存的修改。\n离开后将丢失这些修改。'}
        tone="warning"
        confirmLabel="放弃修改"
        cancelLabel="继续编辑"
        onConfirm={() => {
          setShowLeave(false)
          onCancel()
        }}
        onCancel={() => setShowLeave(false)}
      />
    </>
  )
}
