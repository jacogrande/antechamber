import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-2xl font-bold text-destructive">
                  Something went wrong
                </h2>
                <p className="text-muted-foreground">
                  An unexpected error occurred. Please try reloading the page.
                </p>
                {this.state.error && (
                  <div className="w-full max-h-[150px] overflow-y-auto rounded-md bg-muted p-3 text-left font-mono text-sm text-muted-foreground">
                    {this.state.error.message}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button onClick={this.handleReload}>Reload Page</Button>
                  <Button variant="ghost" onClick={this.handleReset}>
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
