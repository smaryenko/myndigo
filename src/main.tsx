import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { i18nReady } from './lib/i18n'
import App from './App.tsx'

// Wait for the detected UI language's bundle so the first paint is already
// in the right language (and direction). i18nReady never rejects.
i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
