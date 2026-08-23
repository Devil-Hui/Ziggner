/**
 * Pagination — 统一分页（当前页品牌蓝，绝不用 danger 红）
 * ───────────────────────────────────────────────────
 * 红色只表达 删除/错误/危险/失败，不表达"当前页"。
 * active → #1a56db / 白字；hover → primaryLight；disabled → border.dark。
 * 支持紧凑窗口（首页/尾页/当前±1 + 省略号）。
 */
import styled from 'styled-components'
import { Component } from '@/theme'

const Bar = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const Btn = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border-radius: ${Component.Pagination.radius}px;
  border: 1px solid ${({ $active, $disabled }) =>
    $active ? 'transparent' : $disabled ? 'transparent' : '#d1d5db'};
  background: ${({ $active }) => ($active ? Component.Pagination.activeBg : '#fff')};
  color: ${({ $active, $disabled }) =>
    $active ? Component.Pagination.activeFg : $disabled ? Component.Pagination.disabledFg : '#374151'};
  font-size: 13px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background 0.15s ease;

  &:hover:not(:disabled):not([data-active='true']) {
    background: ${({ $disabled }) => ($disabled ? '#fff' : Component.Pagination.hoverBg)};
  }
`

const Ellipsis = styled.span`
  min-width: 24px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
`

const Info = styled.span`
  margin-left: auto;
  color: #6b7280;
  font-size: 13px;
`

function buildPages(page: number, pageCount: number): (number | '...')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < pageCount - 1) pages.push('...')
  pages.push(pageCount)
  return pages
}

export interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
  total?: number
  pageSize?: number
}

export function Pagination({ page, pageCount, onChange, total, pageSize }: PaginationProps) {
  if (pageCount <= 1 && !total) return null
  const pages = buildPages(page, pageCount)
  return (
    <Bar>
      <Btn $disabled={page <= 1} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </Btn>
      {pages.map((p, i) =>
        p === '...' ? (
          <Ellipsis key={`e${i}`}>…</Ellipsis>
        ) : (
          <Btn
            key={p}
            data-active={p === page}
            $active={p === page}
            onClick={() => onChange(p)}
          >
            {p}
          </Btn>
        ),
      )}
      <Btn $disabled={page >= pageCount} disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        ›
      </Btn>
      {total != null && pageSize != null && (
        <Info>
          共 {total} 条 · {pageSize}/页
        </Info>
      )}
    </Bar>
  )
}
