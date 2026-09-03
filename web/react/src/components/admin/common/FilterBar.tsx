import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize } from '../../../theme/tokens';
import { Select, SecondaryBtn as ResetButton } from './ui';
import { useTranslation } from '@/i18n';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${Spacing.md}px;
  padding: 0 0 ${Spacing.lg}px 0;
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
  const { t } = useTranslation();
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
      {onReset && <ResetButton onClick={onReset}>{t('common.reset')}</ResetButton>}
      {children}
    </Container>
  );
}