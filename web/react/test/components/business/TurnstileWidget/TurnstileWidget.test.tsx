// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TurnstileWidget from '@/components/business/TurnstileWidget/TurnstileWidget'

const TEST_SITE_KEY = '1x00000000000000000000AA'
const TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  document.head.querySelectorAll('script[src*="challenges.cloudflare.com/turnstile"]')
    .forEach((script) => script.remove())
  delete window.turnstile
  delete window.onloadTurnstileCallback
  vi.restoreAllMocks()
})

function failTurnstileScript() {
  const script = document.head.querySelector<HTMLScriptElement>(
    'script[src*="challenges.cloudflare.com/turnstile"]',
  )
  expect(script).not.toBeNull()
  script?.dispatchEvent(new Event('error'))
}

describe('TurnstileWidget fail-closed behavior', () => {
  it('uses the documented dummy token only for the official always-pass test key', async () => {
    const onVerify = vi.fn()
    render(<TurnstileWidget siteKey={TEST_SITE_KEY} onVerify={onVerify} />)

    failTurnstileScript()

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith(TEST_TOKEN))
  })

  it('never creates a token when a production-key script fails', async () => {
    const onVerify = vi.fn()
    const onError = vi.fn()
    render(
      <TurnstileWidget
        siteKey="0x-production-site-key"
        onVerify={onVerify}
        onError={onError}
      />,
    )

    failTurnstileScript()

    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
    expect(onVerify).not.toHaveBeenCalled()
  })
})
