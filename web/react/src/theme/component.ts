/**
 * Component Tokens — 第三层（组件级语义）
 * ───────────────────────────────────────────────────
 * 每个基础组件一套 token，供 components/admin/design-system 内部引用。
 * 组件内禁止再写死颜色/尺寸，一律取本层或 Semantic 层。
 */

import { Semantic } from './semantic'
import { Color, Radius, Spacing, FontSize, Shadow } from './foundation'
import { ZIndex } from './zIndex'

export const Component = {
  /** 按钮：统一主/次/ghost/danger/text 五变体 + 三尺寸 */
  Button: {
    height: { sm: 30, md: 36, lg: 40 },
    paddingX: { sm: 12, md: 16, lg: 20 },
    radius: Radius.input, // 6px
    fontSizes: { sm: FontSize.xs, md: FontSize.sm, lg: FontSize.base },
    variants: {
      primary: { bg: Semantic.interactive.default, fg: Semantic.interactive.onPrimary, hoverBg: Semantic.interactive.hover },
      secondary: { bg: Semantic.interactive.onPrimary, fg: Semantic.interactive.default, border: Semantic.border.medium, hoverBg: '#f8fafc' },
      ghost: { bg: 'transparent', fg: Semantic.text.body, hoverBg: Semantic.surface.sunken },
      danger: { bg: Semantic.status.danger.fg, fg: '#ffffff', hoverBg: '#b91c1c' },
      text: { bg: 'transparent', fg: Semantic.interactive.default, hoverBg: Color.primaryLight },
    },
    disabledOpacity: 0.5,
  },

  /** 输入框 */
  Input: {
    height: 36,
    paddingX: 12,
    radius: Radius.input,
    border: Semantic.border.medium,
    borderFocus: Semantic.border.focus,
    bg: '#ffffff',
    errorBorder: Semantic.status.danger.fg,
  },

  /** 数据表格（SmartDataTable 基础） */
  Table: {
    headerBg: '#f9fafb',
    headerFg: Semantic.text.secondary,
    headerFontSize: FontSize.xs, // 11–12px 大写表头
    rowFg: Semantic.text.body,
    rowHoverBg: '#f8fafc',
    border: 'rgba(17, 24, 39, 0.08)',
    selectedBg: Color.primaryLight,
    stickyHeaderShadow: Shadow.card,
    radius: Radius.md,
    /** 三档密度行高 */
    density: { compact: 36, normal: 48, comfortable: 56 },
    fontSize: FontSize.sm,
    checkboxSize: 16,
  },

  /** 模态弹窗 */
  Modal: {
    radius: Radius.lg, // 12px
    overlayBg: Semantic.surface.overlay,
    maxWidth: { sm: 400, md: 560, lg: 720, xl: 960 },
    padding: Spacing.xl,
    headerFg: Semantic.text.heading,
    zIndex: ZIndex.modal,
    /** 默认点击遮罩不关闭（防误触丢草稿，已在优惠券页验证） */
    closeOnOverlayDefault: false,
  },

  /** 侧滑抽屉 */
  Drawer: {
    width: { sm: 360, md: 440, lg: 560 },
    radius: Radius.lg,
    overlayBg: Semantic.surface.overlay,
    zIndex: ZIndex.drawer,
  },

  /** 标签 / 状态药丸 */
  Tag: {
    radius: 999, // pill
    height: 22,
    fontSizes: { sm: FontSize.xs, md: FontSize.sm },
    /** 直接引用语义状态色，保持与 StatusBadge 一致 */
    tones: Semantic.status,
  },

  /**
   * 分页：当前页用品牌蓝，绝不用 danger 红。
   * 红色只表达 删除/错误/危险/失败。
   */
  Pagination: {
    activeBg: Semantic.interactive.default, // #1a56db
    activeFg: '#ffffff',
    hoverBg: Color.primaryLight, // #dbeafe
    disabledFg: Semantic.border.dark, // #9ca3af
    radius: Radius.sm,
  },
} as const
