import styled from 'styled-components';
import { useEffect } from 'react';
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens';
import { SecondaryBtn as CancelBtn } from './ui';

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
  width: 400px;
  max-width: 90vw;
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${Spacing.xl}px ${Spacing.xxxl}px 0;
  font-size: ${FontSize.lg}px;
  font-weight: ${600};
  color: ${Color.text.heading};
`;

const Body = styled.div`
  padding: ${Spacing.md}px ${Spacing.xxxl}px ${Spacing.xl}px;
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  line-height: 1.6;
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
  background: ${Color.status.error};
  color: ${Color.text.inverse};
  border-radius: ${Radius.xs}px;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover {
    background: #c0392b;
  }
`;

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Header>{title}</Header>
        <Body>{message}</Body>
        <Footer>
          <CancelBtn onClick={onCancel}>{cancelLabel}</CancelBtn>
          <ConfirmBtn $danger={danger} onClick={onConfirm}>
            {confirmLabel}
          </ConfirmBtn>
        </Footer>
      </Dialog>
    </Overlay>
  );
}