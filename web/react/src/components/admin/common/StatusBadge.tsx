import styled from 'styled-components';
import { Color, Radius, FontSize } from '../../../theme/tokens';

export type SPUStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'on_sale' | 'suspended' | 'off_sale';
export type TaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE';
export type AppStatus = 'pending' | 'approved' | 'rejected';

type StatusType = SPUStatus | TaskStatus | AppStatus;

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: Color.border.light, color: Color.text.secondary, label: '草稿' },
  submitted: { bg: '#e3f2fd', color: Color.status.info, label: '待审核' },
  approved: { bg: Color.status.success + '1a', color: Color.status.success, label: '已通过' },
  rejected: { bg: '#fde8e8', color: Color.status.error, label: '已驳回' },
  on_sale: { bg: Color.status.success + '1a', color: Color.status.success, label: '已上架' },
  suspended: { bg: '#fce4ec', color: '#c2185b', label: '已挂起' },
  off_sale: { bg: Color.border.light, color: Color.text.secondary, label: '已下架' },
  PENDING: { bg: '#fff3e0', color: '#e65100', label: '等待中' },
  PROCESSING: { bg: '#e3f2fd', color: '#1565c0', label: '处理中' },
  SUCCESS: { bg: Color.status.success + '1a', color: Color.status.success, label: '已完成' },
  FAILURE: { bg: '#fde8e8', color: Color.status.error, label: '失败' },
  pending: { bg: '#fff3e0', color: '#e65100', label: '待审核' },
};

const Badge = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: ${Radius.xs}px ${Radius.sm}px;
  border-radius: ${Radius.xs}px;
  font-size: ${FontSize.xs}px;
  font-weight: ${500};
  line-height: 20px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: Color.border.light, color: Color.text.secondary, label: status };
  return (
    <Badge $bg={config.bg} $color={config.color}>
      {label || config.label}
    </Badge>
  );
}