/**
 * 全局 Toast（统一反馈）
 * ─────────────────────
 * 顶部居中队列；四态 success/error/warning/info；3s 自动消失（error 5s）；
 * 手动关闭；最多同时 5 条；zIndex.toast(1300)。
 * 用法（任意位置，无需 Context）：
 *   import { toast } from './Toast'
 *   toast.success('已保存'); toast.error('操作失败')
 * 若需在组件内订阅（可选项），用 useToast()。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { Color, Radius, Shadow, FontSize, FontWeight, Transition, FluidSpace } from '../../../theme/tokens'
import { ZIndex } from '../../../theme/zIndex'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  duration: number
}

interface ToastOptions {
  duration?: number
}

type Listener = (item: ToastItem) => void

let seq = 1
const listeners = new Set<Listener>()

function emit(type: ToastType, message: string, opts?: ToastOptions): void {
  const item: ToastItem = {
    id: seq++,
    type,
    message,
    duration: opts?.duration ?? (type === 'error' ? 5000 : 3000),
  }
  listeners.forEach(fn => fn(item))
}

/** 全局便捷调用（脱离 React 树也能用） */
export const toast = {
  success: (msg: string, opts?: ToastOptions) => emit('success', msg, opts),
  error: (msg: string, opts?: ToastOptions) => emit('error', msg, opts),
  warning: (msg: string, opts?: ToastOptions) => emit('warning', msg, opts),
  info: (msg: string, opts?: ToastOptions) => emit('info', msg, opts),
}

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
`

const IconChar: Record<ToastType, string> = { success: '✓', error: '✕', warning: '!', info: 'i' }

function tone(t: ToastType): string {
  switch (t) {
    case 'success': return Color.status.success
    case 'error': return Color.status.error
    case 'warning': return Color.status.warning
    default: return Color.status.info
  }
}

const Container = styled.div`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${ZIndex.toast};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
`

const Item = styled.div<{ $type: ToastType }>`
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: ${FluidSpace.gap};
  max-width: 420px;
  padding: 10px 16px;
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.sm}px;
  background: #fff;
  color: ${Color.text.body};
  box-shadow: ${Shadow.dropdown};
  animation: ${slideIn} 0.2s ease;
  border-left: 3px solid ${({ $type }) => tone($type)};

  .ti {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: ${FontWeight.bold};
    color: #fff;
    background: ${({ $type }) => tone($type)};
    flex-shrink: 0;
  }

  .close {
    margin-left: 8px;
    border: none;
    background: none;
    cursor: pointer;
    color: ${Color.text.muted};
    font-size: 12px;
    line-height: 1;
    padding: 2px;
    transition: color ${Transition.fast};

    &:hover { color: ${Color.status.error}; }
  }
`

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const fn: Listener = item => {
      setItems(prev => [...prev.slice(-4), item])
      timers.current[item.id] = setTimeout(() => dismiss(item.id), item.duration)
    }
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
      Object.values(timers.current).forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = (id: number) => {
    setItems(prev => prev.filter(t => t.id !== id))
    const timer = timers.current[id]
    if (timer) { clearTimeout(timer); delete timers.current[id] }
  }

  return (
    <>
      {children}
      <Container data-testid="toast-container">
        {items.map(t => (
          <Item key={t.id} $type={t.type}>
            <span className="ti">{IconChar[t.type]}</span>
            <span>{t.message}</span>
            <button className="close" onClick={() => dismiss(t.id)} aria-label="关闭">✕</button>
          </Item>
        ))}
      </Container>
    </>
  )
}
