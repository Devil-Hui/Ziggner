// TypeScript strict mode enabled
import { useState, useEffect, useCallback, useRef } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { adminAPI } from '../../api/admin'
import DataTable, { type Column } from '../../components/admin/common/DataTable'
import PageHeader from '../../components/admin/common/PageHeader'
import StatusBadge from '../../components/admin/common/StatusBadge'
import Progress from '../../components/admin/common/Progress'
import { useTranslation } from '../../i18n'

// ── Styled Components ──

const PageContainer = styled.div`
  padding: 0;
`

const ProgressBarWrapper = styled.div`
  width: 120px;
  height: 6px;
  background: ${Color.border.light};
  border-radius: 3px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $progress: number }>`
  width: ${({ $progress }) => Math.min(100, Math.max(0, $progress))}%;
  height: 100%;
  background: ${Color.primary};
  border-radius: 3px;
  transition: width 0.6s ease;
`

const ProgressCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ProgressText = styled.span`
  font-size: 11px;
  color: ${Color.text.muted};
  min-width: 32px;
`

const MonoText = styled.span`
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
`

const DateTime = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  white-space: nowrap;
`

const TaskType = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  background: ${Color.primaryLight};
  padding: 1px 8px;
  border-radius: 2px;
`

// ── Types ──

interface TaskItem {
  task_id: string
  type: string
  state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE'
  progress: number
  created_at: string
}

// ── Component ──

export default function AdminTasks() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasInProgress = useCallback(
    () => tasks.some((t) => t.state === 'PENDING' || t.state === 'PROCESSING'),
    [tasks]
  )

  const fetchTasks = useCallback(async () => {
    try {
      const res = (await adminAPI.getMyTasks()) as unknown as { items: TaskItem[] } | TaskItem[]

      let taskList: TaskItem[]
      if (Array.isArray(res)) {
        taskList = res
      } else if (res && typeof res === 'object' && 'items' in res) {
        taskList = (res as { items: TaskItem[] }).items
      } else {
        taskList = []
      }

      // Fetch progress for in-progress tasks
      const updatedTasks = await Promise.all(
        taskList.map(async (task) => {
          if (task.state === 'PENDING' || task.state === 'PROCESSING') {
            try {
              const progressRes = (await adminAPI.getTaskProgress(task.task_id)) as {
                state?: string
                progress?: number
              }
              return {
                ...task,
                state: (progressRes.state as TaskItem['state']) || task.state,
                progress: progressRes.progress ?? task.progress ?? 0,
              }
            } catch {
              return task
            }
          }
          return task
        })
      )

      setTasks(updatedTasks)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('admin.asyncTasks.loadFailed')
      setError(message)
    }
    setLoading(false)
  }, [t])

  // Initial fetch
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Polling: 2-second interval for in-progress tasks
  useEffect(() => {
    if (hasInProgress()) {
      pollingRef.current = setInterval(() => {
        fetchTasks()
      }, 2000)
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [hasInProgress, fetchTasks])

  const formatDateTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const columns: Column<TaskItem>[] = [
    {
      key: 'task_id',
      title: t('admin.asyncTasks.columnTaskId'),
      width: '180px',
      render: (val: unknown) => (
        <MonoText title={String(val ?? '')}>
          {String(val ?? '').length > 24 ? String(val).slice(0, 24) + '...' : String(val ?? '')}
        </MonoText>
      ),
    },
    {
      key: 'type',
      title: t('admin.asyncTasks.columnType'),
      width: '120px',
      render: (val: unknown) => <TaskType>{String(val ?? '')}</TaskType>,
    },
    {
      key: 'state',
      title: t('admin.asyncTasks.columnStatus'),
      width: '100px',
      render: (val: unknown) => <StatusBadge status={val as TaskItem['state']} />,
    },
    {
      key: 'progress',
      title: t('admin.asyncTasks.columnProgress'),
      width: '160px',
      render: (val: unknown, record: TaskItem) => {
        const progress = typeof val === 'number' ? val : Number(val) || 0
        const isActive = record.state === 'PENDING' || record.state === 'PROCESSING'
        return (
          <ProgressCell>
            <Progress percent={progress} width="120px" showText={false} />
            <ProgressText>
              {isActive ? `${progress}%` : record.state === 'SUCCESS' ? '100%' : record.state === 'FAILURE' ? '—' : '—'}
            </ProgressText>
          </ProgressCell>
        )
      },
    },
    {
      key: 'created_at',
      title: t('admin.asyncTasks.columnCreatedAt'),
      width: '170px',
      render: (val: unknown) => <DateTime>{formatDateTime(String(val ?? ''))}</DateTime>,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.asyncTasks.title')}
        breadcrumb={[{ label: t('admin.asyncTasks.subtitle') }, { label: t('admin.asyncTasks.title') }]}
        actions={
          <button
            onClick={fetchTasks}
            style={{
              height: 32,
              padding: '0 14px',
              fontSize: 13,
              border: '1px solid ${Color.border.medium}',
              background: '#fff',
              color: '#333',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            {t('admin.asyncTasks.refresh')}
          </button>
        }
      />

      <DataTable<TaskItem>
        columns={columns}
        data={tasks}
        loading={loading}
        error={error}
        onRetry={fetchTasks}
        emptyTitle={t('admin.asyncTasks.noTasks')}
        emptyIcon="⏳"
        rowKey="task_id"
      />
    </PageContainer>
  )
}