/**
 * Foundation Tokens — 第一层（原始设计变量 / 原材料）
 * ───────────────────────────────────────────────────
 * 颜色调色板、字体比例、间距网格、圆角、阴影、动效、Z 轴、断点。
 * 这是"不可直接用于业务语义"的底层原材料；业务/组件层应通过 Semantic 层取色，
 * 严禁在页面里直接写品牌十六进制（否则会出现商品 #047857 / 活动 #28a745 这类发散）。
 *
 * 历史具名导出（Color/Spacing/Radius/Shadow/FontSize/...）全部保留，供旧文件向后兼容。
 */

import { ZIndex } from './zIndex'

// ── 颜色（原始调色板）─────────────────────────────────
export const Color = {
  // 品牌色 (Ziggner Blue)
  primary: '#1a56db',
  primaryHover: '#1e40af',
  primaryLight: '#dbeafe',
  primaryDark: '#1e3a8a',

  // 背景
  bg: {
    page: '#f8f9fa',
    card: '#fff',
    sidebar: '#fff',
    header: '#fff',
    dark: '#1a1a1a',
  },

  // 文字 (WCAG AA)
  text: {
    primary: '#111827',
    heading: '#111827',
    body: '#374151',
    secondary: '#6b7280',
    muted: '#767676',
    inverse: '#fff',
    link: '#1a56db',
  },

  // 边框
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },

  // 状态原始值（仅 Foundation 内部使用；对外请走 Semantic.status）
  status: {
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },

  // 交互
  focus: '#1a56db',
} as const

// ── 间距（8px 基准网格）──────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
  page: 48,
} as const

// ── 圆角（统一为 input/button 6 · card 8 · modal 12 · pill 999）────────
export const Radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
  /** 输入框 / 按钮 */
  input: 6,
  /** 搜索框（胶囊） */
  search: 20,
} as const

// ── 阴影（统一三级，其余禁止）────────────────────────
export const Shadow = {
  card: '0 1px 3px rgba(0, 0, 0, 0.06)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.12)',
  dropdown: '0 4px 12px rgba(0, 0, 0, 0.08)',
  modal: '0 8px 32px rgba(0, 0, 0, 0.12)',
  none: 'none',
  focus: '0 0 0 3px rgba(26, 86, 219, 0.25)',
} as const

// ── 字号 ────────────────────────────────────────────
export const FontSize = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  heading: 28,
  hero: 36,
} as const

// ── 字重 ────────────────────────────────────────────
export const FontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

// ── 布局 ────────────────────────────────────────────
export const Layout = {
  headerHeight: 80,
  maxContentWidth: 1000,
  sidebarWidth: 260,
  navLeftMargin: 'calc(7vw + 120px)',
} as const

// ── 断点 ────────────────────────────────────────────
export const Breakpoint = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  /** 响应式断点（Admin 后台策略用） */
  desktopXL: 1440,
  tabletLandscape: 1200,
  tabletPortrait: 992,
} as const

// ── 动效 ────────────────────────────────────────────
export const Transition = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
} as const

// ── 焦点环 ───────────────────────────────────────────
export const FocusRing = {
  style: `0 0 0 3px rgba(26, 86, 219, 0.25)`,
  offset: '2px',
} as const

// ── 相对单位 ─────────────────────────────────────────
export const FontClamp = {
  body: 'clamp(14px, 1.2vw, 18px)',
  heading: 'clamp(20px, 2.5vw, 32px)',
  card: 'clamp(12px, 1vw, 14px)',
  price: 'clamp(16px, 1.5vw, 24px)',
  caption: 'clamp(12px, 0.9vw, 13px)',
} as const

export const FluidSpace = {
  gap: 'clamp(8px, 1vw, 16px)',
  pad: 'clamp(16px, 3vw, 32px)',
} as const

// ── 断点查询 ─────────────────────────────────────────
export const MediaQuery = {
  mdUp: `@media (min-width: 1024px)`,
  smUp: `@media (min-width: 768px)`,
  xsDown: `@media (max-width: 479.98px)`,
  mobileDown: `@media (max-width: 767.98px)`,
  mdDown: `@media (min-width: 768px) and (max-width: 1023.98px)`,
  /** Admin 后台：桌面扩展（≥1440） */
  desktopXLUp: `@media (min-width: 1440px)`,
  /** Admin 后台：平板横屏（1200–1439） */
  tabletLandscape: `@media (min-width: 1200px) and (max-width: 1439.98px)`,
  /** Admin 后台：平板竖屏（768–991） */
  tabletPortraitDown: `@media (max-width: 991.98px)`,
} as const

// ── 聚合（供 Foundation 命名空间引用）─────────────────
export const Typography = { FontSize, FontWeight, FontClamp } as const
export const Motion = { Transition, FocusRing } as const

export const Foundation = {
  Color,
  Typography,
  Spacing,
  Radius,
  Shadow,
  Motion,
  ZIndex,
  Breakpoint,
  Layout,
  FluidSpace,
  MediaQuery,
} as const
