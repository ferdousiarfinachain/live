import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Web3Providers from './Web3Providers'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Web3Providers>
      <App />
    </Web3Providers>
  </StrictMode>,
)
  