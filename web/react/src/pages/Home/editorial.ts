/**
 * Design Tokens — Ziggner Landing
 * ─────────────────────────────────────────────────────────────
 * 三層結構（Primitive → Semantic → Component）：
 *   1. Primitive：`Palette` / `Scale` 原始值，不直接使用
 *   2. Semantic：`Ink` / `Font` / `Display` 語義別名，元件主要取用層
 *   3. Component：`Elevation` / `Radius` / `ui` 元件級語義
 *
 * 气质：明亮克制的高端 SaaS / Editorial Commerce（设计蓝本：like）。
 * 纯白与纸灰底交替分区、1px 细线（#e5e7ea）构建层级，
 * 墨黑（#0e1013）承担导航/主按钮/标题，品牌红（#fe2c55）仅作点睛强调，
 * 正向增长用绿（#0d7f5c），辅助信息用蓝（#2358d8）。禁止紫渐变与重投影。
 *
 * 注意：所有既有导出名（Ink / Font / Display / Label / Rhythm / Grid /
 * gridContainer / Ease / Motion / BP / mq）保持不变，仅替换取值，
 * 使所有现有 import 无需改动即可切换主题。
 */

/* ─────────────────────────────────────────────────────────────
 * 1. PRIMITIVE — 原始值，勿在元件中直接使用
 * ───────────────────────────────────────────────────────────── */
const Palette = {
  // 墨黑階（主色）
  ink: '#0E1013',
  inkBlack: '#000000',
  inkSoft: '#4B5158', // 次級正文
  inkFaint: '#7B828A', // 極弱註釋
  inkLine: '#E5E7EA', // 1px 分隔線
  inkLineStrong: '#D3D7DD', // hover 邊框
  inkPaper: '#F6F7F8', // 區塊底
  inkPaper2: '#FAFBFB', // 卡片頭 / 嵌套底
  white: '#FFFFFF',

  // 品牌紅（強調，僅點睛）
  brand: '#FE2C55',
  brandDeep: '#E51E46',
  brandSoft: '#FFEEF1',
  brandBorder: '#FFD9E1',

  // 功能色
  green500: '#0D7F5C', // 正向增長
  green50: '#E8F5F0',
  greenBorder: '#CFE9E0',
  blue500: '#2358D8', // 輔助信息
  blue50: '#EAF0FD',
  blueBorder: '#D5E1FA',
  amber500: '#B45309',
  rose500: '#E51E46',
  cyan500: '#0E7490',
} as const

/** 間距原始尺度（4px 基準） */
const Scale = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

/* ─────────────────────────────────────────────────────────────
 * 2. SEMANTIC — 語義別名，元件主要取用層
 * ───────────────────────────────────────────────────────────── */
export const Ink = {
  /** 主文字／深色標題（墨黑） */
  black: Palette.ink,
  /** 深色區塊背景（Closing 深色 CTA 區） */
  near: Palette.ink,
  /** 深色區塊 hairline */
  ruleDark: 'rgba(255,255,255,0.14)',
  /** 次級正文 */
  graphite: Palette.inkSoft,
  /** 極弱註釋 */
  faint: Palette.inkFaint,
  /** 卡片白 */
  paper: Palette.white,
  /** 紙灰區塊底 */
  paperAlt: Palette.inkPaper,
  /** 1px 分隔線 */
  rule: Palette.inkLine,
  /** 分隔線（同義別名） */
  ruleNeutral: Palette.inkLine,
  /** hover 邊框（較深） */
  ruleStrong: Palette.inkLineStrong,
  /** 卡片頭／嵌套淺底 */
  sunken: Palette.inkPaper2,
  /** 卡片頭／嵌套淺底（語義別名，對齊 like 的 paper-2） */
  paper2: Palette.inkPaper2,

  /* ── 品牌 ── */
  /** 品牌紅：強調／eyebrow／正向數據點綴（勿大面積鋪底） */
  brand: Palette.brand,
  /** 品牌紅 hover／深壓 */
  brandDeep: Palette.brandDeep,
  /** 品牌紅亮調（漸變端／次級元素） */
  brandLight: Palette.brand,
  /** 品牌紅徽章底 */
  brandSoft: Palette.brandSoft,
  /** 品牌紅徽章描邊 */
  brandBorder: Palette.brandBorder,
  /** 中性徽章底 */
  soft: Palette.inkPaper2,
  /** 中性徽章底（較深） */
  softDeep: Palette.inkPaper,

  /* ── 功能 ── */
  /** 正向增長綠 */
  up: Palette.green500,
  /** 正向增長綠底 */
  upSoft: Palette.green50,
  /** 正向增長綠描邊 */
  upBorder: Palette.greenBorder,
  /** 輔助信息藍 */
  blue: Palette.blue500,
  /** 輔助信息藍底 */
  blueSoft: Palette.blue50,
  /** 輔助信息藍描邊 */
  blueBorder: Palette.blueBorder,
  /** 冰藍（AI 智能體圖標輪替色） */
  cyan: Palette.cyan500,
  /** 琥珀（AI 智能體圖標輪替色） */
  amber: Palette.amber500,
  /** 玫紅（AI 智能體圖標輪替色） */
  rose: Palette.rose500,
  /** 紫（AI 智能體圖標輪替色） */
  purple: Palette.brand,
} as const

