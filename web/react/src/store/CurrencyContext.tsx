import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// 货币上下文：驱动顶部 "$ USD" 切换器与价格格式化。
// 注意：汇率为静态占位（以 USD 为基准），并非实时汇率；接真实汇率需后端 /settings 端点。
export type CurrencyCode = 'USD' | 'EUR' | 'JPY'

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  JPY: '¥',
}

// 相对 USD 的占位汇率（1 USD = rate * 目标币种）
const RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  JPY: 150,
}

export const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'JPY']

interface CurrencyContextValue {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  symbol: string
  format: (amountUsd: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

const STORAGE_KEY = 'ziggner_currency'

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return (saved as CurrencyCode) || 'USD'
  })

  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, currency)
  }, [currency])

  const value = useMemo<CurrencyContextValue>(() => {
    const symbol = SYMBOLS[currency]
    const rate = RATES[currency]
    return {
      currency,
      setCurrency: setCurrencyState,
      symbol,
      format: (amountUsd: number) => {
        const converted = amountUsd * rate
        const digits = currency === 'JPY' ? 0 : 2
        return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
      },
    }
  }, [currency])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
