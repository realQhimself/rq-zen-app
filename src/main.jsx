import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

Sentry.init({
  dsn: '', // User will add DSN later
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // Only in production
  tracesSampleRate: 0.1,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
