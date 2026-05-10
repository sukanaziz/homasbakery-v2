// AdminDashboardPage — order management at "/admin"
//
// Lists every order (newest first) and lets the bakery owner walk each
// one through its lifecycle: NEW → CONFIRMED → COMPLETED, or cancel at
// any point before completion. Status transitions are validated server
// side; the buttons we render here just hide the moves that aren't
// allowed from the current state.
//
// Auth flow is "render-or-redirect": useMe() tells us whether someone's
// logged in. If not, <Navigate /> bounces them to /admin/login before
// any of the dashboard renders.

import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe, useLogout } from '../lib/auth'

// --- Types ----------------------------------------------------------------

type OrderStatus = 'NEW' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
type NextStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

type OrderItem = {
  id: string
  quantity: number
  priceCents: number
  product: {
    id: string
    name: string
  }
}

type Order = {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  fulfillmentType: 'PICKUP' | 'DELIVERY'
  deliveryAddress: string | null
  requestedDate: string
  notes: string | null
  status: OrderStatus
  items: OrderItem[]
  createdAt: string
}

// --- Inline icon ----------------------------------------------------------

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

// --- Helpers --------------------------------------------------------------
// Formatters, status-badge styling, and the API call wrappers used by the
// useQuery / useMutation hooks below.

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'NEW':
      return 'bg-blue-100 text-blue-900 border border-blue-200'
    case 'CONFIRMED':
      return 'bg-amber-100 text-amber-900 border border-amber-300'
    case 'COMPLETED':
      return 'bg-green-100 text-green-900 border border-green-200'
    case 'CANCELLED':
      return 'bg-stone-200 text-stone-700 border border-stone-300'
  }
}

function allowedNextStatuses(current: OrderStatus): NextStatus[] {
  switch (current) {
    case 'NEW':
      return ['CONFIRMED', 'CANCELLED']
    case 'CONFIRMED':
      return ['COMPLETED', 'CANCELLED']
    case 'COMPLETED':
    case 'CANCELLED':
      return []
  }
}

function actionButtonStyle(action: NextStatus): string {
  switch (action) {
    case 'CONFIRMED':
      return 'bg-amber-700 hover:bg-amber-800 text-white'
    case 'COMPLETED':
      return 'bg-green-700 hover:bg-green-800 text-white'
    case 'CANCELLED':
      return 'bg-stone-200 hover:bg-stone-300 text-stone-900'
  }
}

function actionButtonLabel(action: NextStatus): string {
  switch (action) {
    case 'CONFIRMED':
      return 'Confirm'
    case 'COMPLETED':
      return 'Mark Completed'
    case 'CANCELLED':
      return 'Cancel'
  }
}

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch('/api/orders', { credentials: 'include' })
  if (res.status === 401) throw new Error('Not authenticated')
  if (!res.ok) throw new Error('Failed to fetch orders')
  return res.json()
}

