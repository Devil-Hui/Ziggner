import { Component, type ErrorInfo, type ReactNode } from 'react'

import { useTranslation } from '../../../i18n'
import { Color, FocusRing, FontSize, FontWeight, Radius, Spacing } from '../../../theme/tokens'

type Props = {
  children: ReactNode
  onReset?: () => void
}

type State = {
  hasError: boolean
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation()

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: Spacing.xxl,
      background: Color.bg.page,
      color: Color.text.body,
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 480 }}>
        <p style={{
          margin: `0 0 ${Spacing.sm}px`,
          color: Color.primary,
          fontSize: FontSize.sm,
          fontWeight: FontWeight.semibold,
        }}>
          Ziggner
        </p>
        <h1 style={{
          margin: `0 0 ${Spacing.md}px`,
          color: Color.text.heading,
          fontSize: FontSize.heading,
          fontWeight: FontWeight.semibold,
          lineHeight: 1.25,
        }}>
          {t('common.errorBoundary.title')}
        </h1>
        <p style={{
          margin: `0 0 ${Spacing.xxl}px`,
          color: Color.text.secondary,
          fontSize: FontSize.md,
          lineHeight: 1.6,
        }}>
          {t('common.errorBoundary.description')}
        </p>
        <button
          type="button"
          onClick={onReset}
          style={{
            minWidth: 136,
            minHeight: 44,
            padding: `0 ${Spacing.xl}px`,
            border: 0,
            borderRadius: Radius.md,
            background: Color.primary,
            color: Color.text.inverse,
            fontSize: FontSize.base,
            fontWeight: FontWeight.semibold,
            cursor: 'pointer',
          }}
          onFocus={event => { event.currentTarget.style.boxShadow = FocusRing.style }}
          onBlur={event => { event.currentTarget.style.boxShadow = 'none' }}
        >
          {t('common.errorBoundary.reload')}
        </button>
      </div>
    </main>
  )
}

class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info)
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset()
      return
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} />
    }
    return this.props.children
  }
}

export default AppErrorBoundary
