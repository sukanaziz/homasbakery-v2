// AdminLoginPage — sign-in page at "/admin/login"
//
// Only reachable by typing the URL directly (no link from public pages).
// If a user is already logged in, we redirect them straight to /admin
// instead of showing the form again.
//
// On successful login, useLogin() updates the cached ['me'] query so the
// rest of the app sees the new auth state, then we navigate to /admin.
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMe, useLogin } from '../lib/auth'

function WheatIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22V8" />
      <path d="M12 8c0-2 2-3 4-3s2 3 0 4-4 1-4-1Z" />
      <path d="M12 8c0-2-2-3-4-3s-2 3 0 4 4 1 4-1Z" />
      <path d="M12 13c0-2 2-3 4-3s2 3 0 4-4 1-4-1Z" />
      <path d="M12 13c0-2-2-3-4-3s-2 3 0 4 4 1 4-1Z" />
      <path d="M12 18c0-2 2-3 4-3s2 3 0 4-4 1-4-1Z" />
      <path d="M12 18c0-2-2-3-4-3s-2 3 0 4 4 1 4-1Z" />
    </svg>
  )
}

export default function AdminLoginPage() {
  const meQuery = useMe()
  const loginMutation = useLogin()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (meQuery.data) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await loginMutation.mutateAsync({ email: email.trim(), password })
      navigate('/admin')
    } catch {
      // error surface comes from mutation.error
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-6 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-amber-800 hover:text-amber-950 transition-colors mb-6"
          >
            <WheatIcon className="w-5 h-5" />
            <span className="font-display text-lg">Homas Bakery</span>
          </Link>
          <h1 className="font-display text-3xl md:text-4xl font-medium text-amber-950">
            Admin Sign In
          </h1>
          <p className="mt-3 text-stone-600">Manage orders and the menu.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 space-y-5"
        >
          <label className="block">
            <span className="block text-sm font-medium text-amber-950 mb-2">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-lg bg-white text-amber-950 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-amber-950 mb-2">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-lg bg-white text-amber-950 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors"
            />
          </label>

          {loginMutation.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {loginMutation.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3 px-6 bg-amber-900 hover:bg-amber-950 disabled:bg-amber-300 text-amber-50 font-semibold rounded-full transition-all hover:shadow-md"
          >
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-6">
          ← Customers, head to the{' '}
          <Link to="/" className="underline hover:text-amber-800">
            home page
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