async function updateOrderStatus(input: {
  id: string
  status: NextStatus
}): Promise<Order> {
  const res = await fetch(`/api/orders/${input.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status: input.status }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update status')
  }
  return res.json()
}

// --- Page -----------------------------------------------------------------

export default function AdminDashboardPage() {
  const meQuery = useMe()
  const logoutMutation = useLogout()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled: !!meQuery.data,
  })

  const updateStatusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-stone-600">Checking access…</p>
      </div>
    )
  }

  if (!meQuery.data) {
    return <Navigate to="/admin/login" replace />
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync()
    navigate('/admin/login')
  }

  const orderTotal = (order: Order): number =>
    order.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)

  const orders = ordersQuery.data ?? []
  const newCount = orders.filter((o) => o.status === 'NEW').length
  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-white border-b border-amber-100">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <WheatIcon className="w-6 h-6 text-amber-800" />
              <span className="font-display text-xl font-semibold text-amber-950 group-hover:text-amber-800 transition-colors">
                Homas Bakery
              </span>
            </Link>
            <span className="hidden sm:inline-block text-stone-300">/</span>
            <span className="hidden sm:inline-block text-stone-600 text-sm">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:block text-sm text-stone-600">
              {meQuery.data.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-sm text-amber-800 hover:text-amber-950 underline transition-colors"
            >
              {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {/* Admin sub-nav */}
        <div className="mx-auto max-w-6xl px-6 -mt-px">
          <div className="flex gap-1 text-sm font-medium border-b border-amber-100">
            <Link
              to="/admin"
              className="px-4 py-3 text-amber-950 border-b-2 border-amber-800 -mb-px"
            >
              Orders
            </Link>
            <Link
              to="/admin/products"
              className="px-4 py-3 text-amber-700 hover:text-amber-950 transition-colors"
            >
              Products
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Page heading + summary */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-amber-700 mb-2">
              Dashboard
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-medium text-amber-950">
              Order Requests
            </h1>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 font-medium">
              {newCount} New
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-medium">
              {confirmedCount} Confirmed
            </span>
            <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-900 border border-green-200 font-medium">
              {completedCount} Completed
            </span>
          </div>
        </div>

        {ordersQuery.isLoading && (
          <p className="text-stone-600">Loading orders…</p>
        )}
        {ordersQuery.error && (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            Failed to load orders. Try refreshing.
          </p>
        )}

        {ordersQuery.data && ordersQuery.data.length === 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 p-12 text-center">
            <WheatIcon className="w-10 h-10 text-amber-300 mx-auto mb-4" />
            <p className="font-display text-xl text-amber-950 mb-2">No orders yet</p>
            <p className="text-stone-600 text-sm">
              They'll show up here as customers submit them.
            </p>
          </div>
        )}

        {updateStatusMutation.error && (
          <p className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            {updateStatusMutation.error.message}
          </p>
        )}

        {ordersQuery.data && ordersQuery.data.length > 0 && (
          <div className="space-y-4">
            {ordersQuery.data.map((order) => {
              const nextStatuses = allowedNextStatuses(order.status)
              const isUpdatingThisOrder =
                updateStatusMutation.isPending &&
                updateStatusMutation.variables?.id === order.id

              return (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl border border-amber-100 p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${statusBadgeClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                        <span className="text-xs text-stone-500">
                          {formatDateTime(order.createdAt)}
                        </span>
                      </div>
                      <h2 className="mt-2 font-display text-xl font-semibold text-amber-950">
                        {order.customerName}
                      </h2>
                      <p className="text-sm text-stone-600 break-all">
                        {order.customerEmail} • {order.customerPhone}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-display text-2xl font-semibold text-amber-900">
                        {formatPrice(orderTotal(order))}
                      </div>
                      <div className="text-xs text-stone-600 mt-1">
                        {order.fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}{' '}
                        — {formatDate(order.requestedDate)}
                      </div>
                    </div>
                  </div>

                  {order.fulfillmentType === 'DELIVERY' && order.deliveryAddress && (
                    <div className="mt-4 text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <span className="font-medium">Delivery to:</span>{' '}
                      {order.deliveryAddress}
                    </div>
                  )}

                  <ul className="mt-5 divide-y divide-amber-100 border-y border-amber-100">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="py-2.5 flex justify-between text-sm"
                      >
                        <span className="text-amber-950">
                          {item.quantity} × {item.product.name}
                        </span>
                        <span className="text-amber-950 font-medium">
                          {formatPrice(item.priceCents * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <div className="mt-4 text-sm text-stone-700">
                      <span className="font-medium text-amber-950">Notes:</span>{' '}
                      {order.notes}
                    </div>
                  )}

                  {nextStatuses.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {nextStatuses.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          type="button"
                          disabled={isUpdatingThisOrder}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: order.id,
                              status: nextStatus,
                            })
                          }
                          className={`py-2 px-4 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${actionButtonStyle(
                            nextStatus
                          )}`}
                        >
                          {isUpdatingThisOrder &&
                          updateStatusMutation.variables?.status === nextStatus
                            ? 'Updating…'
                            : actionButtonLabel(nextStatus)}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
