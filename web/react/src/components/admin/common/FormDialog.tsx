import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens';
import { SecondaryBtn as CancelBtn } from './ui';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: ${Spacing.xxxl}px;
`;

const Dialog = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  box-shadow: ${Shadow.dropdown};
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${Spacing.xl}px ${Spacing.xxxl}px;
  border-bottom: 1px solid ${Color.border.light};
`;

const Title = styled.h2`
  font-size: ${FontSize.lg}px;
  font-weight: ${600};
  color: ${Color.text.heading};
  margin: 0;
`;

const CloseBtn = styled.button`
  width: ${Spacing.xxxl}px;
  height: ${Spacing.xxxl}px;
  border: none;
  background: none;
  font-size: ${FontSize.xl}px;
  color: ${Color.text.muted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${Radius.xs}px;
  transition: all ${Transition.fast};

  &:hover {
    background: ${Color.primaryLight};
    color: ${Color.primaryHover};
  }
`;

const Body = styled.div`
  padding: ${Spacing.xxxl}px;
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${Spacing.sm}px;
  padding: ${Spacing.lg}px ${Spacing.xxxl}px;
  border-top: 1px solid ${Color.border.light};
`;

const SubmitBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 8px ${Spacing.xl}px;
  font-size: ${FontSize.base}px;
  border: none;
  border-radius: ${Radius.xs}px;
  background: ${({ $variant }) => ($variant === 'primary' ? Color.primary : Color.status.error)};
  color: ${Color.text.inverse};
  cursor: pointer;
  transition: background ${Transition.fast};

  &:hover {
    background: ${({ $variant }) => ($variant === 'primary' ? Color.primaryHover : '#c0392b')};
  }
`;

interface FormDialogProps {
  open: boolean;
  title: string;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitVariant?: 'primary' | 'danger';
  cancelLabel?: string;
  width?: string;
  /** 点击遮罩（弹窗外区域）是否关闭。默认 false：防误触丢失已填内容（用户可用 X/取消按钮关闭） */
  closeOnOverlayClick?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

export default function FormDialog({
  open,
  title,
  submitLabel = '提交',
  submitDisabled = false,
  submitVariant = 'danger',
  cancelLabel = '取消',
  width,
  closeOnOverlayClick = false,
  onClose,
  onSubmit,
  children,
}: FormDialogProps) {
  if (!open) return null;

  return (
    <Overlay onClick={closeOnOverlayClick ? onClose : undefined}>
      <Dialog onClick={(e) => e.stopPropagation()} style={width ? { maxWidth: width } : undefined}>
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose}>&times;</CloseBtn>
        </Header>
        <Body>{children}</Body>
        <Footer>
          <CancelBtn onClick={onClose}>{cancelLabel}</CancelBtn>
          <SubmitBtn $variant={submitVariant} onClick={onSubmit} disabled={submitDisabled}>{submitLabel}</SubmitBtn>
        </Footer>
      </Dialog>
    </Overlay>
  );
}