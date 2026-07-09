import React, { useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'

// ==================== 类型定义 ====================

/** TurnstileWidget 组件 Props */
export interface TurnstileWidgetProps {
  /** Cloudflare Turnstile site key */
  siteKey: string
  /** 验证成功回调，接收 token */
  onVerify: (token: string) => void
  /** 验证出错回调 */
  onError?: (error: Error) => void
  /** token 过期回调 */
  onExpire?: () => void
  /** 自定义主题 */
  theme?: 'light' | 'dark' | 'auto'
  /** 自定义尺寸 */
  size?: 'normal' | 'compact'
}

// ==================== 全局类型扩展 ====================

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: (error: Error) => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact'
        },
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId?: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

// ==================== 样式组件 ====================

const WidgetContainer = styled.div`
  display: flex;
  justify-content: center;
  min-height: 65px;
`

// ==================== 常量 ====================

/** Turnstile 脚本 URL */
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

// ==================== 组件 ====================

/**
 * TurnstileWidget - Cloudflare Turnstile 人机验证组件
 *
 * 功能：
 * - 动态加载 Turnstile 脚本（全局单例）
 * - 渲染 Turnstile widget 到指定容器
 * - 支持验证成功、错误、过期回调
 * - 组件卸载时自动清理 widget
 */
const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string>('')
  const scriptLoadedRef = useRef<boolean>(false)

  // 动态加载 Turnstile 脚本（全局单例）
  const loadTurnstileScript = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // 脚本已存在则直接返回
      if (window.turnstile) {
        resolve()
        return
      }

      // 防止重复加载
      if (scriptLoadedRef.current) {
        // 等待已有脚本加载完成
        const checkInterval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
        return
      }

      scriptLoadedRef.current = true

      // 注册全局回调
      window.onloadTurnstileCallback = () => {
        resolve()
      }

      const script = document.createElement('script')
      script.src = `${TURNSTILE_SCRIPT_URL}?onload=onloadTurnstileCallback&render=explicit`
      script.async = true
      script.defer = true

      script.onerror = () => {
        console.error('Failed to load Turnstile script')
        scriptLoadedRef.current = false
        resolve() // 即使失败也 resolve，避免阻塞渲染
      }

      document.head.appendChild(script)
    })
  }, [])

  // 渲染 Turnstile widget
  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return

    // 移除已有的 widget
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current)
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onVerify(token)
        },
        'error-callback': (error: Error) => {
          onError?.(error)
        },
        'expired-callback': () => {
          onExpire?.()
        },
        theme,
        size,
      })
    } catch (err) {
      console.error('Turnstile render error:', err)
    }
  }, [siteKey, onVerify, onError, onExpire, theme, size])

  // 初始化和销毁
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      await loadTurnstileScript()
      if (!cancelled) {
        renderWidget()
      }
    }

    init()

    return () => {
      cancelled = true
      // 清理 widget
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // 忽略清理错误
        }
        widgetIdRef.current = ''
      }
    }
  }, [loadTurnstileScript, renderWidget])

  return <WidgetContainer ref={containerRef} />
}

export default TurnstileWidget