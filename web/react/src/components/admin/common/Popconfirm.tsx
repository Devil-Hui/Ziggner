/**
 * Popconfirm（轻量气泡确认，替代部分弹窗，减少打断）
 * 点击触发元素 → 气泡：文案 + 取消/确认。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { Color, FontSize, FontWeight, Radius, Shadow, Spacing, Transition } from '../../../theme/tokens'
import { ZIndex } from '../../../theme/zIndex'

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
`

const Bubble = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: ${ZIndex.dropdown};
  min-width: 200px;
  background: #fff;
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.dropdown};
  padding: ${Spacing.md}px;
`

const Message = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  margin-bottom: ${Spacing.md}px;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${Spacing.sm}px;
`

const Btn = styled.button<{ $kind: 'default' | 'danger' }>`
  padding: 5px 14px;
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.medium};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: all ${Transition.fast};

  ${({ $kind }) =>
    $kind === 'danger'
      ? `background: ${Color.status.error}; color: #fff; border: 1px solid ${Color.status.error};
         &:hover { background: #c0392b; }`
      : `background: ${Color.bg.card}; color: ${Color.text.secondary}; border: 1px solid ${Color.border.medium};
         &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }`}
`

export interface PopconfirmProps {
  title: ReactNode
  onConfirm: () => void
  onCancel?: () => void
  okText?: string
  cancelText?: string
  okDanger?: boolean
  children: ReactNode
  className?: string
}

export default function Popconfirm({
  title,
  onConfirm,
  onCancel,
  okText = '确认',
  cancelText = '取消',
  okDanger = true,
  children,
  className,
}: PopconfirmProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <Wrap ref={wrapRef} className={className}>
      <span onClick={e => { e.stopPropagation(); setOpen(v => !v) }}>{children}</span>
      {open && (
        <Bubble onClick={e => e.stopPropagation()}>
          <Message>{title}</Message>
          <Actions>
            <Btn $kind="default" onClick={() => { setOpen(false); onCancel?.() }}>{cancelText}</Btn>
            <Btn $kind={okDanger ? 'danger' : 'default'} onClick={() => { setOpen(false); onConfirm() }}>{okText}</Btn>
          </Actions>
        </Bubble>
      )}
    </Wrap>
  )
}
