/**
 * Form / FormItem（表单容器与表单项）
 * ─────────────────────────
 * - Form：纵向 16px 间距容器（8px 网格对齐），可选 onSubmit（Enter 提交）；
 * - FormItem：label（默认上置；left 布局时 label 宽 120px 右对齐）+ 必填星号 +
 *   控件 + 错误文案（紧贴控件下方，红字）+ 提示文案；
 * - 错误通过 aria-describedby 关联控件（A11y）。
 */
import { createContext, useContext, useId, type ReactNode, type CSSProperties } from 'react'
import styled from 'styled-components'
import { Color, FontSize, FontWeight, Spacing } from '../../../theme/tokens'

const FormWrap = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.lg}px;
`

const ItemWrap = styled.div<{ $left: boolean; $labelWidth: number }>`
  display: flex;
  ${({ $left, $labelWidth }) =>
    $left
      ? `flex-direction: row; align-items: flex-start; gap: 12px;`
      : `flex-direction: column; gap: 6px;`}

  .form-label {
    flex-shrink: 0;
    ${({ $left, $labelWidth }) => ($left ? `width: ${$labelWidth}px; text-align: right; padding-top: 9px;` : '')}
  }

  .form-control {
    flex: 1;
    min-width: 0;
  }
`

const Label = styled.label`
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.medium};
  color: ${Color.text.secondary};
  line-height: 1.4;

  .req {
    color: ${Color.status.error};
    margin-left: 2px;
  }
`

const Error = styled.div`
  margin-top: 4px;
  font-size: ${FontSize.xs}px;
  color: ${Color.status.error};
`

const Hint = styled.div`
  margin-top: 4px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`

interface FormContextValue {
  /** 父级 Form 的表单 id，用于生成唯一 field id */
  formId: string
}

const FormContext = createContext<FormContextValue>({ formId: '' })

export interface FormProps {
  onSubmit?: () => void
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function Form({ onSubmit, children, className, style }: FormProps) {
  const formId = useId()
  return (
    <FormContext.Provider value={{ formId }}>
      <FormWrap
        className={className}
        style={style}
        onSubmit={e => {
          e.preventDefault()
          onSubmit?.()
        }}
      >
        {children}
      </FormWrap>
    </FormContext.Provider>
  )
}

export interface FormItemProps {
  label?: ReactNode
  required?: boolean
  error?: string
  hint?: string
  /** 标签位置：top（上置，默认）| left（左置，label 宽 120px 右对齐） */
  labelPlacement?: 'top' | 'left'
  labelWidth?: number
  /** 控件（必须） */
  children: ReactNode
  className?: string
}

export function FormItem({
  label,
  required = false,
  error,
  hint,
  labelPlacement = 'top',
  labelWidth = 120,
  children,
  className,
}: FormItemProps) {
  const { formId } = useContext(FormContext)
  const fieldId = `${formId}-field`
  const left = labelPlacement === 'left'

  return (
    <ItemWrap $left={left} $labelWidth={labelWidth} className={className}>
      {label && (
        <Label htmlFor={fieldId} className="form-label">
          {label}
          {required && <span className="req">*</span>}
        </Label>
      )}
      <div className="form-control">
        {children}
        {error && <Error role="alert" id={`${fieldId}-error`}>{error}</Error>}
        {hint && !error && <Hint>{hint}</Hint>}
      </div>
    </ItemWrap>
  )
}
