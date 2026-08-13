import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens';
import { SecondaryBtn as CancelBtn, Input } from './ui';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  box-shadow: ${Shadow.dropdown};
  width: 420px;
  max-width: 90vw;
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${Spacing.xl}px ${Spacing.xxxl}px 0;
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
`;

const Body = styled.div`
  padding: ${Spacing.md}px ${Spacing.xxxl}px ${Spacing.lg}px;
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  line-height: 1.6;
`;

const Field = styled.div`
  margin-top: ${Spacing.sm}px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${Spacing.sm}px;
  padding: 0 ${Spacing.xxxl}px ${Spacing.xl}px;
`;

const ConfirmBtn = styled.button<{ $danger?: boolean }>`
  padding: 6px ${Spacing.lg}px;
  font-size: ${FontSize.sm}px;
  border: none;
  background: ${Color.primary};
  color: ${Color.text.inverse};
  border-radius: ${Radius.xs}px;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover {
    filter: brightness(0.95);
  }
`;

interface PromptDialogProps {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({
  title,
  message,
  placeholder,
  defaultValue = '',
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    inputRef.current?.focus();
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Header>{title}</Header>
        <Body>
          {message && <div style={{ marginBottom: Spacing.sm }}>{message}</div>}
          <Field>
            <Input
              ref={inputRef}
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(value);
              }}
            />
          </Field>
        </Body>
        <Footer>
          <CancelBtn onClick={onCancel}>{cancelLabel}</CancelBtn>
          <ConfirmBtn
            $danger={danger}
            onClick={() => onConfirm(value)}
          >
            {confirmLabel}
          </ConfirmBtn>
        </Footer>
      </Dialog>
    </Overlay>
  );
}
