/** ProductKindToggle 样式 — 实体/虚拟商品 Toggle Switch */
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, Transition } from '../../../../theme/tokens'

export const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.md}px;
`

export const Switch = styled.button<{ $isVirtual: boolean }>`
  position: relative;
  width: 56px;
  height: 28px;
  border: none;
  border-radius: ${Radius.full}px;
  background: ${(p) => (p.$isVirtual ? Color.status.info : Color.primary)};
  cursor: pointer;
  padding: 0;
  transition: background ${Transition.normal};
  flex-shrink: 0;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }
`

export const Knob = styled.span<{ $isVirtual: boolean }>`
  position: absolute;
  top: 3px;
  left: ${(p) => (p.$isVirtual ? '31px' : '3px')};
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: left ${Transition.normal};
`

export const Label = styled.span<{ $active: boolean }>`
  font-size: ${FontSize.sm}px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  color: ${(p) => (p.$active ? Color.text.heading : Color.text.secondary)};
  cursor: pointer;
  user-select: none;
  transition: color ${Transition.fast};
`

export const Hint = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin-left: ${Spacing.xs}px;
`
