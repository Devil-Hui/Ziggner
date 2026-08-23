import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/admin/design-system'

export interface UseDirtyFormOptions<T> {
  /** 打开表单时的初始值（脏参照快照） */
  initial: T
  /** 当前表单值 */
  current: T
  /** 确认放弃后真正关闭并重置的回调 */
  onDiscard: () => void
  /** 自定义文案（可选） */
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
}

export function useDirtyForm<T>({
  initial,
  current,
  onDiscard,
  title = '确定放弃修改？',
  message = '当前表单存在未保存的修改。\n离开后将丢失这些修改。',
  confirmLabel = '放弃修改',
  cancelLabel = '继续编辑',
}: UseDirtyFormOptions<T>) {
  const [showLeave, setShowLeave] = useState(false)

  // 深度比较两个对象，判断是否有未保存修改
  const isDirty = useMemo(() => JSON.stringify(initial) !== JSON.stringify(current), [initial, current])

  useEffect(() => {
    if (!isDirty) setShowLeave(false)
  }, [isDirty])

  /** 供 Modal/Drawer 的关闭入口（X / 遮罩 / 取消）调用 */
  const requestClose = () => {
    if (isDirty) setShowLeave(true)
    else onDiscard()
  }

  const guardNode = (
    <ConfirmDialog
      open={showLeave}
      title={title}
      message={message}
      tone="warning"
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={() => {
        setShowLeave(false)
        onDiscard()
      }}
      onCancel={() => setShowLeave(false)}
    />
  )

  return { isDirty, requestClose, guardNode }
}