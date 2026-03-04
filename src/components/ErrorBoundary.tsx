import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Icon } from './Icon.tsx'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="text-red-400 mb-2">
            <Icon name="warning" className="w-8 h-8 mx-auto" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Something went wrong</p>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-600 mb-3 font-mono">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="text-[11px] px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
