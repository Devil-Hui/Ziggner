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
// 设计蓝本：like 的「墨黑为主 + 红做点缀」双色结构。
//   ink    #0e1013  主色：导航 / 主按钮 / 标题 / Logo（高级感的来源）
//   brand  #fe2c55  强调色：eyebrow、正向数据、徽章点缀（禁止大面积铺色）
//   paper  #f6f7f8  区块底；line #e5e7ea 1px 细线构建层级（取代重阴影）
export const Color = {
  // 主色 (Ink)
  primary: '#0e1013',
  primaryHover: '#000000',
  /** 浅色底：选中态/悬浮底（中性，非品牌色染色） */
  primaryLight: '#f1f2f4',
  primaryDark: '#000000',

  // 品牌强调 (Brand Red) —— 仅用于点睛，勿作底色大面积使用
  brand: '#fe2c55',
  brandDeep: '#e51e46',
  brandSoft: '#ffeef1',

  // 辅助色
  /** 辅助信息蓝 */
  blue: '#2358d8',
  blueSoft: '#eaf0fd',
  /** 正向增长 / 成功绿 */
  pos: '#0d7f5c',
  posSoft: '#e8f5f0',

  // 背景
  bg: {
    page: '#f6f7f8',
    card: '#fff',
    sidebar: '#fff',
    header: '#fff',
    dark: '#0e1013',
    /** 卡片头 / 嵌套底 */
    sunken: '#fafbfb',
  },

  // 文字 (WCAG AA)
  text: {
    primary: '#0e1013',
    heading: '#0e1013',
    body: '#4b5158',
    secondary: '#4b5158',
    muted: '#7b828a',
    inverse: '#fff',
    link: '#0e1013',
  },

  // 边框
  border: {
    light: '#e5e7ea',
    medium: '#d3d7dd',
    dark: '#9aa1a9',
  },

  // 状态原始值（仅 Foundation 内部使用；对外请走 Semantic.status）
  status: {
    success: '#0d7f5c',
    warning: '#b45309',
    error: '#dc2626',
    info: '#2358d8',
  },

  // 交互
  focus: '#0e1013',
} as const

// ── 字体族 ────────────────────────────────────────────
// 不加载任何 webfont（storefront CSP 为 default-src 'self'，外链字体会被拦），
// 仅在本地已安装 Inter 时优先命中，否则优雅回退系统无衬线。
export const FontFamily = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif",
  display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const

/** 排版工具（like 的 tnum / tight / wide-caps 的 styled-components 版） */
export const Type = {
  /** 等宽数字：价格、统计值必用 */
  tnum: `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`,
  /** 常规负字距 */
  tight: `letter-spacing: -0.02em;`,
  /** 标题级负字距 */
  tighter: `letter-spacing: -0.035em;`,
  /** 小标签：大字距 + 全大写 */
  wideCaps: `letter-spacing: 0.14em; text-transform: uppercase;`,
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
  /** 大圆角卡片（like 量级 20px）—— C 端卡片统一取此值 */
  card: 20,
  /** 大容器（CTA 区 / 面板，24px） */
  panel: 24,
} as const

// ── 阴影（层级由 1px 细线承担，阴影只做极淡辅助）────────
export const Shadow = {
  /** 卡片静止态：几乎不可见，靠 border 建立边界 */
  card: '0 1px 2px rgba(14, 16, 19, 0.04)',
  /** 卡片 hover 上浮态 */
  cardHover: '0 4px 8px rgba(14, 16, 19, 0.06), 0 16px 40px rgba(14, 16, 19, 0.08)',
  md: '0 4px 12px rgba(14, 16, 19, 0.08)',
  lg: '0 8px 32px rgba(14, 16, 19, 0.12)',
  dropdown: '0 4px 12px rgba(14, 16, 19, 0.08)',
  modal: '0 8px 32px rgba(14, 16, 19, 0.12)',
  /** 浮层（手机框、悬浮卡） */
  float: '0 12px 32px rgba(14, 16, 19, 0.10), 0 24px 64px rgba(14, 16, 19, 0.12)',
  none: 'none',
  focus: '0 0 0 3px rgba(14, 16, 19, 0.25)',
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
  style: `0 0 0 3px rgba(14, 16, 19, 0.25)`,
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
export const Typography = { FontFamily, FontSize, FontWeight, FontClamp, Type } as const
export const Motion = { Transition, FocusRing } as const

export const Foundation = {
  Color,
  FontFamily,
  Type,
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
