// TypeScript strict mode enabled
import styled from 'styled-components'
import { Color, Radius, Transition } from '../../theme/tokens'

// ── Styled Components ──

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
  vertical-align: middle;
`

const ChatButton = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  border-radius: ${Radius.sm}px;
  font-size: 0.875rem;
  cursor: pointer;
  line-height: 1;
  transition: ${Transition.fast};

  &:hover {
    background: #f0f4ff;
    border-color: #7c8db5;
    color: #4a6fa5;
  }

  &:hover + .chatlink-tooltip,
  &:focus-visible + .chatlink-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%, -4px);
  }
`

const Tooltip = styled.span`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translate(-50%, 0);
  padding: 4px 10px;
  background: #1a1a2e;
  color: #fff;
  font-size: 0.688rem;
  white-space: nowrap;
  border-radius: 4px;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s, visibility 0.15s, transform 0.15s;
  z-index: 100;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1a1a2e;
  }
`

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: #e74c3c;
  color: #fff;
  font-size: 0.563rem;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
  border-radius: 7px;
  pointer-events: none;
  z-index: 2;
`

// ── Chat Icon SVG ──

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// ── Component ──

export interface ChatLinkProps {
  /** 未读数量，0 或不传则不显示角标 */
  unreadCount?: number
  /** Tooltip 文字，默认 "查看客服咨询" */
  tooltip?: string
  /** 点击处理 */
  onClick?: () => void
  /** 额外的 CSS 类名 */
  className?: string
}

export default function ChatLink({
  unreadCount = 0,
  tooltip = '查看客服咨询',
  onClick,
  className,
}: ChatLinkProps) {
  return (
    <Wrapper className={className}>
      <ChatButton onClick={onClick} aria-label={tooltip} title={tooltip}>
        <ChatIcon />
      </ChatButton>
      {unreadCount > 0 && <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
      <Tooltip className="chatlink-tooltip">{tooltip}</Tooltip>
    </Wrapper>
  )
}
