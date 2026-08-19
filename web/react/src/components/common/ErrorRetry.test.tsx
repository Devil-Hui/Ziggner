/**
 * ErrorRetry 组件测试：错误兜底交互（展示错误 + 点击重试回调）。
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorRetry from './ErrorRetry'

describe('ErrorRetry —— 错误兜底组件', () => {
  it('展示错误信息', () => {
    render(<ErrorRetry message="加载失败，请稍后重试" />)
    expect(screen.getByText('加载失败，请稍后重试')).toBeInTheDocument()
  })

  it('有 onRetry 时渲染重试按钮，点击触发回调', () => {
    const onRetry = vi.fn()
    render(<ErrorRetry message="出错了" onRetry={onRetry} />)
    const btn = screen.getByRole('button', { name: '重试' })
    fireEvent.click(btn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('无 onRetry 时不渲染重试按钮', () => {
    render(<ErrorRetry message="出错了" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
