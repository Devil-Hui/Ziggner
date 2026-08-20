/**
 * Select（下拉选择，受控/非受控；基于原生 select 保证可访问性与零依赖）
 */
import { useState, type ReactNode, type CSSProperties } from 'react'
import styled from 'styled-components'
import { Color, FontSize, Radius, Spacing, Transition } from '../../../theme/tokens'

const StyledSelect = styled.select<{ $invalid?: boolean }>`
  height: 32px;
  padding: 0 28px 0 10px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  border: 1px solid ${({ $invalid }) => ($invalid ? Color.status.error : Color.border.medium)};
  border-radius: ${Radius.input}px;
  box-sizing: border-box;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }

  &:disabled {
    background-color: ${Color.bg.page};
    color: ${Color.text.muted};
    cursor: not-allowed;
  }
`

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface SelectProps {
  value?: string | number
  defaultValue?: string | number
  onChange?: (value: string) => void
  options?: SelectOption[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export default function Select({
  value,
  defaultValue,
  onChange,
  options,
  placeholder,
  disabled,
  invalid,
  className,
  style,
  children,
}: SelectProps) {
  const [inner, setInner] = useState<string | number>(defaultValue ?? '')
  const controlled = value !== undefined
  const current = controlled ? value : inner

  return (
    <StyledSelect
      $invalid={invalid}
      className={className}
      style={style}
      disabled={disabled}
      value={String(current)}
      onChange={e => {
        const v = e.target.value
        if (!controlled) setInner(v)
        onChange?.(v)
      }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map(opt => (
        <option key={opt.value} value={String(opt.value)} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
      {children}
    </StyledSelect>
  )
}