/* ── 字體 ────────────────────────────────────────────────── */
// 不引外鏈 webfont（storefront CSP default-src 'self' 會攔），
// 本地已裝 Inter 時優先命中，否則回退系統無襯線。
export const Font = {
  /** 標題 display */
  display: "'Inter', 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /** 正文 */
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  /** 小標籤 */
  mono: "'Inter', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const

/**
 * 排版工具（like 的 tnum / tight / wider / wide-caps 的 styled-components 版）
 * 用法：const Price = styled.span`${Type.tnum} ${Type.tighter}`
 */
export const Type = {
  /** 等寬數字：價格／統計值必用，防數字跳動 */
  tnum: `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`,
  /** 常規負字距 */
  tight: `letter-spacing: -0.02em;`,
  /** 標題級負字距（-0.035em） */
  tighter: `letter-spacing: -0.035em;`,
  /** 小標籤：0.14em 字距 + 全大寫 */
  wideCaps: `letter-spacing: 0.14em; text-transform: uppercase;`,
} as const

/**
 * Display 排版級距
 * 友好型 SaaS：標題仍具份量但不再極端（上限由 13rem 降至 5rem 量級），
 * 提升可讀性與資訊密度。
 */
export const Display = {
  /** Hero 主標題 */
  hero: 'clamp(2rem, 4vw, 3.5rem)',
  /** 章節巨型陳述 */
  giant: 'clamp(1.6rem, 3.4vw, 2.9rem)',
  /** 次級大標題 */
  large: 'clamp(1.4rem, 2.4vw, 2.2rem)',
  /** 數據數字 */
  figure: 'clamp(1.4rem, 2.4vw, 2rem)',
  /** 引用 */
  quote: 'clamp(1.05rem, 1.8vw, 1.5rem)',
} as const

/** 小標籤 */
export const Label = {
  size: '0.75rem',
  tracking: '0.04em',
  weight: 600,
} as const

/** 節奏：留白（較雜誌風收斂，提升密度） */
export const Rhythm = {
  /** 安靜章節 */
  quiet: 'clamp(2.5rem, 5vw, 4rem)',
  /** 標準章節 */
  section: 'clamp(2.25rem, 4.5vw, 3.5rem)',
  /** 密集章節 */
  dense: 'clamp(1.5rem, 3vw, 2.25rem)',
} as const

/* ─────────────────────────────────────────────────────────────
 * 3. COMPONENT — 元件級語義
 * ───────────────────────────────────────────────────────────── */

/** 圓角：大圓角是本次風格的核心特徵 */
export const Radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  full: '999px',
} as const

/**
 * 陰影：層級由 1px 細線承擔，陰影只做極淡中性輔助，杜絕紫調/重投影。
 */
export const Elevation = {
  /** 卡片靜止態：近乎不可見 */
  card: '0 1px 2px rgba(14,16,19,0.04)',
  /** 卡片 hover 態 */
  hover: '0 4px 8px rgba(14,16,19,0.06), 0 16px 40px rgba(14,16,19,0.08)',
  /** 浮層（懸浮卡、下拉） */
  float: '0 12px 32px rgba(14,16,19,0.10), 0 24px 64px rgba(14,16,19,0.12)',
  /** 品牌紅按鈕 */
  brand: '0 4px 14px rgba(254,44,85,0.26)',
  /** 墨黑按鈕 */
  ink: '0 4px 14px rgba(14,16,19,0.20)',
} as const

/**
 * 共用卡片樣式（Component token）
 * 統一白底 + 1px 細線 + 20px 大圓角 + 極淡中性投影，
 * 確保全站卡片觀感一致。
 */
export const cardSurface = `
  background: ${Ink.paper};
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.xl}px;
  box-shadow: ${Elevation.card};
`

/** hover 上浮動畫（搭配 cardSurface 使用） */
export const cardLift = `
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s cubic-bezier(0.22,1,0.36,1);
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${Elevation.hover};
  }
`

/** 章節容器：紙灰 → 白 漸變底（like 的分區手法） */
export const sectionSurface = `
  background: linear-gradient(180deg, ${Ink.paperAlt} 0%, ${Ink.paper} 100%);
`

/** 深色區塊（Closing CTA）：墨黑底 + 白色反色文字 */
export const darkSurface = `
  background: ${Ink.near};
  color: ${Ink.paper};
`

/* ── 12 欄網格 ───────────────────────────────────────────── */
export const Grid = {
  columns: 12,
  /** 頁面左右安全邊距 */
  margin: 'clamp(1.25rem, 4vw, 3rem)',
  maxWidth: '1240px',
} as const

export const gridContainer = `
  display: grid;
  grid-template-columns: repeat(${Grid.columns}, minmax(0, 1fr));
  column-gap: clamp(0.75rem, 1.6vw, 1.5rem);
  width: 100%;
  max-width: ${Grid.maxWidth};
  margin: 0 auto;
  padding-inline: ${Grid.margin};
`

/* ── 動效：輕快友好（位移更小、時長更短） ─────────────────── */
export const Ease = {
  /** 主力緩動 */
  cinema: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** 揭示 */
  reveal: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

export const Motion = {
  /** 緩慢影像縮放 */
  slowScale: '14s',
  reveal: '0.7s',
  micro: '0.3s',
} as const

/* ── 斷點 ────────────────────────────────────────────────── */
export const BP = {
  sm: '640px',
  md: '900px',
  lg: '1200px',
  xl: '1536px',
} as const

export const mq = {
  smUp: `@media (min-width: ${BP.sm})`,
  mdUp: `@media (min-width: ${BP.md})`,
  lgUp: `@media (min-width: ${BP.lg})`,
  xlUp: `@media (min-width: ${BP.xl})`,
  mdDown: `@media (max-width: ${BP.md})`,
  smDown: `@media (max-width: ${BP.sm})`,
} as const
