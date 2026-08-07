import React from 'react';
import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize } from '../../theme/tokens';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px ${Spacing.xxxl}px;
  color: ${Color.text.muted};
`;

const Icon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${Radius.full};
  background: ${Color.border.light};
  color: ${Color.text.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${FontSize.xxl}px;
  margin-bottom: ${Spacing.lg}px;
`;

const Title = styled.h3`
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.secondary};
  margin: 0 0 ${Spacing.sm}px 0;
`;

const Message = styled.p`
  font-size: ${FontSize.base}px;
  margin: 0;
`;

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  message = '当前没有任何记录',
  icon,
}) => (
  <Wrapper>
    <Icon>{icon || '--'}</Icon>
    <Title>{title}</Title>
    <Message>{message}</Message>
  </Wrapper>
);

export default EmptyState;
