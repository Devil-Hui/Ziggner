import React from 'react';
import styled from 'styled-components';
import { Color } from '../../theme/tokens';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: ${Color.text.secondary};
`;

const Icon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fef2f2;
  color: ${Color.status.error};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0 0 8px 0;
`;

const Message = styled.p`
  font-size: 14px;
  margin: 0 0 16px 0;
  color: ${Color.text.muted};
`;

const RetryButton = styled.button`
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: ${Color.status.error};
  color: ${Color.text.inverse};
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #b91c1c;
  }
`;

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = '加载失败',
  message = '请检查网络连接后重试',
  onRetry,
}) => (
  <Wrapper>
    <Icon>&#9888;</Icon>
    <Title>{title}</Title>
    <Message>{message}</Message>
    {onRetry && <RetryButton onClick={onRetry}>重新加载</RetryButton>}
  </Wrapper>
);

export default ErrorState;
