/**
 * RefreshButton —— 列表页局部刷新按钮（免整页刷新）
 * 点击触发 onRefresh（通常为重新拉取当前列表数据），带旋转 loading 动画。
 */
import { useState, useCallback } from 'react'
import styled from 'styled-components'
import { Color } from '../../../theme/tokens'

const Btn = styled.button<{ $spin: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  background: ${Color.bg.card};
  color: ${Color.text.body};
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
    animation: ${({ $spin }) => ($spin ? 'wb-refresh-spin 0.8s linear infinite' : 'none')};
  }

  @keyframes wb-refresh-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

interface Props {
  onRefresh: () => void | Promise<void>
  label?: string
  title?: string
}

export default function RefreshButton({ onRefresh, label = '', title }: Props) {
  const [spinning, setSpinning] = useState(false)

  const handleClick = useCallback(async () => {
    if (spinning) return
    setSpinning(true)
    try {
      await onRefresh()
    } finally {
      // 短暂保持旋转以提供反馈
      setTimeout(() => setSpinning(false), 400)
    }
  }, [onRefresh, spinning])

  return (
    <Btn type="button" $spin={spinning} onClick={handleClick} disabled={spinning} title={title || '刷新当前列表'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
      {label || ''}
    </Btn>
  )
}
