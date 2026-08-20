/**
 * Switch（开关，受控/非受控双模式）
 */
import { useState } from 'react'
import styled from 'styled-components'
import { Color, Transition } from '../../../theme/tokens'

const Track = styled.button<{ $checked: boolean; $disabled: boolean; $size: 'sm' | 'md' }>`
  position: relative;
  width: ${({ $size }) => ($size === 'sm' ? 32 : 40)}px;
  height: ${({ $size }) => ($size === 'sm' ? 18 : 22)}px;
  border-radius: 999px;
  border: none;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  background: ${({ $checked }) => ($checked ? Color.primary : Color.border.medium)};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: background ${Transition.fast};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $checked, $size }) => ($checked ? ($size === 'sm' ? 16 : 22) : 2)}px;
    width: ${({ $size }) => ($size === 'sm' ? 14 : 18)}px;
    height: ${({ $size }) => ($size === 'sm' ? 14 : 18)}px;
    border-radius: 50%;
    background: #fff;
    transition: left ${Transition.fast};
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
`

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export default function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: SwitchProps) {
  const [inner, setInner] = useState(defaultChecked)
  const controlled = checkedProp !== undefined
  const checked = controlled ? !!checkedProp : inner

  const toggle = () => {
    if (disabled) return
    const next = !checked
    if (!controlled) setInner(next)
    onChange?.(next)
  }

  return (
    <Track
      type="button"
      role="switch"
      aria-checked={checked}
      $checked={checked}
      $disabled={disabled}
      $size={size}
      onClick={toggle}
      disabled={disabled}
      className={className}
    />
  )
}
