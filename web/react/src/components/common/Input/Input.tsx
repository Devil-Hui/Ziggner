import styled from 'styled-components'
import { Color, Radius, FontSize, Spacing } from '../../../theme/tokens'

interface InputProps {
  type?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  required?: boolean
  label?: string
  error?: string
  helperText?: string
}

const Label = styled.label`
  display: block;
  margin-bottom: ${Spacing.sm}px;
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.body};
`

const InputBase = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: ${Spacing.sm}px ${Spacing.md}px;
  border: 1px solid ${({ $hasError }) => $hasError ? Color.status.error : Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.base}px;
  outline: none;
  background: ${Color.bg.card};
  color: ${Color.text.body};
  transition: border-color 0.2s ease;

  &:focus-visible {
    border-color: ${Color.focus};
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);
  }

  &::placeholder {
    color: ${Color.text.muted};
  }

  &:disabled {
    background: ${Color.primaryLight};
    color: ${Color.text.muted};
    cursor: not-allowed;
  }
`

const ErrorText = styled.span`
  display: block;
  margin-top: ${Spacing.xs}px;
  font-size: ${FontSize.xs}px;
  color: ${Color.status.error};
`

const HelperText = styled.span`
  display: block;
  margin-top: ${Spacing.xs}px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`

export default function Input({ type = 'text', placeholder, value, onChange, disabled, required, label, error, helperText }: InputProps) {
  return (
    <div>
      {label && <Label>{label}{required && ' *'}</Label>}
      <InputBase
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        $hasError={!!error}
        {...{ 'aria-label': label || placeholder }}
        {...(error ? { 'aria-invalid': true, 'aria-describedby': `${label}-error` } : {})}
      />
      {error && <ErrorText id={`${label}-error`} role="alert">{error}</ErrorText>}
      {helperText && !error && <HelperText>{helperText}</HelperText>}
    </div>
  )
}