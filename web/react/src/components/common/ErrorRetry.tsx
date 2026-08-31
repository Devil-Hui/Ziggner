import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize, Transition } from '../../theme/tokens';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px ${Spacing.xxxl}px;
  text-align: center;
`;

const Icon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${Radius.full};
  background: ${Color.status.error}14;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${Spacing.lg}px;
  color: ${Color.status.error};
  font-size: ${FontSize.heading}px;
`;

const Message = styled.p`
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  margin: 0 0 ${Spacing.sm}px 0;
`;

const Detail = styled.p`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin: 0 0 ${Spacing.xl}px 0;
  max-width: 400px;
  word-break: break-all;
`;

const RetryButton = styled.button`
  padding: 6px ${Spacing.xl}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.status.error};
  background: ${Color.bg.card};
  color: ${Color.status.error};
  border-radius: ${Radius.xs}px;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover {
    background: ${Color.status.error};
    color: ${Color.text.inverse};
  }
`;

interface ErrorRetryProps {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}

export default function ErrorRetry({
  message = '加载失败',
  detail,
  onRetry,
}: ErrorRetryProps) {
  return (
    <Container>
      <Icon>!</Icon>
      <Message>{message}</Message>
      {detail && <Detail>{detail}</Detail>}
      {onRetry && <RetryButton onClick={onRetry}>重试</RetryButton>}
    </Container>
  );
}
