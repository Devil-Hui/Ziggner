/**
 * 权限判定（P0-4 RBAC 前端契约）
 * ───────────────────────────────────────────────────
 * can()：超管隐式全量；否则在 grants 集合中查找。
 * canAny / canAll：批量判定。
 * 注意：前端隐藏只是 UX，真正安全由后端授权保证。
 */
export interface PermissionContext {
  /** 超管隐式拥有全部权限 */
  isSuperAdmin: boolean
  /** 当前管理员的有效权限码集合 */
  grants?: ReadonlySet<string> | string[]
}

function toSet(grants: ReadonlySet<string> | string[] | undefined): ReadonlySet<string> {
  if (!grants) return new Set<string>()
  return grants instanceof Set ? grants : new Set(grants)
}

export function can(code: string, ctx: PermissionContext): boolean {
  if (ctx.isSuperAdmin) return true
  return toSet(ctx.grants).has(code)
}

export function canAny(codes: string[], ctx: PermissionContext): boolean {
  return codes.some((c) => can(c, ctx))
}

export function canAll(codes: string[], ctx: PermissionContext): boolean {
  return codes.every((c) => can(c, ctx))
}
