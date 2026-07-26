import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'
import api from './config/api.js'
import { AuthProvider } from './context/AuthContext.jsx'

if (!window.api) {
  window.api = api
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24,
          background: '#0d0d0d',
          color: '#f87171',
          fontFamily: 'monospace',
          minHeight: '100vh',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}>
          <h1 style={{ color: '#ef4444', fontSize: 20, marginBottom: 12 }}>
            ⚠️ Application Error Encountered
          </h1>
          <div style={{ color: '#fca5a5', fontSize: 14, marginBottom: 16, background: '#1c1917', padding: 12, borderRadius: 8, border: '1px solid #441c1c' }}>
            <strong>Error:</strong> {this.state.error?.toString()}
          </div>
          <h3 style={{ color: '#e5e7eb', fontSize: 14, marginBottom: 8 }}>Component Stack Trace:</h3>
          <pre style={{
            background: '#18181b',
            color: '#a1a1aa',
            padding: 16,
            borderRadius: 8,
            overflowX: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
            border: '1px solid #27272a',
            whiteSpace: 'pre-wrap',
          }}>
            {this.state.errorInfo?.componentStack || 'No component stack available.'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'sans-serif',
            }}
          >
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

