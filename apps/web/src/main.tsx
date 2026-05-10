// React entrypoint. Mounts the app into <div id="root"> in index.html
// and wraps it in the providers every page needs:
//
//   - StrictMode             extra dev-only checks for common bugs
//   - QueryClientProvider    TanStack Query — server state cache
//   - BrowserRouter          react-router-dom — URL routing
//
// Sentry initialization happens before anything else so it can capture
// errors from the very first render.

import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Init Sentry only when a DSN is configured. Lets us run dev without
// shipping noise to the production project.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Errors only — no performance traces or session replays for now.
    tracesSampleRate: 0,
  })
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Sentry's ErrorBoundary catches any render-time error in the tree
        below it, reports to Sentry, and shows a fallback UI instead of
        a white page. We give it a soft amber-themed fallback that
        matches the rest of the site. */}
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6 text-center">
          <div>
            <h1 className="font-display text-3xl text-amber-950 mb-3">
              Something went wrong
            </h1>
            <p className="text-stone-600 mb-6">
              We've been notified. Please refresh the page or try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2 px-6 bg-amber-900 hover:bg-amber-950 text-amber-50 font-medium rounded-full transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      }
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
