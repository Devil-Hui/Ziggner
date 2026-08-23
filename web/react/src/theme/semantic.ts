/**
 * Semantic Tokens — 第二层（语义化、跨业务稳定）
 * ───────────────────────────────────────────────────
 * 所有"含义"类变量在此统一定义。状态体系收敛为 6 个 tone：
 *   neutral | info | success | warning | danger | purple
 * 业务页面只声明 tone（如 <StatusBadge tone="success">已上架</StatusBadge>），
 * 颜色由 Semantic.status[tone] 解析——业务状态可无限扩展，视觉始终稳定。
 */

import { Color, Spacing, FontSize } from './foundation'

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'

export const Semantic = {
  /** 表面：背景层级 */
  surface: {
    page: Color.bg.page,
    card: Color.bg.card,
    sidebar: Color.bg.sidebar,
    header: Color.bg.header,
    /** 凹陷/次级表面（如输入框禁用底、表格斑马纹） */
    sunken: '#f3f4f6',
    /** 浮层遮罩（Modal/Drawer 共用，统一模糊前的底色） */
    overlay: 'rgba(17, 24, 39, 0.45)',
  },

  /** 文字语义 */
  text: {
    primary: Color.text.primary,
    heading: Color.text.heading,
    body: Color.text.body,
    secondary: Color.text.secondary,
    muted: Color.text.muted,
    inverse: Color.text.inverse,
    link: Color.text.link,
  },

  /** 边框语义 */
  border: {
    light: Color.border.light,
    medium: Color.border.medium,
    dark: Color.border.dark,
    /** focus 态边框（输入/选择） */
    focus: Color.focus,
  },

  /** 交互语义（按钮/链接/可点击元素） */
  interactive: {
    default: Color.primary,
    hover: Color.primaryHover,
    active: Color.primaryDark,
    onPrimary: '#ffffff',
    disabledBg: '#f3f4f6',
    disabledFg: Color.border.dark,
  },

  /**
   * 状态语义：全站唯一的状态色事实源。
   * fg 取较深值保证在浅色 bg 上的 WCAG AA 对比度。
   */
  status: {
    success: { fg: '#059669', bg: '#ecfdf5' },
    warning: { fg: '#b45309', bg: '#fef3c7' },
    danger: { fg: '#dc2626', bg: '#fef2f2' },
    info: { fg: '#1d4ed8', bg: '#eff6ff' },
    neutral: { fg: '#4b5563', bg: '#f3f4f6' },
    purple: { fg: '#7c3aed', bg: '#f5f3ff' },
  },
} as const

/** tone → 前景色 */
export const statusToneFg = (t: StatusTone): string => Semantic.status[t].fg
/** tone → 背景色 */
export const statusToneBg = (t: StatusTone): string => Semantic.status[t].bg

export const SemanticSpacing = Spacing
export const SemanticFontSize = FontSize
