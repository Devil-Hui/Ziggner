// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../../i18n'
import AppErrorBoundary from './AppErrorBoundary'

function BrokenPage(): never {
  throw new Error('internal database address must never be rendered')
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('contains a rendering failure and offers a safe recovery action', () => {
    const onReset = vi.fn()

    render(
      <I18nProvider>
        <AppErrorBoundary onReset={onReset}>
          <BrokenPage />
        </AppErrorBoundary>
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { name: '页面暂时无法显示' })).toBeTruthy()
    expect(screen.queryByText('internal database address must never be rendered')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
