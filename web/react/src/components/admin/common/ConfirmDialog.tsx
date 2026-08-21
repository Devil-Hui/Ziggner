/**
 * ConfirmDialog（确认对话框）
 * ─────────────────────────
 * 基于新 Modal 实现（获得 role="dialog" + aria-modal + 统一遮罩 0.35/blur + z=1100）：
 * - 400px 宽、居中；Esc / 遮罩点击关闭（与旧版行为一致）；
 * - 危险操作确认按钮为红色（danger 语义）。
 * 调用方仍按原条件渲染（挂载即显示）。
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import Modal from './Modal'
import { Color, FontSize, FontWeight, Radius, Spacing, Transition } from '../../../theme/tokens'

const Msg = styled.div`
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  line-height: 1.6;
  padding: ${Spacing.xs}px 0;
`

const ConfirmBtn = styled.button<{ $danger?: boolean }>`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.medium};
  border: none;
  border-radius: ${Radius.sm}px;
  background: ${({ $danger }) => ($danger ? Color.status.error : Color.primary)};
  color: #fff;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover { filter: brightness(0.94); }
`

const CancelBtn = styled.button`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }
`

export interface ConfirmDialogProps {
  title: ReactNode
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open
      title={title}
      width="400px"
      onClose={onCancel}
      footer={
        <>
          <CancelBtn onClick={onCancel}>{cancelLabel}</CancelBtn>
          <ConfirmBtn $danger={danger} onClick={onConfirm}>{confirmLabel}</ConfirmBtn>
        </>
      }
    >
      <Msg>{message}</Msg>
    </Modal>
  )
}
