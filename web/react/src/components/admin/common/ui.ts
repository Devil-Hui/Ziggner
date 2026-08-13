/**
 * 管理后台通用 UI 原语（共享样式组件）
 * ───────────────────────────────────────────
 * 将各 admin 页面中高频重复声明的 styled-components 收敛到此处，
 * 统一走 design tokens，避免"每页一套按钮/输入框"导致的视觉漂移与维护负担。
 *
 * 采用方式（增量）：在页面中
 *   import { PrimaryBtn, DangerBtn, Input, ... } from '../../components/admin/common/ui'
 * 替换原本的本地 styled 定义即可，无需一次性重构全部页面。
 */

import styled, { keyframes } from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition, FocusRing } from '../../../theme/tokens'

/* ========== 按钮 ========== */
// 稳定抽象：所有按钮共用的"外观骨架"（圆角 / 光标 / 禁用态 / 过渡）。
// 变体仅声明自身差异（配色 / 尺寸 / hover），对扩展开放、对修改封闭（开闭原则）。
const BaseBtn = styled.button<{ $disabled?: boolean }>`
  box-sizing: border-box;
  border: none;
  border-radius: ${Radius.sm}px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition: background ${Transition.fast}, color ${Transition.fast}, border-color ${Transition.fast}, box-shadow ${Transition.fast};
`

// 品牌主操作（创建 / 新增 / 提交）— 实心蓝
export const PrimaryBtn = styled(BaseBtn)`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  background: ${Color.primary};
  color: ${Color.text.inverse};

  &:hover {
    background: ${Color.primaryHover};
    box-shadow: ${({ $disabled }) => ($disabled ? 'none' : Shadow.focus)};
  }
`

// 中性次操作（取消 / 返回）— 描边灰
export const SecondaryBtn = styled(BaseBtn)`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }
`

// 危险操作（删除 / 移除）— 红描边，hover 填充
export const DangerBtn = styled(BaseBtn)`
  padding: 2px 8px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${Color.status.error};
  background: ${Color.bg.card};
  color: ${Color.status.error};

  &:hover {
    background: ${({ $disabled }) => ($disabled ? 'transparent' : Color.status.error)};
    color: ${({ $disabled }) => ($disabled ? Color.status.error : Color.text.inverse)};
  }
`

// 行内肯定操作（如"添加成员"）— 蓝描边，hover 填充
export const OutlinePrimaryBtn = styled(BaseBtn)`
  padding: 4px 12px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${Color.primary};
  background: ${Color.bg.card};
  color: ${Color.primary};

  &:hover {
    background: ${({ $disabled }) => ($disabled ? 'transparent' : Color.primary)};
    color: ${({ $disabled }) => ($disabled ? Color.primary : Color.text.inverse)};
  }
`

/* ========== 表单控件 ========== */

export const Input = styled.input<{ $compact?: boolean }>`
  width: 100%;
  height: ${({ $compact }) => ($compact ? 32 : 38)}px;
  padding: 0 ${Spacing.sm}px;
  font-size: ${({ $compact }) => ($compact ? FontSize.sm : FontSize.base)}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: ${FocusRing.style};
  }

  &::placeholder {
    color: ${Color.text.muted};
  }
`

export const Select = styled.select`
  height: 32px;
  padding: 0 6px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  color: ${Color.text.body};
  box-sizing: border-box;
  background: ${Color.bg.card};
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: ${FocusRing.style};
  }
`

/* ========== 表单辅助 ========== */

export const FormGroup = styled.div`
  margin-bottom: ${Spacing.lg}px;
`

export const Label = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: 6px;
`

export const Hint = styled.span`
  display: block;
  margin-top: 4px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`

export const ErrorText = styled.span`
  display: block;
  margin-top: 4px;
  font-size: ${FontSize.xs}px;
  color: ${Color.status.error};
`

/* ========== 角色徽章 ========== */

export const RoleBadge = styled.span<{ $role: 'leader' | 'member' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${Radius.xs}px;
  font-size: ${FontSize.xs}px;
  font-weight: ${500};
  background: ${({ $role }) => ($role === 'leader' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(37, 99, 235, 0.12)')};
  color: ${({ $role }) => ($role === 'leader' ? Color.status.warning : Color.status.info)};
`

/* ========== Toast ========== */

const toastIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: ${Spacing.lg}px;
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)')};
  color: ${({ $type }) => ($type === 'success' ? Color.status.success : Color.status.error)};
  border: 1px solid ${({ $type }) => ($type === 'success' ? 'rgba(5, 150, 105, 0.25)' : 'rgba(220, 38, 38, 0.25)')};
  animation: ${toastIn} ${Transition.normal};
`
