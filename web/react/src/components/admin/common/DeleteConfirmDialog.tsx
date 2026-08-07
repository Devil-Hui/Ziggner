import React from 'react';
import styled from 'styled-components';
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: ${Spacing.xxxl}px;
`;

const DialogCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  width: 100%;
  max-width: 420px;
  box-shadow: ${Shadow.modal};
`;

const Header = styled.div`
  padding: ${Spacing.xxxl}px ${Spacing.xxxl}px 0;
`;

const Title = styled.h2`
  font-size: ${FontSize.xl}px;
  font-weight: ${600};
  color: ${Color.text.heading};
  margin: 0;
`;

const Body = styled.div`
  padding: ${Spacing.lg}px ${Spacing.xxxl}px ${Spacing.xxxl}px;
  font-size: ${FontSize.base}px;
  color: ${Color.text.body};
  line-height: 1.6;
`;

const Highlight = styled.span`
  font-weight: ${600};
  color: ${Color.status.error};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${Spacing.md}px;
  padding: 0 ${Spacing.xxxl}px ${Spacing.xxxl}px;
`;

const CancelBtn = styled.button`
  padding: 10px ${Spacing.xl}px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  background: ${Color.bg.card};
  color: ${Color.text.body};
  font-size: ${FontSize.base}px;
  cursor: pointer;
  transition: background ${Transition.normal};

  &:hover {
    background: ${Color.primaryLight};
  }
`;

const ConfirmBtn = styled.button<{ $loading?: boolean }>`
  padding: 10px ${Spacing.xl}px;
  border: none;
  border-radius: ${Radius.md}px;
  background: ${({ $loading }) => ($loading ? '#f5b7b1' : Color.status.error)};
  color: ${Color.text.inverse};
  font-size: ${FontSize.base}px;
  font-weight: ${500};
  cursor: ${({ $loading }) => ($loading ? 'not-allowed' : 'pointer')};
  transition: background ${Transition.normal};

  &:hover {
    background: ${({ $loading }) => ($loading ? '#f5b7b1' : '#c0392b')};
  }
`;

interface DeleteConfirmDialogProps {
  open: boolean;
  title?: string;
  itemName?: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  title = '确认删除',
  itemName,
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (!open) return null;

  return (
    <Overlay>
      <DialogCard>
        <Header>
          <Title>{title}</Title>
        </Header>
        <Body>
          确定要删除
          {itemName ? (
            <>
              优惠券 <Highlight>{itemName}</Highlight>
            </>
          ) : (
            '该优惠券'
          )}
          吗？此操作不可撤销。
        </Body>
        <Footer>
          <CancelBtn onClick={onClose} disabled={loading}>
            取消
          </CancelBtn>
          <ConfirmBtn $loading={loading} onClick={onConfirm} disabled={loading}>
            {loading ? '删除中...' : '确认删除'}
          </ConfirmBtn>
        </Footer>
      </DialogCard>
    </Overlay>
  );
};

export default DeleteConfirmDialog;