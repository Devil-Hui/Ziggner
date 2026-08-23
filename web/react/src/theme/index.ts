/**
 * 设计令牌 —— 统一导出入口
 * 使用方式: import { Color, Spacing, Shadow, Radius, FontSize, Layout } from '@/theme'
 */

export {
  Color,
  Spacing,
  Radius,
  Shadow,
  FontSize,
  FontWeight,
  Layout,
  Breakpoint,
  Transition,
  // 四层设计系统
  Foundation,
  Semantic,
  Component,
  Business,
  tokens,
  statusToneFg,
  statusToneBg,
} from './tokens'
export type { StatusTone } from './tokens'
export { GlobalStyles } from './global'