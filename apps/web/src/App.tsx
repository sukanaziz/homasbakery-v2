// Top-level URL routing for the app.
//
// Public:  /            HomePage              — welcome page + featured slideshow
//          /menu        MenuPage              — products + order request form
//          /privacy     PrivacyPolicyPage     — privacy policy
//          /terms       TermsPage             — terms of service
//
// Admin:   /admin/login          AdminLoginPage         — email/password sign-in
//          /admin                AdminDashboardPage     — orders + status controls
//          /admin/products       AdminProductsPage      — menu CRUD + image upload
//
// Each admin page handles its own auth gating (redirects to /admin/login
// if not signed in) — there's no top-level guard here. Keeping the
// routing dumb means a non-logged-in visitor at /admin gets a clean
// redirect rather than a flash of dashboard UI.

import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MenuPage from './pages/MenuPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminProductsPage from './pages/AdminProductsPage'

// Resets the scroll position to the top whenever the URL pathname changes.
// React Router intentionally doesn't do this — it preserves scroll for
// back/forward navigation — but for our app, going from a long page like
// /menu to /privacy and landing halfway down feels broken. This component
// renders nothing, it just runs the scroll effect on every route change.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/products" element={<AdminProductsPage />} />
      </Routes>
    </>
  )
}
