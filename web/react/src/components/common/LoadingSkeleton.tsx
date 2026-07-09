import styled, { keyframes } from 'styled-components';
import { Color, Radius, Spacing } from '../../theme/tokens';

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const SkeletonWrapper = styled.div`
  width: 100%;
`;

const SkeletonRow = styled.div<{ $width?: string }>`
  height: 14px;
  width: ${({ $width }) => $width || '100%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${Radius.xs}px;
  margin-bottom: ${Spacing.md}px;
`;

const TableSkeleton = styled.div`
  width: 100%;
`;

const TableHeader = styled.div`
  display: flex;
  gap: ${Spacing.lg}px;
  padding: ${Spacing.md}px ${Spacing.lg}px;
  background: #fafafa;
  border-bottom: 1px solid ${Color.border.light};
  margin-bottom: 0;
`;

const TableRow = styled.div`
  display: flex;
  gap: ${Spacing.lg}px;
  padding: ${Spacing.lg}px;
  border-bottom: 1px solid #f0f0f0;
`;

const HeaderCell = styled.div<{ $flex?: number }>`
  flex: ${({ $flex }) => $flex || 1};
  height: 12px;
  background: #e8e8e8;
  border-radius: ${Radius.xs}px;
`;

const Cell = styled.div<{ $flex?: number }>`
  flex: ${({ $flex }) => $flex || 1};
  height: 14px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${Radius.xs}px;
`;

interface LoadingSkeletonProps {
  type?: 'table' | 'card' | 'text';
  rows?: number;
  cols?: number;
}

export default function LoadingSkeleton({ type = 'table', rows = 5, cols = 5 }: LoadingSkeletonProps) {
  if (type === 'text') {
    return (
      <SkeletonWrapper>
        <SkeletonRow $width="60%" />
        <SkeletonRow $width="80%" />
        <SkeletonRow $width="40%" />
      </SkeletonWrapper>
    );
  }

  if (type === 'card') {
    return (
      <SkeletonWrapper>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: `${Spacing.lg}px`,
              marginBottom: `${Spacing.md}px`,
              background: Color.bg.card,
              border: `1px solid ${Color.border.light}`,
              borderRadius: `${Radius.sm}px`,
            }}
          >
            <SkeletonRow $width="40%" />
            <SkeletonRow $width="70%" />
          </div>
        ))}
      </SkeletonWrapper>
    );
  }

  return (
    <TableSkeleton>
      <TableHeader>
        {Array.from({ length: cols }).map((_, i) => (
          <HeaderCell key={i} $flex={i === 0 ? 2 : 1} />
        ))}
      </TableHeader>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Cell key={colIdx} $flex={colIdx === 0 ? 2 : 1} />
          ))}
        </TableRow>
      ))}
    </TableSkeleton>
  );
}
