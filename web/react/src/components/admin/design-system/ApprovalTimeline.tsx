/**
 * ApprovalTimeline — 审批记录时间线（P1 · Approval Workflow）
 * ───────────────────────────────────────────────────
 * 垂直时间线展示申请/审核的流转记录：
 *   ● 张三 提交        10:32
 *   │
 *   ● 李四 通过        11:08
 *   │
 *   ○ 王五 待处理      （当前）
 * action 颜色语义：submit=info / approve=success / reject=danger / pending=warning。
 * 配合申请中心/商品审核等详情 Drawer 使用（变更前 → 变更后 → 影响范围 → 审批记录）。
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Semantic } from '@/theme'

export type ApprovalAction = 'submit' | 'approve' | 'reject' | 'pending'

export interface ApprovalStep {
  id: string | number
  actor: string
  action: ApprovalAction
  /** 动作文案，默认按 action 翻译 */
  actionLabel?: string
  at?: string
  note?: ReactNode
  /** 是否当前处理人（pending 步骤显示"待处理"强调） */
  isCurrent?: boolean
}

const ACTION_META: Record<ApprovalAction, { color: string; defaultLabel: string }> = {
  submit: { color: Semantic.status.info.fg, defaultLabel: '提交' },
  approve: { color: Semantic.status.success.fg, defaultLabel: '通过' },
  reject: { color: Semantic.status.danger.fg, defaultLabel: '驳回' },
  pending: { color: Semantic.status.warning.fg, defaultLabel: '待处理' },
}

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
`

const Item = styled.li`
  display: flex;
  gap: 12px;
  position: relative;
  padding-bottom: 16px;

  &:last-child {
    padding-bottom: 0;
  }
`

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 16px;
`

const Dot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-top: 4px;
  flex-shrink: 0;
`

const Line = styled.span`
  flex: 1;
  width: 2px;
  background: ${Semantic.border.light};
  margin: 4px 0;
`

const Content = styled.div`
  flex: 1;
  padding-top: 1px;
`

const Row = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const Actor = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${Semantic.text.heading};
`

const ActionLabel = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}1a`};
  padding: 1px 8px;
  border-radius: 999px;
`

const Time = styled.span`
  font-size: 12px;
  color: ${Semantic.text.muted};
  white-space: nowrap;
`

const Note = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: ${Semantic.text.secondary};
  line-height: 1.5;
`

export function ApprovalTimeline({ steps }: { steps: ApprovalStep[] }) {
  return (
    <List>
      {steps.map((s, i) => {
        const meta = ACTION_META[s.action]
        const isLast = i === steps.length - 1
        return (
          <Item key={s.id}>
            <Rail>
              <Dot $color={meta.color} />
              {!isLast && <Line />}
            </Rail>
            <Content>
              <Row>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Actor>{s.actor}</Actor>
                  <ActionLabel $color={meta.color}>{s.actionLabel ?? meta.defaultLabel}</ActionLabel>
                  {s.isCurrent && <span style={{ fontSize: 12, color: Semantic.status.warning.fg }}>· 当前处理人</span>}
                </div>
                {s.at && <Time>{s.at}</Time>}
              </Row>
              {s.note && <Note>{s.note}</Note>}
            </Content>
          </Item>
        )
      })}
    </List>
  )
}
