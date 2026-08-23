/**
 * TaskCenter — 全局异步任务中心（P1）
 * ───────────────────────────────────────────────────
 * 挂在后台全局 Header 右上角（↻ 任务 + 徽标）：
 *   · 打开时立即拉取并每 5s 轮询 GET /goods/task；
 *   · 展示最近任务（类型 + 进度条 + 状态），进行中高亮；
 *   · 底部「查看全部任务」→ /admin/tasks。
 * 数据源：adminAPI.getMyTasks()（TaskItem: task_id/type/state/current/total）。
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { adminAPI, type TaskItem } from '../../api/admin'
import { Business, Semantic } from '@/theme'
import { ZIndex } from '@/theme/zIndex'

const TYPE_LABEL: Record<string, string> = {
  import: '商品批量导入',
  audit: '商品批量审核',
  'promo-code': '推广码生成',
  export: '数据导出',
  cleanup: '数据清理',
}

const STATE_KEY: Record<TaskItem['state'], keyof typeof Business.TaskStatus> = {
  PENDING: 'pending',
  PROCESSING: 'running',
  SUCCESS: 'success',
  FAILURE: 'failed',
}

const Wrapper = styled.div`
  position: relative;
`

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid ${Semantic.border.light};
  border-radius: 6px;
  background: ${Semantic.surface.card};
  color: ${Semantic.text.body};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${Semantic.interactive.default};
    color: ${Semantic.interactive.default};
  }
`

const Badge = styled.span`
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: ${Semantic.interactive.default};
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
`

const Panel = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 320px;
  background: ${Semantic.surface.card};
  border: 1px solid ${Semantic.border.light};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: ${ZIndex.dropdown};
  overflow: hidden;
`

const PanelHeader = styled.div`
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${Semantic.text.heading};
  border-bottom: 1px solid ${Semantic.border.light};
`

const List = styled.div`
  max-height: 320px;
  overflow-y: auto;
`

const TaskRow = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${Semantic.border.light};

  &:last-child {
    border-bottom: none;
  }
`

const RowTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
`

const TaskName = styled.span`
  font-size: 13px;
  color: ${Semantic.text.body};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StatePill = styled.span<{ $color: string; $bg: string }>`
  font-size: 11px;
  font-weight: 500;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  padding: 1px 8px;
  border-radius: 999px;
  white-space: nowrap;
`

const Track = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${Semantic.surface.sunken};
  overflow: hidden;
`

const Fill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => `${Math.min(100, Math.max(0, $width))}%`};
  background: ${({ $color }) => $color};
  border-radius: 999px;
  transition: width 0.3s ease;
`

const ProgressText = styled.span`
  font-size: 11px;
  color: ${Semantic.text.muted};
  margin-top: 4px;
  display: block;
`

const Empty = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: ${Semantic.text.muted};
`

const Footer = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-top: 1px solid ${Semantic.border.light};
  background: ${Semantic.surface.card};
  color: ${Semantic.interactive.default};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;

  &:hover {
    background: ${Semantic.surface.sunken};
  }
`

const taskLabel = (type: string): string => TYPE_LABEL[type] ?? type.replace(/[-_]/g, ' ')

export function TaskCenter() {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      setTasks(await adminAPI.getMyTasks())
    } catch {
      // 拉取失败保持旧数据
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [open, load])

  const running = tasks.filter((t) => t.state === 'PROCESSING' || t.state === 'PENDING').length

  return (
    <Wrapper>
      <Trigger onClick={() => setOpen((v) => !v)} aria-label="异步任务">
        ↻ 任务
        {running > 0 && <Badge>{running > 99 ? '99+' : running}</Badge>}
      </Trigger>
      {open && (
        <Panel role="menu">
          <PanelHeader>异步任务</PanelHeader>
          <List>
            {tasks.length === 0 ? (
              <Empty>暂无任务</Empty>
            ) : (
              tasks.slice(0, 6).map((t) => {
                const stateKey = STATE_KEY[t.state]
                const tone = Business.TaskStatus[stateKey]
                const color = Semantic.status[tone as keyof typeof Semantic.status].fg
                const bg = Semantic.status[tone as keyof typeof Semantic.status].bg
                const pct = t.total > 0 ? Math.round((t.current / t.total) * 100) : 0
                return (
                  <TaskRow key={t.task_id}>
                    <RowTop>
                      <TaskName title={t.task_id}>{taskLabel(t.type)}</TaskName>
                      <StatePill $color={color} $bg={bg}>
                        {t.state === 'PROCESSING' ? '处理中' : t.state === 'SUCCESS' ? '已完成' : t.state === 'FAILURE' ? '失败' : '等待中'}
                      </StatePill>
                    </RowTop>
                    <Track>
                      <Fill
                        $width={t.state === 'PROCESSING' ? (t.total > 0 ? pct : 30) : t.state === 'SUCCESS' ? 100 : pct}
                        $color={t.state === 'FAILURE' ? Semantic.status.danger.fg : t.state === 'SUCCESS' ? Semantic.status.success.fg : Semantic.interactive.default}
                      />
                    </Track>
                    <ProgressText>
                      {t.state === 'PROCESSING' ? `${pct}% · ${t.current}/${t.total}` : t.error_message ?? `${t.current}/${t.total}`}
                    </ProgressText>
                  </TaskRow>
                )
              })
            )}
          </List>
          <Footer onClick={() => { setOpen(false); navigate('/admin/tasks') }}>
            查看全部任务 →
          </Footer>
        </Panel>
      )}
    </Wrapper>
  )
}
