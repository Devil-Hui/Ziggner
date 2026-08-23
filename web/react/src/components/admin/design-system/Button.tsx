/**
 * Button — 统一按钮（5 变体 × 3 尺寸）
 * ───────────────────────────────────────────────────
 * 变体：primary / secondary / ghost / danger / text
 * 尺寸：sm(30) / md(36) / lg(40)，圆角统一 6px，全部取 Component.Button token。
 * 不再有 RowBtn / ActionBtn / CreateButton 等散落变体。
 */
import styled from 'styled-components'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Component } from '@/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text'
export type ButtonSize = 'sm' | 'md' | 'lg'

const StyledButton = styled.button<{
  $variant: ButtonVariant
  $size: ButtonSize
  $block: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  height: ${({ $size }) => Component.Button.height[$size]}px;
  padding: 0 ${({ $size }) => Component.Button.paddingX[$size]}px;
  border-radius: ${Component.Button.radius}px;
  font-size: ${({ $size }) => Component.Button.fontSizes[$size]}px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
  transition: background ${'0.15s ease'}, border-color ${'0.15s ease'}, color ${'0.15s ease'};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};

  ${({ $variant }) => {
    const v = Component.Button.variants[$variant]
    return `
      background: ${v.bg};
      color: ${v.fg};
      ${'border' in v ? `border-color: ${v.border};` : ''}
      &:hover:not(:disabled) { background: ${v.hoverBg}; }
    `
  }}

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }

  &:disabled {
    opacity: ${Component.Button.disabledOpacity};
    cursor: not-allowed;
  }
`

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  children,
  ...rest
}: ButtonProps) {
  return (
    <StyledButton $variant={variant} $size={size} $block={block} {...rest}>
      {children}
    </StyledButton>
  )
}
