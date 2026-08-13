import styled from 'styled-components';
import { Color, Radius, Spacing, FontSize, Transition } from '../../../theme/tokens';
import LoadingSkeleton from '../../common/LoadingSkeleton';
import { useTranslation } from '../../../i18n';

/* Lumiere palette — aligned with storefront */
const INK = '#1a1712'
const MUTED = '#8a8175'
const CLAY = '#c8623a'
const LINE = 'rgba(26, 23, 18, 0.10)'

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: ${FontSize.sm}px;
  background: #fff;
  border: 1px solid ${LINE};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 14px rgba(26, 23, 18, 0.06);
`;

const Thead = styled.thead`
  background: rgba(26, 23, 18, 0.03);
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: 14px 18px;
  text-align: left;
  font-weight: 600;
  color: ${MUTED};
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 1px solid ${LINE};
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;

  &:hover {
    color: ${({ $sortable }) => ($sortable ? CLAY : MUTED)};
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid ${LINE};
  transition: background ${Transition.fast};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  &:hover {
    background: ${({ $clickable }) => ($clickable ? 'rgba(200, 98, 58, 0.04)' : 'transparent')};
  }

  &:last-child td {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 14px 18px;
  color: ${INK};
  vertical-align: middle;
  border-bottom: 1px solid ${LINE};
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
    <TableScroll>
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
    </TableScroll>
  );
}

export default DataTable;
export type { Column };