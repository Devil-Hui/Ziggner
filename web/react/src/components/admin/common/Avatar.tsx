/**
 * Avatar（圆形头像，无图显示首字母）
 */
import styled from 'styled-components'
import { Color, FontSize, FontWeight } from '../../../theme/tokens'

const Circle = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${Color.primaryLight};
  color: ${Color.primaryHover};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => Math.max(12, $size * 0.4)}px;
  font-weight: ${FontWeight.semibold};
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
}

export default function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?'
  return (
    <Circle $size={size} className={className} title={name ?? undefined}>
      {src ? <img src={src} alt={name ?? 'avatar'} loading="lazy" /> : initial}
    </Circle>
  )
}
