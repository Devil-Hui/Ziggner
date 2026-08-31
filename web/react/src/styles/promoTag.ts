import { css } from 'styled-components'

// ── 颜色常量 ──
// 对齐 like 色板：主标签墨黑（ink）、副标签品牌红（brand），
// 去掉原先的天蓝 + 黄，与全局主色/强调色同源。
export const PROMO_COLORS = {
  primary: '#0e1013',   // 墨黑（主色）
  secondary: '#fe2c55', // 品牌红（强调）
  text: '#fff',
  textSecondary: '#fff',
} as const

export type PromoTagType = 'primary' | 'secondary'

/**
 * 单个锦旗标签 (燕尾形) —— 底部 V 型切口
 * clip-path 切出底部向下的锐角 V 型
 */
export const promoPennantBase = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  padding: 8px 6px 12px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  word-break: break-all;
  /* 底部 V 型燕尾切口 */
  clip-path: polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%);
`

/**
 * 容器 —— 右上角绝对定位
 */
export const promoPennantContainer = css`
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 5;
  pointer-events: none;
`

/**
 * 蓝色主标签
 */
export const promoPennantPrimary = css`
  ${promoPennantBase}
  background: ${PROMO_COLORS.primary};
  color: ${PROMO_COLORS.text};
`

/**
 * 黄色副标签 —— 相对蓝色偏移层叠
 */
export const promoPennantSecondary = css`
  ${promoPennantBase}
  background: ${PROMO_COLORS.secondary};
  color: ${PROMO_COLORS.textSecondary};
  position: absolute;
  top: 0;
  right: 0;
  /* 相对蓝色标签向右下偏移，形成层叠效果 */
  transform: translate(6px, 2px);
`

// ── 兼容旧版 API ──

export const promoSingleTag = promoPennantBase
export const promoMultiTag = promoPennantContainer
export const promoPrimaryTag = promoPennantPrimary
export const promoSecondaryTag = promoPennantSecondary
export const promoTagContainer = promoPennantContainer