/**
 * 设计令牌 (Design Tokens) — 统一出口（四层架构）
 * ───────────────────────────────────────────────────
 *  第一层 Foundation  → 原始变量（Color/Spacing/Radius/Shadow/Motion/ZIndex…）
 *  第二层 Semantic    → 语义变量（surface/text/border/interactive/status[6 tone]）
 *  第三层 Component   → 组件级 token（Button/Input/Table/Modal/Drawer/Tag/Pagination）
 *  第四层 Business    → 业务状态 → tone 映射（Product/Order/Coupon/Approval/Task）
 *
 * 历史具名导出（Color/Spacing/Radius/Shadow/FontSize/FontWeight/Layout/
 * Breakpoint/Transition/FocusRing/FontClamp/FluidSpace/MediaQuery）全部保留，向后兼容。
 * 修改此文件请优先改对应分层文件，再由本文件再导出。
 */

// 第一层：原始变量（含全部历史具名导出，向后兼容）
export * from './foundation'
// 第二层：语义变量
export * from './semantic'
// 第三层：组件级 token
export * from './component'
// 第四层：业务状态映射
export * from './business'

// ── 兼容性聚合（部分旧组件使用 import { tokens } from './tokens'） ──
import { Color, Spacing, Radius, Shadow, FontSize, FontWeight, Layout, Breakpoint, Transition, FocusRing } from './foundation'
import { Semantic } from './semantic'
import { Component } from './component'
import { Business } from './business'

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
  Semantic,
  Component,
  Business,
} as const
