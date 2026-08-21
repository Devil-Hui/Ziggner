/**
 * DatePicker（日期/日期时间选择，受控/非受控）
 * ─────────────────────────
 * 基于原生 <input type="date|datetime-local"> 的统一封装：
 * - label + 必填星号 + 输入框 + 错误/提示文案（表单规范「标签在上、错误紧贴控件下方」）；
 * - focus 蓝色焦点环、错误红边框、disabled 置灰；
 * - 完全受控 value/onChange（string，YYYY-MM-DD 或 ISO datetime-local 格式）。
 */
import type { ReactNode, CSSProperties } from 'react'
import styled from 'styled-components'
import { Color, FontSize, FontWeight, Radius, Spacing, Transition } from '../../../theme/tokens'

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};

  .req {
    color: ${Color.status.error};
    margin-left: 2px;
  }
`

const Input = styled.input<{ $invalid?: boolean }>`
  height: 36px;
  padding: 0 10px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  border: 1px solid ${({ $invalid }) => ($invalid ? Color.status.error : Color.border.medium)};
  border-radius: ${Radius.input}px;
  box-sizing: border-box;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }

  &:disabled {
    background: ${Color.bg.page};
    color: ${Color.text.muted};
    cursor: not-allowed;
  }
`

const Error = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.status.error};
`

const Hint = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`

export interface DatePickerProps {
  label?: ReactNode
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** date | datetime-local */
  type?: 'date' | 'datetime-local'
  required?: boolean
  error?: string
  hint?: string
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  style?: CSSProperties
}

export default function DatePicker({
  label,
  value,
  defaultValue,
  onChange,
  type = 'date',
  required = false,
  error,
  hint,
  min,
  max,
  disabled,
  placeholder,
  className,
  style,
}: DatePickerProps) {
  const current = value !== undefined ? value : (defaultValue ?? '')
  return (
    <Field className={className} style={style}>
      {label && (
        <Label>
          {label}
          {required && <span className="req">*</span>}
        </Label>
      )}
      <Input
        type={type}
        value={current}
        min={min}
        max={max}
        disabled={disabled}
        placeholder={placeholder}
        $invalid={!!error}
        aria-invalid={!!error}
        onChange={e => onChange?.(e.target.value)}
      />
      {error && <Error role="alert">{error}</Error>}
      {hint && !error && <Hint>{hint}</Hint>}
    </Field>
  )
}
