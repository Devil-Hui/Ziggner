/**
 * useKeyboardShortcuts — 全局快捷键（P2）
 * ───────────────────────────────────────────────────
 * 支持两类模式：
 *   · 组合键：'meta+k'（⌘K / Ctrl+K）、'mod+shift+s'、'esc'
 *   · 双键序列：'g p'（G 后按 P → 商品）、'g o'（订单）、'n p'（新建商品）
 * 表单控件（input/textarea/contenteditable）内默认不拦截，仅放行 Esc。
 */
import { useEffect, useRef } from 'react'

export interface ShortcutDef {
  keys: string
  handler: (e: KeyboardEvent) => void
  /** 条件不满足时跳过 */
  when?: boolean
  /** 表单控件内也响应（默认 false） */
  allowInForm?: boolean
}

function matchCombo(pattern: string, e: KeyboardEvent): boolean {
  const parts = pattern.toLowerCase().split('+')
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  const keyMatch =
    key === 'esc' ? e.key === 'Escape' : key === 'enter' ? e.key === 'Enter' : e.key.toLowerCase() === key
  if (!keyMatch) return false
  const hasMod = (m: string): boolean => {
    if (m === 'meta' || m === 'mod') return e.metaKey || e.ctrlKey
    if (m === 'ctrl') return e.ctrlKey
    if (m === 'alt') return e.altKey
    if (m === 'shift') return e.shiftKey
    return false
  }
  return mods.every(hasMod)
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]): void {
  const ref = useRef(shortcuts)
  ref.current = shortcuts
  const pending = useRef<string>('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inForm =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      const key = e.key.toLowerCase()

      // 双键序列：先按第一个键（非表单内）
      if (!inForm && !e.metaKey && !e.ctrlKey && !e.altKey && pending.current === '') {
        for (const s of ref.current) {
          if (s.keys.includes(' ') && s.when !== false) {
            const first = s.keys.split(' ')[0].toLowerCase()
            if (key === first) {
              pending.current = key
              return
            }
          }
        }
      }

      for (const s of ref.current) {
        if (s.when === false) continue
        if (inForm && !s.allowInForm) continue
        if (s.keys.includes(' ')) {
          const [k1, k2] = s.keys.toLowerCase().split(' ')
          if (key === k2 && pending.current === k1) {
            pending.current = ''
            s.handler(e)
            return
          }
          continue
        }
        if (matchCombo(s.keys, e)) {
          s.handler(e)
          return
        }
      }
      pending.current = ''
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
