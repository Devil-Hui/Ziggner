/**
 * Z 轴层级管理（全局唯一事实源）
 * ─────────────────────────────
 * 验收基线（admin-ui-inventory.md 五层验收·第一层）要求与 zIndex.ts 严格一致：
 *   header:50 / sidebar:100 / dropdown:200 / drawer:700 / modal:1100 / toast:1200
 * 追加（高于 toast 的全局层）：loading:1400 / reauth:1500。
 * 所有浮层禁止写死 z-index 数字，一律引用本文件；新增浮层先在此登记。
 */
export const ZIndex = {
  /** 页面级吸附：Header / 上下文操作栏 / 表头等 */
  header: 50,
  /** 侧边导航 */
  sidebar: 100,
  /** 下拉层：下拉菜单 / 通知下拉 / 全局搜索下拉 / Popconfirm / Tooltip */
  dropdown: 200,
  /** 侧滑抽屉 / 辅助面板（低于 modal：抽屉不遮弹窗） */
  drawer: 700,
  /** 模态弹窗（StepModal / ConfirmDialog / 表单弹窗） */
  modal: 1100,
  /** 全局 Toast */
  toast: 1200,
  /** 全局 Loading 覆盖层 */
  loading: 1400,
  /** 会话重登（最高，强制打断） */
  reauth: 1500,
} as const

export type ZIndexKey = keyof typeof ZIndex
