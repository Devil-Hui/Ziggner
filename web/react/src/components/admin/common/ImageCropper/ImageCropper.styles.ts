import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize } from '../../../../theme/tokens'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`

export const Dialog = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  padding: ${Spacing.xxl}px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: ${Spacing.lg}px;
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const Title = styled.h3`
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin: 0;
`

export const CanvasContainer = styled.div`
  position: relative;
  overflow: hidden;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: #f0f0f0;
  cursor: crosshair;
`

export const Canvas = styled.canvas`
  display: block;
`

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${Spacing.sm}px;
`

export const Btn = styled.button<{ $primary?: boolean }>`
  padding: 8px ${Spacing.xl}px;
  border: 1px solid ${({ $primary }) => ($primary ? 'transparent' : Color.border.medium)};
  border-radius: ${Radius.sm}px;
  background: ${({ $primary }) => ($primary ? Color.status.error : Color.bg.card)};
  color: ${({ $primary }) => ($primary ? Color.text.inverse : Color.text.secondary)};
  font-size: ${FontSize.sm}px;
  cursor: pointer;

  &:hover {
    background: ${({ $primary }) => ($primary ? '#c0392b' : Color.primaryLight)};
  }
`

export const Info = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  text-align: center;
`

export const RatioBar = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
  align-items: center;
  flex-wrap: wrap;
`

export const RatioBtn = styled.button<{ $active?: boolean }>`
  padding: 6px ${Spacing.lg}px;
  border: 1px solid ${({ $active }) => ($active ? Color.status.error : Color.border.medium)};
  border-radius: ${Radius.sm}px;
  background: ${({ $active }) => ($active ? Color.status.error : Color.bg.card)};
  color: ${({ $active }) => ($active ? Color.text.inverse : Color.text.secondary)};
  font-size: ${FontSize.sm}px;
  cursor: pointer;

  &:hover {
    background: ${({ $active }) => ($active ? '#c0392b' : Color.primaryLight)};
  }
`