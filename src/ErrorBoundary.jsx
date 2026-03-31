import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Unhandled UI error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-10 text-ink">
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
            <h1 className="text-2xl">Something went wrong</h1>
            <p className="mt-2 text-sm text-black/65">
              The page hit an unexpected error. Please refresh and try again.
            </p>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
