// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mocks = vi.hoisted(() => ({ completeMock: vi.fn() }))

vi.mock('../../api/payment', () => ({
  paymentAPI: { completeMock: mocks.completeMock },
}))

vi.mock('../../i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../components/layout/PageLayout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import MockPayment from './MockPayment'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MockPayment', () => {
  it('runs the selected scenario against the authenticated simulator endpoint', async () => {
    mocks.completeMock.mockResolvedValue({ status: 'failed' })
    render(
      <MemoryRouter initialEntries={['/mock-payment/PAY-123?order_no=ORDER-9']}>
        <Routes>
          <Route path="/mock-payment/:paymentNo" element={<MockPayment />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('store.payment.simulatorScenario.failure.label'))

    await waitFor(() => expect(mocks.completeMock).toHaveBeenCalledWith('PAY-123', 'failure'))
    expect(screen.getByText('store.payment.simulatorResult.failure')).toBeTruthy()
  })
})
