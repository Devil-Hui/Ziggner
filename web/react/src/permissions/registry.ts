/**
 * 权限码注册表（P0-4 RBAC 前端契约）
 * ───────────────────────────────────────────────────
 * 与后端 RBAC 矩阵的 permission code 一一对应（约定 <domain>.<action>）。
 * 业务页面只引用这里的常量，禁止拼字符串。
 * 说明：前端隐藏只是 UX；真正安全由后端鉴权保证（本层仅控制按钮/入口显隐）。
 */
export const PERMISSIONS = {
  // 商品
  'product.view': '查看商品',
  'product.create': '新建商品',
  'product.edit': '编辑商品',
  'product.delete': '删除商品',
  'product.audit': '审核商品',
  'product.publish': '上架/下架商品',
  // 分类/品牌/标签
  'category.manage': '管理分类',
  'brand.manage': '管理品牌',
  'tag.manage': '管理标签',
  // 订单/售后
  'order.view': '查看订单',
  'order.ship': '订单发货',
  'order.refund': '处理售后',
  // 营销
  'coupon.view': '查看优惠券',
  'coupon.create': '创建优惠券',
  'coupon.edit': '编辑优惠券',
  'coupon.audit': '审核优惠券',
  'promo.create': '生成推广码',
  'activity.create': '创建活动',
  'activity.edit': '编辑活动',
  // 运营
  'chat.answer': '客服回复',
  'chat.assign': '客服转交',
  'notification.manage': '管理通知',
  'application.audit': '审核申请',
  // 系统
  'rbac.manage': '管理权限',
  'audit.view': '查看审计日志',
  'task.view': '查看异步任务',
  'email.manage': '管理邮件模板',
} as const

export type PermissionCode = keyof typeof PERMISSIONS

/** 权限码 → 中文标签（权限管理页下拉/勾选展示用） */
export const permissionLabel = (code: string): string =>
  (PERMISSIONS as Record<string, string>)[code] ?? code
