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

import { useEffect, useRef } from 'react'
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
  const previousPath = useRef(pathname)
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Afghan pastries in Hayward',
      '/menu': 'Menu and order request',
      '/privacy': 'Privacy policy',
      '/terms': 'Terms of service',
    }
    document.title = titles[pathname] ? `${titles[pathname]} | Homas Bakery` : 'Homas Bakery Admin'
    if (previousPath.current !== pathname) {
      document.getElementById('main-content')?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  const { pathname } = useLocation()
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
      {!pathname.startsWith('/admin') && (
        <aside aria-label="Accessibility assistance" className={`bg-amber-50 px-6 pt-4 text-center text-sm text-stone-700 ${pathname === '/menu' ? 'pb-28' : 'pb-6'}`}>
          Need help using the website or placing an order?{' '}
          <a className="underline text-amber-900" href="mailto:homasbakery20@gmail.com?subject=Website%20accessibility%20help">
            Email us for accessibility help
          </a>.
        </aside>
      )}
    </>
  )
}
