// Auth hooks shared by every admin page.
//
// The pattern here is: useMe() reads the current logged-in admin (cached
// via TanStack Query under the key ['me']), and useLogin / useLogout are
// mutation hooks that update that cache directly so the entire app sees
// the new auth state instantly without an extra round trip.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type Admin = {
  id: string
  email: string
  name: string
}

// --- API calls ------------------------------------------------------------
//
// `credentials: 'include'` is what tells the browser to send our session
// cookie cross-origin (frontend on :5173, API on :3000). Without it
// every request would be unauthenticated.

async function fetchMe(): Promise<Admin | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  // 401 is a normal answer for "not logged in" — return null instead of
  // treating it as an error.
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Failed to fetch auth state')
  return res.json()
}

async function login(input: { email: string; password: string }): Promise<Admin> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    // Try to surface the server's friendly error message ("Invalid
    // email or password") rather than a generic one.
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Login failed')
  }
  return res.json()
}

async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Logout failed')
}

// --- Hooks ----------------------------------------------------------------

/**
 * Read the currently logged-in admin (or null when logged out).
 * Used by every admin page to decide whether to render or redirect.
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    // 401 is a valid answer ("not logged in"), not a transient failure —
    // don't retry it, just resolve to null.
    retry: false,
    // Re-check at most once a minute to avoid hammering /api/auth/me on
    // every navigation.
    staleTime: 1000 * 60,
  })
}

/**
 * Login mutation. On success, write the new admin into the ['me'] cache
 * directly so any component using useMe() updates immediately — no
 * second network request needed.
 */
export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (admin) => {
      qc.setQueryData(['me'], admin)
    },
  })
}

/**
 * Logout mutation. On success, null out the ['me'] cache so every page
 * that depends on it (the dashboard, the products page) instantly knows
 * to redirect to the login screen.
 */
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.setQueryData(['me'], null)
    },
  })
}
