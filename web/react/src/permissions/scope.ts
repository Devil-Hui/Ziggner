/**
 * 资源范围（Scope）— RBAC 第四维（P0-4 预留）
 * ───────────────────────────────────────────────────
 * User → Role → Permission → Resource → Scope。
 * Scope 决定"有这个权限，但只对哪些数据生效"：
 *   all      全部数据
 *   group    所属管理组
 *   category 所属分类（商品类）
 *   brand    指定品牌（商品类）
 * 目前由后端做最终数据过滤（本层仅提供类型与前端提示辅助）。
 */
export type ResourceScope = 'all' | 'group' | 'category' | 'brand'

export interface ScopeConfig {
  scope: ResourceScope
  /** scope='category' 时生效：允许的分类 id 列表（空=全部） */
  categoryIds?: number[]
  /** scope='brand' 时生效：允许的品牌 id 列表（空=全部） */
  brandIds?: number[]
}

export interface ScopeContext {
  scope: ResourceScope
  userGroupId?: number | null
  userCategoryIds?: number[]
  userBrandIds?: number[]
}

/**
 * 判断某条数据是否在管理员的资源范围内。
 * 默认（未配置 scope）视为 all；后端仍会做最终校验。
 */
export function inScope(data: ScopeConfig, ctx: ScopeContext): boolean {
  if (ctx.scope === 'all') return true
  if (ctx.scope === 'group') return ctx.userGroupId == null || true // 组内成员资格由后端判定
  if (ctx.scope === 'category') {
    if (!ctx.userCategoryIds || ctx.userCategoryIds.length === 0) return true
    return (data.categoryIds ?? []).some((id) => ctx.userCategoryIds!.includes(id))
  }
  if (ctx.scope === 'brand') {
    if (!ctx.userBrandIds || ctx.userBrandIds.length === 0) return true
    return (data.brandIds ?? []).some((id) => ctx.userBrandIds!.includes(id))
  }
  return true
}
