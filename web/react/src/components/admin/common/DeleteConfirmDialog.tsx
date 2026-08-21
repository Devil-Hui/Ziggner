/**
 * DeleteConfirmDialog（删除确认对话框）
 * ─────────────────────────
 * 基于新 Modal 实现（role="dialog" + aria-modal + 统一遮罩/z=1100）：
 * - 删除目标名高亮红色；确认按钮加载态（loading 时禁用并显示「删除中...」）；
 * - 遮罩点击不关闭（防止误触丢操作意图），仅 Esc / 取消 / 确认关闭。
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import Modal from './Modal'
import { Color, FontSize, FontWeight, Spacing } from '../../../theme/tokens'

const Msg = styled.div`
  font-size: ${FontSize.base}px;
  color: ${Color.text.body};
  line-height: 1.6;
  padding: ${Spacing.xs}px 0;
`

const Highlight = styled.span`
  font-weight: ${FontWeight.semibold};
  color: ${Color.status.error};
`

export interface DeleteConfirmDialogProps {
  open: boolean
  title?: string
  /** 删除目标名（如优惠券码），为空则显示通用文案 */
  itemName?: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function DeleteConfirmDialog({
  open,
  title = '确认删除',
  itemName,
  onClose,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      width="420px"
      maskClosable={false}
      okText="确认删除"
      okLoadingText="删除中..."
      okDanger
      confirmLoading={loading}
      cancelText="取消"
      onOk={onConfirm}
      onClose={onClose}
    >
      <Msg>
        确定要删除
        {itemName ? (
          <>
            优惠券 <Highlight>{itemName}</Highlight>
          </>
        ) : (
          '该优惠券'
        )}
        吗？此操作不可撤销。
      </Msg>
    </Modal>
  )
}
