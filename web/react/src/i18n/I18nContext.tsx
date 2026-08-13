import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import en, { type Translations } from './en'
import zhCN from './zh-CN'

export type Language = 'en-US' | 'zh-CN'

const LANGUAGE_KEY = 'ziggner_lang'

const packs: Record<Language, Translations> = {
  'en-US': en,
  'zh-CN': zhCN as unknown as Translations,
}

function getInitialLang(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (stored === 'en-US' || stored === 'zh-CN') return stored
  } catch { /* noop */ }
  // Default to en-US
  return 'en-US'
}

interface I18nContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function resolve(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const k of keys) {
    if (current == null || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[k]
  }
  return typeof current === 'string' ? current : path
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang)

  const setLang = useCallback((lang: Language) => {
    setLangState(lang)
    try { localStorage.setItem(LANGUAGE_KEY, lang) } catch { /* noop */ }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let str = resolve(packs[lang] as unknown as Record<string, unknown>, key)
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp('\\$\\{' + k + '\\}', 'g'), String(v))
        }
      }
      return str
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}

export { packs }