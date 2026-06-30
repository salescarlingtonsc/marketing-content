import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Minimal observability: log so failures aren't silent (vs the old blank screen).
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 460, margin: '80px auto', padding: '0 18px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ color: '#666', fontSize: 14 }}>The app hit an error. Reloading usually fixes it.</p>
          <pre style={{ color: '#b42318', fontSize: 12, whiteSpace: 'pre-wrap', textAlign: 'left', background: '#fff3f0', padding: 10, borderRadius: 6 }}>{this.state.error.message}</pre>
          <button onClick={() => location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reload</button>
        </main>
      )
    }
    return this.props.children
  }
}
