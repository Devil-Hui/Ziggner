import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize } from '../../../theme/tokens';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${Spacing.md}px;
  padding: 0 0 ${Spacing.lg}px 0;
`;

const Select = styled.select`
  padding: 6px ${Spacing.md}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.xs}px;
  background: ${Color.bg.card};
  color: ${Color.primaryHover};
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${Color.primary};
  }
`;

const ResetButton = styled.button`
  padding: 6px ${Spacing.lg}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.xs}px;
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${Color.primaryHover};
    border-color: ${Color.primaryHover};
  }
`;

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  statusFilter?: FilterOption[];
  currentStatus?: string;
  onStatusChange?: (status: string) => void;
  onReset?: () => void;
  children?: React.ReactNode;
}

export default function FilterBar({
  statusFilter = [],
  currentStatus,
  onStatusChange,
  onReset,
  children,
}: FilterBarProps) {
  return (
    <Container>
      {statusFilter.length > 0 && currentStatus !== undefined && onStatusChange && (
        <Select
          value={currentStatus}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {statusFilter.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      )}
      {onReset && <ResetButton onClick={onReset}>重置</ResetButton>}
      {children}
    </Container>
  );
}