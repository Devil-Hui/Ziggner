/**
 * BulkActionBar — 统一批量操作栏（P1）
 * ───────────────────────────────────────────────────
 * 选中行后出现在内容区顶部的操作栏：
 *   「已选择 N 项」 [上架] [下架] [审核] [导出]   [取消选择]
 * 危险操作（danger）点击后先弹风险分级确认，让管理员"敢执行"。
 * 配合 SmartDataTable 的 rowSelection + bulkBar 插槽使用。
 */
import { useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { Semantic } from '@/theme'
import { Button } from './Button'
import { ConfirmDialog } from './Dialog'
import { useTranslation } from '@/i18n'

export interface BulkAction {
  key: string
  label: string
  variant?: 'secondary' | 'danger' | 'primary'
  /** 传了 confirmMessage 则点按先弹确认（风险分级） */
  confirmTitle?: string
  confirmMessage?: ReactNode
  disabled?: boolean
  onClick: () => void
}

export interface BulkActionBarProps {
  selectedCount: number
  actions: BulkAction[]
  onClear: () => void
  /** 选中摘要额外信息（如影响范围提示） */
  summary?: ReactNode
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 8px;
  background: ${Semantic.status.info.bg};
  border: 1px solid ${Semantic.status.info.fg}22;
`

const Count = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${Semantic.interactive.default};
  margin-right: 4px;
`

export function BulkActionBar({ selectedCount, actions, onClear, summary }: BulkActionBarProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<BulkAction | null>(null)

  if (selectedCount === 0) return null

  return (
    <>
      <Bar>
        <Count>{t('admin.bulk.selected', { count: String(selectedCount) })}</Count>
        {summary}
        {actions.map((a) => (
          <Button
            key={a.key}
            variant={a.variant ?? 'secondary'}
            size="sm"
            disabled={a.disabled}
            onClick={() => (a.confirmMessage ? setPending(a) : a.onClick())}
          >
            {a.label}
          </Button>
        ))}
        <Button variant="text" size="sm" onClick={onClear}>
          {t('admin.bulk.clearSelection')}
        </Button>
      </Bar>
      <ConfirmDialog
        open={!!pending}
        title={pending?.confirmTitle ?? t('admin.bulk.confirmTitle')}
        message={pending?.confirmMessage ?? t('admin.bulk.confirmMessage', { count: String(selectedCount), label: pending?.label ?? '' })}
        tone={pending?.variant === 'danger' ? 'danger' : 'warning'}
        confirmLabel={t('admin.bulk.confirmExecute')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          pending?.onClick()
          setPending(null)
        }}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
