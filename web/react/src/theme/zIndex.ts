/**
 * Z 轴层级管理（全局唯一事实源）
 * ─────────────────────────────
 * 所有浮层禁止写死 z-index 数字，一律引用本文件。
 * 新增浮层时先在此登记层级，再使用。
 * 规则：modal > drawer（抽屉常与页面共存、不遮弹窗）；dropdown > modal（下拉浮在弹窗之上）；
 * toast / loading / reauth 最高层（全局反馈）。
 */
export const ZIndex = {
  /** 页面级吸附元素：Header / 上下文操作栏 / 表头等 */
  header: 900,
  /** 侧滑抽屉 / 辅助面板 */
  drawer: 1000,
  /** 模态弹窗（StepModal / ConfirmDialog / 表单弹窗） */
  modal: 1100,
  /** 下拉层：下拉菜单 / 通知下拉 / 全局搜索下拉 / Popconfirm / Tooltip */
  dropdown: 1200,
  /** 全局 Toast */
  toast: 1300,
  /** 全局 Loading 覆盖层 */
  loading: 1400,
  /** 会话重登（最高，强制打断） */
  reauth: 1500,
} as const

export type ZIndexKey = keyof typeof ZIndex
