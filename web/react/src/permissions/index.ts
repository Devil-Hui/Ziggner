/**
 * permissions 统一出口（P0-4）
 */
export { PERMISSIONS, permissionLabel } from './registry'
export type { PermissionCode } from './registry'
export { can, canAny, canAll } from './can'
export type { PermissionContext } from './can'
export { inScope } from './scope'
export type { ResourceScope, ScopeConfig, ScopeContext } from './scope'
export { Can } from './PermissionGate'
export type { CanProps } from './PermissionGate'
