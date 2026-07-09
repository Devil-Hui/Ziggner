import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAppContext } from '../../store/AppContext'
import styled, { keyframes, css } from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize } from '../../theme/tokens'
import { zIndex } from '../../styles/zIndex'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const slideIn = keyframes`
  from { transform: translate(-50%, -100%); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
`

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`

const toastColors: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: Color.status.success, icon: '✓' },
  error: { bg: Color.status.error, icon: '✕' },
  warning: { bg: Color.status.warning, icon: '⚠' },
  info: { bg: Color.status.info, icon: 'ℹ' },
}

const ToastContainer = styled.div<{ $type: ToastType; $exiting: boolean }>`
  position: fixed;
  top: ${Spacing.xl}px;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ $type }) => toastColors[$type].bg};
  color: ${Color.text.inverse};
  padding: ${Spacing.md}px ${Spacing.xxxl}px;
  border-radius: ${Radius.md}px;
  z-index: ${zIndex.modal};
  font-size: ${FontSize.base}px;
  box-shadow: ${Shadow.dropdown};
  display: flex;
  align-items: center;
  gap: ${Spacing.sm}px;
  cursor: pointer;
  ${({ $exiting }) => $exiting
    ? css`animation: ${fadeOut} 0.2s ease-out forwards;`
    : css`animation: ${slideIn} 0.3s ease-out;`
  }
`

const ToastIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
`

const ToastMessage = styled.span`
  flex: 1;
`

interface ToastItem {
  toastId: number;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0

export default function GlobalErrorToast() {
  const { globalError, clearGlobalError } = useAppContext()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set())

  const removeToast = useCallback((toastId: number) => {
    setExitingIds(prev => new Set(prev).add(toastId))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId))
      setExitingIds(prev => {
        const next = new Set(prev)
        next.delete(toastId)
        return next
      })
    }, 200)
  }, [])

  useEffect(() => {
    if (globalError) {
      const toastId = ++toastIdCounter
      const type = globalError.type || 'error'
      setToasts(prev => [...prev, { toastId, message: globalError.message, type }])
      clearGlobalError()

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        removeToast(toastId)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [globalError, clearGlobalError, removeToast])

  if (toasts.length === 0) return null

  return createPortal(
    <>
      {toasts.map(toast => (
        <ToastContainer
          key={toast.toastId}
          $type={toast.type}
          $exiting={exitingIds.has(toast.toastId)}
          onClick={() => removeToast(toast.toastId)}
        >
          <ToastIcon>{toastColors[toast.type].icon}</ToastIcon>
          <ToastMessage>{toast.message}</ToastMessage>
        </ToastContainer>
      ))}
    </>,
    document.body
  )
}
