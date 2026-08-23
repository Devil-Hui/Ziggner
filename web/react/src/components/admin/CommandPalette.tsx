/**
 * CommandPalette — 命令面板（⌘K / Ctrl+K）（P2）
 * ───────────────────────────────────────────────────
 * 数据驱动分组（导航/商品/订单/操作…），输入即过滤，↑↓ 选择，Enter 执行，Esc 关闭。
 * 由父组件用 useKeyboardShortcuts 绑定 'meta+k' 打开；组件内部自监听 Esc 关闭。
 * 无后端依赖，sections 由调用方注入。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { Semantic } from '@/theme'
import { ZIndex } from '@/theme/zIndex'

export interface PaletteItem {
  id: string
  label: string
  sublabel?: string
  icon?: ReactNode
  keywords?: string
  onSelect: () => void
}

export interface PaletteSection {
  title: string
  items: PaletteItem[]
}

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  sections: PaletteSection[]
  placeholder?: string
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${ZIndex.modal};
  background: ${Semantic.surface.overlay};
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  padding-top: 12vh;
`

const Panel = styled.div`
  width: 100%;
  max-width: 560px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: ${Semantic.surface.card};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
`

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid ${Semantic.border.light};
`

const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: ${Semantic.text.heading};
  background: transparent;

  &::placeholder {
    color: ${Semantic.text.muted};
  }
`

const Kbd = styled.kbd`
  font-size: 11px;
  color: ${Semantic.text.muted};
  border: 1px solid ${Semantic.border.medium};
  border-radius: 4px;
  padding: 2px 6px;
  background: ${Semantic.surface.sunken};
`

const ResultList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`

const GroupTitle = styled.div`
  padding: 8px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${Semantic.text.muted};
`

const Item = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? Semantic.surface.sunken : 'transparent')};
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${Semantic.surface.sunken};
  }
`

const ItemIcon = styled.span`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${Semantic.status.info.bg};
  color: ${Semantic.status.info.fg};
  font-size: 14px;
  flex-shrink: 0;
`

const ItemText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const ItemLabel = styled.span`
  font-size: 14px;
  color: ${Semantic.text.heading};
`

const ItemSub = styled.span`
  font-size: 12px;
  color: ${Semantic.text.muted};
`

const Empty = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: ${Semantic.text.muted};
`

export function CommandPalette({ open, onClose, sections, placeholder = '搜索 Ziggner…' }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sections
      .map((s) => ({
        title: s.title,
        items: s.items.filter(
          (i) =>
            !q ||
            i.label.toLowerCase().includes(q) ||
            i.sublabel?.toLowerCase().includes(q) ||
            i.keywords?.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.items.length > 0)
  }, [sections, query])

  const flat = useMemo(() => filtered.flatMap((s) => s.items), [filtered])

  useEffect(() => {
    setActive(0)
  }, [query, sections])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % Math.max(1, flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + Math.max(1, flat.length)) % Math.max(1, flat.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      flat[active]?.onSelect()
    }
  }

  if (!open) return null

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-label="命令面板">
      <Panel onClick={(e) => e.stopPropagation()}>
        <InputRow>
          <span style={{ fontSize: 16 }}>⌕</span>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
          />
          <Kbd>Esc</Kbd>
        </InputRow>
        <ResultList>
          {flat.length === 0 ? (
            <Empty>没有找到匹配项</Empty>
          ) : (
            filtered.map((section) => (
              <div key={section.title}>
                <GroupTitle>{section.title}</GroupTitle>
                {section.items.map((item) => {
                  const idx = flat.indexOf(item)
                  return (
                    <Item
                      key={item.id}
                      $active={idx === active}
                      onMouseEnter={() => setActive(idx)}
                      onClick={item.onSelect}
                    >
                      <ItemIcon>{item.icon ?? '•'}</ItemIcon>
                      <ItemText>
                        <ItemLabel>{item.label}</ItemLabel>
                        {item.sublabel && <ItemSub>{item.sublabel}</ItemSub>}
                      </ItemText>
                    </Item>
                  )
                })}
              </div>
            ))
          )}
        </ResultList>
      </Panel>
    </Overlay>
  )
}
