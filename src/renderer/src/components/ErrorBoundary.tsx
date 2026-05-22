import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Simple error boundary component to catch rendering errors in child components.
 * Prevents a single component crash from crashing the entire app.
 * Used especially around SlidePreview (Reveal.js iframe) which can throw errors.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error) ?? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '10px',
                color: '#d32f2f'
              }}
            >
              Something went wrong
            </div>
            <div
              style={{ fontSize: '14px', color: '#666', marginBottom: '10px', maxWidth: '300px' }}
            >
              The preview encountered an error and could not render. Try regenerating the slide or
              check the developer console for details.
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#999',
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #ddd',
                maxWidth: '300px',
                wordBreak: 'break-word'
              }}
            >
              <strong>Error:</strong> {this.state.error.message}
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
