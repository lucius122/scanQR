import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-bad/10 flex items-center justify-center mx-auto">
            <span className="text-bad text-2xl font-black leading-none">!</span>
          </div>
          <div className="font-black text-xl">Terjadi Kesalahan</div>
          <p className="text-sm text-ink-4">
            Halaman mengalami error yang tidak terduga. Silakan muat ulang atau kembali ke halaman sebelumnya.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-bad/5 border border-bad/20 rounded-lg p-3 overflow-auto max-h-32 text-bad whitespace-pre-wrap">
              {this.state.error.toString()}
            </pre>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => window.history.back()}
              className="flex-1 h-10 rounded-lg hairline text-sm font-semibold hover:bg-bone-2 transition"
            >
              Kembali
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 h-10 rounded-lg bg-ink text-white text-sm font-bold hover:bg-ink-2 transition"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </div>
    )
  }
}
