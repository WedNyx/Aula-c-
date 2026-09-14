import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './redesign.css'
import App from './App.jsx'
import { PlatformStatusBar } from './components/PlatformStatusBar.jsx'
import './sentry.js'
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <PlatformStatusBar />
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
