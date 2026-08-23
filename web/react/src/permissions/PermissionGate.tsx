/**
 * <Can> — 权限指令组件（P0-4）
 * ───────────────────────────────────────────────────
 * 用法：
 *   <Can permission="product.delete" fallback={null}>
 *     <DeleteButton />
 *   </Can>
 * 超管隐式放行；非超管按当前管理员的有效权限码集合判定。
 * 前端隐藏只是 UX，后端必须二次鉴权。
 *
 * 注：文件名用 PermissionGate 而非 Can.tsx，规避 Windows 大小写文件系统
 * 与 can.ts 的冲突。
 */
import type { ReactNode } from 'react'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from './can'

export interface CanProps {
  permission: string
  fallback?: ReactNode
  children: ReactNode
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { isSuperAdmin, permissionCodes } = useAdminAuth()
  const ok = can(permission, { isSuperAdmin, grants: permissionCodes })
  return <>{ok ? children : fallback}</>
}
