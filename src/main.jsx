import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Web3Providers from './Web3Providers'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected runtime error' }
  }

  componentDidCatch(error) {
    console.error('Root render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#060b16',
            color: '#fff',
            fontFamily: 'Inter, Arial, sans-serif',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ marginBottom: '10px', color: '#ff8c42' }}>App runtime error</h1>
            <p style={{ margin: 0, opacity: 0.95 }}>{this.state.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <Web3Providers>
        <App />
      </Web3Providers>
    </RootErrorBoundary>
  </StrictMode>,
)
  