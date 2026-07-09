import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Color } from '../../theme/tokens';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: ${Color.text.secondary};
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${Color.border.light};
  border-top-color: ${Color.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin-bottom: 16px;
`;

const Text = styled.p`
  font-size: 14px;
  margin: 0;
  color: ${Color.text.muted};
`;

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = '加载中...' }) => (
  <Wrapper>
    <Spinner />
    <Text>{message}</Text>
  </Wrapper>
);

export default LoadingState;
