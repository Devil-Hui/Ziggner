/**
 * Radio（单选组，受控/非受控双模式）
 * ─────────────────────────
 * - 受控：value + onChange；非受控：defaultValue；
 * - 横向 inline 或纵向 stacked；选中主蓝、focus 焦点环、disabled 置灰。
 */
import { useState } from 'react'
import styled from 'styled-components'
import { Color, FontSize, Radius, Transition } from '../../../theme/tokens'

export interface RadioOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface RadioProps {
  options: RadioOption[]
  value?: string | number
  defaultValue?: string | number
  onChange?: (value: string) => void
  disabled?: boolean
  /** 横向排列（默认 true） */
  inline?: boolean
  className?: string
}

const Wrap = styled.div<{ $inline: boolean }>`
  display: flex;
  ${({ $inline }) => ($inline ? 'flex-direction: row; gap: 16px; align-items: center;' : 'flex-direction: column; gap: 10px;')}
`

const Label = styled.label<{ $checked: boolean; $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: ${FontSize.sm}px;
  color: ${({ $disabled }) => ($disabled ? Color.text.muted : Color.text.body)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  user-select: none;

  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid ${({ $checked, $disabled }) => ($disabled ? Color.border.medium : $checked ? Color.primary : Color.border.dark)};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex-shrink: 0;
    transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};
  }

  .dot::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${Color.primary};
    transform: ${({ $checked }) => ($checked ? 'scale(1)' : 'scale(0)')};
    transition: transform ${Transition.fast};
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &:focus-within .dot {
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }
`

export default function Radio({
  options,
  value,
  defaultValue,
  onChange,
  disabled = false,
  inline = true,
  className,
}: RadioProps) {
  const [inner, setInner] = useState<string | number>(defaultValue ?? '')
  const controlled = value !== undefined
  const current = controlled ? value : inner

  return (
    <Wrap $inline={inline} className={className} role="radiogroup">
      {options.map(opt => {
        const checked = String(current) === String(opt.value)
        return (
          <Label key={opt.value} $checked={checked} $disabled={disabled || !!opt.disabled}>
            <input
              type="radio"
              name={`radio-${opt.value}`}
              checked={checked}
              disabled={disabled || opt.disabled}
              onChange={() => {
                const v = String(opt.value)
                if (!controlled) setInner(opt.value)
                onChange?.(v)
              }}
            />
            <span className="dot" />
            {opt.label}
          </Label>
        )
      })}
    </Wrap>
  )
}
