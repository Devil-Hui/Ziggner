import { useRef, type ReactNode } from 'react'

// 蜜罐（Honeypot）反爬/反垃圾措施：
// - 该输入框对人类完全不可见、不可聚焦（绝对定位移出视口 + 透明 + 禁指针事件）。
// - 自动化爬虫/填表机器人通常会无差别地填充页面上所有 input，从而触发蜜罐。
// - 提交时若蜜罐字段非空，判定为机器人：静默丢弃（不报错、不创建账户/会话），
//   避免给机器人任何反馈，同时不打扰真实用户。
export function useHoneypot(name: string = 'website_url') {
  const ref = useRef<HTMLInputElement>(null)

  const isBot = (): boolean => (ref.current?.value.trim().length ?? 0) > 0

  const field: ReactNode = (
    <input
      ref={ref}
      type="text"
      name={name}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      // display:none 会被部分爬虫刻意跳过，故用绝对定位+透明，仍保留在可访问 DOM 中
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
        border: 0,
        padding: 0,
        margin: 0,
        resize: 'none',
      }}
    />
  )

  return { field, isBot }
}
