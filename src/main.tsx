import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { i18nReady } from './lib/i18n'
import { applyStoredTheme, watchSystemTheme } from './lib/theme'
import App from './App.tsx'

// Apply the stored appearance (system / light / dark) before first paint so
// there's no flash of the wrong theme, and keep 'system' in sync with the OS.
applyStoredTheme()
watchSystemTheme()

// Wait for the detected UI language's bundle so the first paint is already
// in the right language (and direction). i18nReady never rejects.
i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
