import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8fafc', fontFamily: "'Geologica', system-ui, sans-serif", padding: '2rem',
        }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} style={{ width: 30, height: 30 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>Something went wrong</h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
              An unexpected error occurred. Please reload the page. If this keeps happening, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '0.7rem 1.5rem', borderRadius: 12, border: 'none', background: '#1F6F5F', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
