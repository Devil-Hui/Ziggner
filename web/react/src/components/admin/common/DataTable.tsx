import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize, Transition } from '../../../theme/tokens';
import LoadingSkeleton from '../../common/LoadingSkeleton';
import { useTranslation } from '../../../i18n';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${FontSize.sm}px;
`;

const Thead = styled.thead`
  background: #fafafa;
  border-bottom: 1px solid ${Color.border.light};
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: ${Spacing.md}px ${Spacing.lg}px;
  text-align: left;
  font-weight: ${600};
  color: ${Color.text.secondary};
  font-size: ${FontSize.xs}px;
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;

  &:hover {
    color: ${({ $sortable }) => ($sortable ? Color.primaryHover : Color.text.secondary)};
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid #f0f0f0;
  transition: background ${Transition.fast};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  &:hover {
    background: ${({ $clickable }) => ($clickable ? '#fafafa' : 'transparent')};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: ${Spacing.md}px ${Spacing.lg}px;
  color: ${Color.text.body};
  vertical-align: middle;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: ${Spacing.section}px;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`;

const EmptyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${Spacing.section}px;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`;

const ErrorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${Spacing.section}px;
  color: #c62828;
  font-size: ${FontSize.sm}px;
`;

const RetryButton = styled.button`
  margin-top: 8px;
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid ${Color.border.medium};
  background: #fff;
  color: ${Color.text.secondary};
  border-radius: 2px;
  cursor: pointer;
  &:hover { border-color: ${Color.border.dark}; }
`;

interface Column<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (val: unknown, record: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  dataSource?: T[];
  data?: T[];
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T) => void;
  emptyText?: string;
  emptyTitle?: string;
  emptyIcon?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function DataTable<T extends Record<string, any>>({
  columns,
  dataSource,
  data,
  rowKey,
  onRowClick,
  emptyText,
  emptyTitle,
  loading = false,
  error = null,
  onRetry,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const source = (dataSource ?? data ?? []) as T[];
  const safeColumns = columns ?? [];
  const defaultEmptyText = t('common.noData')

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(record);
    if (typeof rowKey === 'string') return String(record[rowKey] ?? index);
    return String(index);
  };

  if (loading) {
    return <LoadingSkeleton type="table" rows={5} cols={safeColumns.length} />;
  }

  if (error) {
    return (
      <ErrorWrapper>
        <span>{error}</span>
        {onRetry && <RetryButton onClick={onRetry}>{t('common.retry')}</RetryButton>}
      </ErrorWrapper>
    );
  }

  return (
    <Table>
      <Thead>
        <tr>
          {safeColumns.map((col) => (
            <Th key={col.key} $sortable={col.sortable} style={{ width: col.width }}>
              {col.title}
            </Th>
          ))}
        </tr>
      </Thead>
      <Tbody>
        {source.length === 0 ? (
          <Tr>
            <Td colSpan={safeColumns.length} style={{ textAlign: 'center', padding: `${Spacing.section}px`, color: Color.text.muted }}>
              <EmptyWrapper>
                {emptyTitle &&                 <span>{emptyTitle}</span>}
                <span>{emptyText ?? defaultEmptyText}</span>
              </EmptyWrapper>
            </Td>
          </Tr>
        ) : (
          source.map((record, index) => (
            <Tr
              key={getRowKey(record, index)}
              $clickable={!!onRowClick}
              onClick={() => onRowClick?.(record)}
            >
              {safeColumns.map((col) => (
                <Td key={col.key}>
                  {col.render
                    ? col.render(record[col.key], record)
                    : col.dataIndex
                      ? String(record[col.dataIndex] ?? '')
                      : String(record[col.key] ?? '')}
                </Td>
              ))}
            </Tr>
          ))
        )}
      </Tbody>
    </Table>
  );
}

export default DataTable;
export type { Column };