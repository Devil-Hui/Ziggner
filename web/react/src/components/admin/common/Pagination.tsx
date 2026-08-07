import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize, Transition } from '../../../theme/tokens';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${Spacing.xs}px;
  padding: ${Spacing.lg}px 0;
`;

const PageButton = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  min-width: ${Spacing.xxxl}px;
  height: ${Spacing.xxxl}px;
  padding: 0 ${Spacing.sm}px;
  border: 1px solid ${({ $active }) => ($active ? Color.status.error : Color.border.medium)};
  background: ${({ $active }) => ($active ? Color.status.error : Color.bg.card)};
  color: ${({ $active }) => ($active ? Color.text.inverse : Color.primaryHover)};
  font-size: ${FontSize.sm}px;
  border-radius: ${Radius.xs}px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all ${Transition.fast};

  &:hover:not(:disabled) {
    border-color: ${({ $active }) => ($active ? '#c0392b' : Color.status.error)};
    background: ${({ $active }) => ($active ? '#c0392b' : '#fde8e8')};
    color: ${({ $active }) => ($active ? Color.text.inverse : Color.status.error)};
  }
`;

const Info = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin-left: ${Spacing.md}px;
`;

interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
}

export default function Pagination({ current, total, pageSize = 20, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const delta = 2;
    const left = Math.max(2, current - delta);
    const right = Math.min(totalPages - 1, current + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <Container>
      <PageButton
        $disabled={current <= 1}
        onClick={() => current > 1 && onChange(current - 1)}
      >
        ‹
      </PageButton>
      {getPages().map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} style={{ padding: `0 ${Spacing.xs}px`, color: Color.text.muted }}>
            ...
          </span>
        ) : (
          <PageButton
            key={page}
            $active={page === current}
            onClick={() => onChange(page as number)}
          >
            {page}
          </PageButton>
        )
      )}
      <PageButton
        $disabled={current >= totalPages}
        onClick={() => current < totalPages && onChange(current + 1)}
      >
        ›
      </PageButton>
      <Info>共 {total} 条</Info>
    </Container>
  );
}