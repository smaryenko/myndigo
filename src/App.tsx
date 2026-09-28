import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { BASENAME } from './lib/appUrl'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { PublicLayout } from './components/PublicLayout'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each route gets its own chunk — the shared profile page loads independently
// from the parent portal, which loads independently from the landing page.
const LandingPage         = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const LoginPage           = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage       = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AddChildPage        = lazy(() => import('./pages/AddChildPage').then(m => ({ default: m.AddChildPage })))
const ChildProfileRoute   = lazy(() => import('./pages/ChildProfilePage').then(m => ({ default: m.ChildProfileRoute })))
const ShareManagementPage = lazy(() => import('./pages/ShareManagementPage').then(m => ({ default: m.ShareManagementPage })))
const AccountPage         = lazy(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })))
const MfaChallengePage    = lazy(() => import('./pages/MfaChallengePage').then(m => ({ default: m.MfaChallengePage })))
const SharedProfilePage   = lazy(() => import('./pages/SharedProfilePage').then(m => ({ default: m.SharedProfilePage })))
const NotFoundPage        = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <AuthProvider>
        {/* Catches render errors and failed chunk loads (e.g. after a deploy
            replaced the hashed files) — shows a reload prompt, not a blank page. */}
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner variant="fullPage" />}>
            <Routes>
              {/* Public routes with shared nav */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Shared profile — no nav, no auth, own bundle */}
              <Route path="/s/:token" element={<SharedProfilePage />} />

              {/* MFA step-up challenge — session exists but AAL1 only */}
              <Route path="/mfa-challenge" element={<MfaChallengePage />} />

              {/* Protected routes — auth required, app nav */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/children/new" element={<AddChildPage />} />
                  <Route path="/children/:id" element={<ChildProfileRoute />} />
                  <Route path="/children/:id/share" element={<ShareManagementPage />} />
                  <Route path="/account" element={<AccountPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
