import { createPortal } from 'react-dom'
import { useAppContext } from '../../store/AppContext'
import styled, { keyframes } from 'styled-components'
import { Color, Radius } from '../../theme/tokens'
import { zIndex } from '../../styles/zIndex'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${zIndex.button};
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${Color.text.inverse};
  border-top-color: ${Color.primaryHover};
  border-radius: ${Radius.full};
  animation: ${spin} 0.8s linear infinite;
`

export default function GlobalLoading() {
  const { globalLoading } = useAppContext()
  if (!globalLoading) return null
  return createPortal(
    <Overlay><Spinner /></Overlay>,
    document.body
  )
}