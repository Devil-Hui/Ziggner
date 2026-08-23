/**
 * SmartDataTable — 统一智能表格（P1 核心）
 * ───────────────────────────────────────────────────
 * 在旧 DataTable API（columns/dataSource/rowKey/onRowClick/loading/error）基础上扩展：
 *   · 真排序：sortable 列点击切换 asc→desc→none（不再只是装饰性标志）。
 *     传 onSortChange → 服务端排序（父组件带 ?sort=&order= 请求）；否则客户端排序。
 *   · 列设置：工具栏下拉勾选显隐列（受控或非受控）。
 *   · 密度：compact / normal / comfortable 三档（Component.Table.density）。
 *   · 批量选择：rowSelection 勾选列 + 表头全选（当前页）+ 选中摘要 + bulkBar。
 *   · 导出：onExport 触发（CSV 等由调用方实现）。
 *   · sticky 表头。
 * 所有颜色/尺寸取 Component.Table + Semantic，禁止写死。
 */
import { useMemo, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { Component, Semantic } from '@/theme'
import { Button } from './Button'
import { LoadingState } from './AsyncState'

export type TableDensity = 'compact' | 'normal' | 'comfortable'
export type SortOrder = 'asc' | 'desc' | null

export interface SmartColumn<T> {
  key: string
  title: ReactNode
  dataIndex?: keyof T
  render?: (val: unknown, record: T) => ReactNode
  sortable?: boolean
  /** 排序字段，默认 dataIndex ?? key */
  sortField?: string
  width?: string
  align?: 'left' | 'center' | 'right'
  /** 是否允许在列设置中隐藏（默认 true） */
  hideable?: boolean
}

export interface RowSelection<T> {
  selectedRowKeys: (string | number)[]
  onChange: (keys: (string | number)[], rows: T[]) => void
  getCheckboxProps?: (record: T) => { disabled?: boolean }
}

export interface SmartDataTableProps<T extends Record<string, any>> {
  columns: SmartColumn<T>[]
  dataSource?: T[]
  data?: T[]
  rowKey?: keyof T | ((record: T) => string)
  onRowClick?: (record: T) => void
  emptyText?: string
  emptyTitle?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  loadingRows?: number

  /* 排序 */
  onSortChange?: (field: string, order: SortOrder) => void
  defaultSort?: { field: string; order: Exclude<SortOrder, null> }

  /* 批量选择 */
  rowSelection?: RowSelection<T>

  /* 列设置（受控优先） */
  hiddenColumns?: string[]
  onHiddenColumnsChange?: (keys: string[]) => void

  /* 密度（受控优先） */
  density?: TableDensity
  onDensityChange?: (d: TableDensity) => void

  /* 工具栏 */
  onExport?: () => void
  exportLabel?: string
  /** 选中时显示在工具栏左侧的批量操作区 */
  bulkBar?: ReactNode

  stickyHeader?: boolean
}

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: ${Component.Table.headerFontSize}px;
  background: ${Semantic.surface.card};
  border: 1px solid ${Component.Table.border};
  border-radius: 14px;
  overflow: hidden;
`

const Thead = styled.thead<{ $sticky?: boolean }>`
  background: ${Component.Table.headerBg};
  ${({ $sticky }) => ($sticky ? 'position: sticky; top: 0; z-index: 2;' : '')}
`

const Th = styled.th<{ $sortable?: boolean; $align?: string }>`
  padding: 14px 18px;
  text-align: ${({ $align }) => $align ?? 'left'};
  font-weight: 600;
  color: ${Component.Table.headerFg};
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  border-bottom: 1px solid ${Component.Table.border};
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  transition: color 0.15s ease;

  &:hover {
    color: ${({ $sortable }) => ($sortable ? Semantic.interactive.default : Component.Table.headerFg)};
  }
`

const SortIcon = styled.span`
  margin-left: 4px;
  font-size: 10px;
`

const Td = styled.td<{ $align?: string; $density: TableDensity }>`
  padding: ${({ $density }) => Component.Table.density[$density] * 0.29}px 18px;
  color: ${Component.Table.rowFg};
  vertical-align: middle;
  text-align: ${({ $align }) => $align ?? 'left'};
  border-bottom: 1px solid ${Component.Table.border};
`

const Tr = styled.tr<{ $clickable?: boolean; $selected?: boolean }>`
  transition: background 0.15s ease;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  background: ${({ $selected }) => ($selected ? Component.Table.selectedBg : 'transparent')};

  &:hover {
    background: ${({ $selected, $clickable }) =>
      $clickable ? Component.Table.rowHoverBg : $selected ? Component.Table.selectedBg : 'transparent'};
  }

  &:last-child td {
    border-bottom: none;
  }
`

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 15px;
  height: 15px;
  accent-color: ${Semantic.interactive.default};
  cursor: pointer;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const SelectionInfo = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${Semantic.interactive.default};
`

const Dropdown = styled.div`
  position: relative;
`

const DropdownPanel = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  min-width: 180px;
  background: ${Semantic.surface.card};
  border: 1px solid ${Semantic.border.light};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 20;
`

const DropdownItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  font-size: 13px;
  color: ${Semantic.text.body};
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;

  &:hover {
    background: ${Semantic.surface.sunken};
  }
`

const EmptyTd = styled.td`
  text-align: center;
  padding: 40px;
  color: ${Semantic.text.muted};
  font-size: 13px;
`

const ErrorWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: ${Semantic.status.danger.fg};
  font-size: 13px;
`

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const sa = String(a)
  const sb = String(b)
  const na = Number(sa)
  const nb = Number(sb)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && sa.trim() !== '' && sb.trim() !== '') return na - nb
  return sa.localeCompare(sb)
}

export function SmartDataTable<T extends Record<string, any>>({
  columns,
  dataSource,
  data,
  rowKey,
  onRowClick,
  emptyText = '暂无数据',
  emptyTitle,
  loading = false,
  error = null,
  onRetry,
  loadingRows = 5,
  onSortChange,
  defaultSort,
  rowSelection,
  hiddenColumns,
  onHiddenColumnsChange,
  density: densityProp,
  onDensityChange,
  onExport,
  exportLabel = '导出',
  bulkBar,
  stickyHeader = false,
}: SmartDataTableProps<T>) {
  const source = (dataSource ?? data ?? []) as T[]

  /* 排序：受控（onSortChange）走服务端；否则客户端 */
  const [localSort, setLocalSort] = useState<{ field: string; order: SortOrder }>({
    field: defaultSort?.field ?? '',
    order: defaultSort?.order ?? null,
  })
  const sort = onSortChange ? localSort : localSort
  const handleSort = (col: SmartColumn<T>) => {
    const field = col.sortField ?? String(col.dataIndex ?? col.key)
    const next: SortOrder =
      sort.field !== field ? 'asc' : sort.order === 'asc' ? 'desc' : sort.order === 'desc' ? null : 'asc'
    const nextSort = { field, order: next }
    setLocalSort(nextSort)
    if (onSortChange) onSortChange(field, next)
  }

  const sorted = useMemo(() => {
    if (!sort.field || !sort.order || onSortChange) return source
    const dir = sort.order === 'asc' ? 1 : -1
    return [...source].sort((a, b) => compareValues(a[sort.field], b[sort.field]) * dir)
  }, [source, sort, onSortChange])

  /* 列设置（受控优先） */
  const [localHidden, setLocalHidden] = useState<Set<string>>(new Set())
  const hidden = hiddenColumns
    ? new Set(hiddenColumns)
    : new Set([...localHidden].filter((k) => columns.some((c) => c.key === k)))
  const toggleHidden = (key: string) => {
    if (hiddenColumns && onHiddenColumnsChange) {
      onHiddenColumnsChange(hidden.has(key) ? hiddenColumns.filter((k) => k !== key) : [...hiddenColumns, key])
      return
    }
    setLocalHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /* 密度 */
  const [localDensity, setLocalDensity] = useState<TableDensity>('normal')
  const density = densityProp ?? localDensity
  const setDensity = (d: TableDensity) => {
    if (onDensityChange) onDensityChange(d)
    else setLocalDensity(d)
  }

  /* 工具栏下拉 */
  const [showCols, setShowCols] = useState(false)
  const [showDensity, setShowDensity] = useState(false)

  const visibleColumns = columns.filter((c) => !hidden.has(c.key))

  const getRowKey = (record: T, index: number): string | number => {
    if (typeof rowKey === 'function') return rowKey(record)
    if (typeof rowKey === 'string') return String(record[rowKey] ?? index)
    return String(index)
  }

  const selectionEnabled = !!rowSelection
  const allVisibleSelected =
    selectionEnabled && sorted.length > 0 && sorted.every((r) => rowSelection!.selectedRowKeys.includes(getRowKey(r, sorted.indexOf(r))))
  const toggleSelectAll = () => {
    if (!rowSelection) return
    const keys = sorted.map((r, i) => getRowKey(r, i))
    const disabledKeys = new Set(
      sorted.map((r, i) => ({ k: getRowKey(r, i), d: rowSelection.getCheckboxProps?.(r)?.disabled })).filter((x) => x.d).map((x) => x.k),
    )
    const allKeys = keys.filter((k) => !disabledKeys.has(k))
    if (allVisibleSelected) {
      const remaining = rowSelection.selectedRowKeys.filter((k) => !keys.includes(k))
      const remainingRows = remaining.map((k) => source.find((r) => getRowKey(r, source.indexOf(r)) === k)!).filter(Boolean)
      rowSelection.onChange(remaining, remainingRows)
    } else {
      const merged = Array.from(new Set([...rowSelection.selectedRowKeys, ...allKeys]))
      const rows = merged.map((k) => source.find((r) => getRowKey(r, source.indexOf(r)) === k)!).filter(Boolean) as T[]
      rowSelection.onChange(merged, rows)
    }
  }

  const toggleRow = (record: T, index: number) => {
    if (!rowSelection) return
    const k = getRowKey(record, index)
    if (rowSelection.getCheckboxProps?.(record)?.disabled) return
    const exists = rowSelection.selectedRowKeys.includes(k)
    const next = exists
      ? rowSelection.selectedRowKeys.filter((x) => x !== k)
      : [...rowSelection.selectedRowKeys, k]
    const rows = next.map((key) => source.find((r, i) => getRowKey(r, i) === key)!).filter(Boolean) as T[]
    rowSelection.onChange(next, rows)
  }

  if (loading) {
    return <LoadingState rows={loadingRows} />
  }

  if (error) {
    return (
      <ErrorWrap>
        <span>{error}</span>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>重试</Button>}
      </ErrorWrap>
    )
  }

  const selectedCount = rowSelection?.selectedRowKeys.length ?? 0

  return (
    <>
      {(onExport || columns.some((c) => c.hideable !== false) || selectionEnabled) && (
        <Toolbar>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectionEnabled && selectedCount > 0 && (
              <SelectionInfo>已选择 {selectedCount} 项</SelectionInfo>
            )}
            {bulkBar}
          </div>
          <ToolbarRight>
            {columns.some((c) => c.hideable !== false) && (
              <Dropdown>
                <Button variant="ghost" size="sm" onClick={() => { setShowCols((v) => !v); setShowDensity(false) }}>
                  列设置 ▾
                </Button>
                {showCols && (
                  <DropdownPanel>
                    {columns.map((c) =>
                      c.hideable === false ? null : (
                        <DropdownItem key={c.key}>
                          <input
                            type="checkbox"
                            checked={!hidden.has(c.key)}
                            onChange={() => toggleHidden(c.key)}
                            style={{ accentColor: Semantic.interactive.default }}
                          />
                          {c.title}
                        </DropdownItem>
                      ),
                    )}
                  </DropdownPanel>
                )}
              </Dropdown>
            )}
            <Dropdown>
              <Button variant="ghost" size="sm" onClick={() => { setShowDensity((v) => !v); setShowCols(false) }}>
                密度 ▾
              </Button>
              {showDensity && (
                <DropdownPanel>
                  {(['compact', 'normal', 'comfortable'] as TableDensity[]).map((d) => (
                    <DropdownItem key={d} style={{ fontWeight: density === d ? 600 : 400 }}>
                      <input
                        type="radio"
                        name="density"
                        checked={density === d}
                        onChange={() => setDensity(d)}
                        style={{ accentColor: Semantic.interactive.default }}
                      />
                      {d === 'compact' ? '紧凑' : d === 'normal' ? '默认' : '宽松'}
                    </DropdownItem>
                  ))}
                </DropdownPanel>
              )}
            </Dropdown>
            {onExport && (
              <Button variant="secondary" size="sm" onClick={onExport}>
                {exportLabel}
              </Button>
            )}
          </ToolbarRight>
        </Toolbar>
      )}

      <TableScroll>
        <Table>
          <Thead $sticky={stickyHeader}>
            <tr>
              {selectionEnabled && (
                <Th style={{ width: 40, textAlign: 'center' }}>
                  <Checkbox
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    disabled={sorted.length === 0}
                    aria-label="全选"
                  />
                </Th>
              )}
              {visibleColumns.map((col) => (
                <Th
                  key={col.key}
                  $sortable={col.sortable}
                  $align={col.align}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col)}
                >
                  {col.title}
                  {col.sortable && sort.field === (col.sortField ?? String(col.dataIndex ?? col.key)) && (
                    <SortIcon>{sort.order === 'asc' ? '▲' : sort.order === 'desc' ? '▼' : ''}</SortIcon>
                  )}
                </Th>
              ))}
            </tr>
          </Thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <EmptyTd colSpan={visibleColumns.length + (selectionEnabled ? 1 : 0)}>
                  {emptyTitle && <div style={{ fontWeight: 600, marginBottom: 4 }}>{emptyTitle}</div>}
                  {emptyText}
                </EmptyTd>
              </tr>
            ) : (
              sorted.map((record, index) => {
                const key = getRowKey(record, index)
                const selected = rowSelection?.selectedRowKeys.includes(key) ?? false
                return (
                  <Tr
                    key={key}
                    $clickable={!!onRowClick}
                    $selected={selected}
                    onClick={() => onRowClick?.(record)}
                  >
                    {selectionEnabled && (
                      <Td $density={density} style={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={selected}
                          disabled={rowSelection.getCheckboxProps?.(record)?.disabled}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleRow(record, index)
                          }}
                        />
                      </Td>
                    )}
                    {visibleColumns.map((col) => (
                      <Td key={col.key} $align={col.align} $density={density}>
                        {col.render
                          ? col.render(record[col.key], record)
                          : col.dataIndex
                            ? String(record[col.dataIndex] ?? '')
                            : String(record[col.key] ?? '')}
                      </Td>
                    ))}
                  </Tr>
                )
              })
            )}
          </tbody>
        </Table>
      </TableScroll>
    </>
  )
}
