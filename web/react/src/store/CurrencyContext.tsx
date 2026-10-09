import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// 货币上下文：驱动顶部 "$ USD" 切换器与价格格式化。
//
// 全站统一以 USD 计价、以 $ 显示：商品价格存的就是美元值（如 49.90），
// 之前列表里还有 EUR / JPY，切换后整站价格会带上 € / ¥，与结算币种不一致，
// 而且汇率只是静态占位（并非实时汇率），展示出来反而是误导。故币种收敛为 USD，
// 汇率换算逻辑保留 —— 将来接了真实汇率只需往下面两张表加币种即可。
export type CurrencyCode = 'USD'

/** 币种符号：全站货币符号的唯一来源（页脚 / 顶部栏都从这里取，不再各自定义） */
export const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
}

// 相对 USD 的汇率（1 USD = rate * 目标币种）
const RATES: Record<CurrencyCode, number> = {
  USD: 1,
}

export const CURRENCIES: CurrencyCode[] = ['USD']

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
    // 必须校验白名单：老用户 localStorage 里可能存着已下线的 EUR / JPY，
    // 直接采信会让 SYMBOLS[saved] 取不到值，价格渲染成 "undefined49.90"。
    return CURRENCIES.includes(saved as CurrencyCode) ? (saved as CurrencyCode) : 'USD'
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
        const digits = 2
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
