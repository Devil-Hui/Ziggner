/**
 * 设计令牌 (Design Tokens)
 * ─────────────────────────
 * 所有颜色、间距、字号、阴影、圆角等视觉变量集中管理。
 * 修改此文件 → 全局样式自动联动。
 * 遵循大厂 Design System 规范（参考 Material Design / Ant Design 体系）。
 */

// ── 颜色 ────────────────────────────────────────────
export const Color = {
  // 品牌色 (Ziggner Blue — 专业、可信赖的电商品牌色)
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

  // 文字 (WCAG AA 合规: body≥4.5:1, text.muted≥4.5:1)
  text: {
    primary: '#111827',
    heading: '#111827',
    body: '#374151',
    secondary: '#6b7280',
    muted: '#767676',     // 4.54:1 on #fff — meets WCAG AA
    inverse: '#fff',
    link: '#1a56db',
  },

  // 边框
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },

  // 状态
  status: {
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },

  // 交互
  focus: '#1a56db',       // focus ring color
} as const

// ── 间距 (8px 基准网格) ────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,               // 修复: 25→24, 对齐8px网格
  xxxl: 32,
  section: 40,
  page: 48,              // 修复: 用固定值替代 vh/vw
} as const

// ── 圆角 ────────────────────────────────────────────
export const Radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
  /** 输入框 */
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
  focus: '0 0 0 3px rgba(26, 86, 219, 0.25)',  // focus ring shadow
} as const

// ── 字号 ────────────────────────────────────────────
export const FontSize = {
  xs: 12,
  sm: 13,
  base: 14,             // 全局基准字号
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
} as const

// ── 动效 ────────────────────────────────────────────
export const Transition = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
} as const

// ── 焦点环 ───────────────────────────────────────────
// 全局使用: &:focus-visible { outline: none; box-shadow: ${FocusRing.style}; }
export const FocusRing = {
  style: `0 0 0 3px rgba(26, 86, 219, 0.25)`,
  offset: '2px',
} as const

// ── 相对单位（响应式弹性计算）─────────────────────────
// clamp(min, preferred, max)：preferred 随视口宽度线性缩放，保证任何屏幕平滑过渡。
export const FontClamp = {
  /** 正文：14px → 18px（视口 1.2% 动态） */
  body: 'clamp(14px, 1.2vw, 18px)',
  /** 标题：20px → 32px（视口 2.5% 动态） */
  heading: 'clamp(20px, 2.5vw, 32px)',
  /** 卡片文字：12px → 14px */
  card: 'clamp(12px, 1vw, 14px)',
  /** 价格数字：16px → 24px */
  price: 'clamp(16px, 1.5vw, 24px)',
  /** 辅助小字：12px → 13px */
  caption: 'clamp(12px, 0.9vw, 13px)',
} as const

/** 统一弹性间距：gap / padding 用 clamp(8px, 1vw, 16px) 系 */
export const FluidSpace = {
  gap: 'clamp(8px, 1vw, 16px)',
  pad: 'clamp(16px, 3vw, 32px)',
} as const

// ── 断点查询（与 Breakpoint 配套，突变式适配）─────────
export const MediaQuery = {
  /** 平板横屏及以上 */
  mdUp: `@media (min-width: 1024px)`,
  /** 平板竖屏及以上 */
  smUp: `@media (min-width: 768px)`,
  /** 手机（<480px） */
  xsDown: `@media (max-width: 479.98px)`,
  /** 手机 + 小平板（<768px，移动优先模板区隔） */
  mobileDown: `@media (max-width: 767.98px)`,
  /** 平板竖屏（768–1023） */
  mdDown: `@media (min-width: 768px) and (max-width: 1023.98px)`,
} as const

// ── 聚合导出 ───────────────────────────────────────────
// 兼容部分组件使用 import { tokens } from './tokens' 的模式
export const tokens = {
  Color,
  Spacing,
  Radius,
  Shadow,
  FontSize,
  FontWeight,
  Layout,
  Breakpoint,
  Transition,
  FocusRing,
} as const
