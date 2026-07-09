import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens';

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

const CancelBtn = styled.button`
  padding: 8px ${Spacing.xl}px;
  font-size: ${FontSize.base}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.xs}px;
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover {
    border-color: #bbb;
    color: ${Color.primaryHover};
  }
`;

const SubmitBtn = styled.button`
  padding: 8px ${Spacing.xl}px;
  font-size: ${FontSize.base}px;
  border: none;
  border-radius: ${Radius.xs}px;
  background: ${Color.status.error};
  color: ${Color.text.inverse};
  cursor: pointer;
  transition: background ${Transition.fast};

  &:hover {
    background: #c0392b;
  }
`;

interface FormDialogProps {
  open: boolean;
  title: string;
  submitLabel?: string;
  submitDisabled?: boolean;
  width?: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

export default function FormDialog({
  open,
  title,
  submitLabel = '提交',
  submitDisabled = false,
  width,
  onClose,
  onSubmit,
  children,
}: FormDialogProps) {
  if (!open) return null;

  return (
    <Overlay onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()} style={width ? { maxWidth: width } : undefined}>
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose}>&times;</CloseBtn>
        </Header>
        <Body>{children}</Body>
        <Footer>
          <CancelBtn onClick={onClose}>取消</CancelBtn>
          <SubmitBtn onClick={onSubmit} disabled={submitDisabled}>{submitLabel}</SubmitBtn>
        </Footer>
      </Dialog>
    </Overlay>
  );
}