// i18n must be imported for side-effects (initialises i18next)
import './lib/i18n'

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { PublicLayout } from './components/PublicLayout'

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each route gets its own chunk — shared profile page loads independently
// from the parent portal, which loads independently from the landing page.
const LandingPage        = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const LoginPage          = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AddChildPage       = lazy(() => import('./pages/AddChildPage').then(m => ({ default: m.AddChildPage })))
const ChildProfilePage   = lazy(() => import('./pages/ChildProfilePage').then(m => ({ default: m.ChildProfilePage })))
const ShareManagementPage= lazy(() => import('./pages/ShareManagementPage').then(m => ({ default: m.ShareManagementPage })))
const AccountPage        = lazy(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })))
const MfaChallengePage   = lazy(() => import('./pages/MfaChallengePage').then(m => ({ default: m.MfaChallengePage })))
const SharedProfilePage  = lazy(() => import('./pages/SharedProfilePage').then(m => ({ default: m.SharedProfilePage })))
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

// Simple full-screen spinner shown while a chunk loads
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
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
                <Route path="/children/:id" element={<ChildProfilePage />} />
                <Route path="/children/:id/share" element={<ShareManagementPage />} />
                <Route path="/account" element={<AccountPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
