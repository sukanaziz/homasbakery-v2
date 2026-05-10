// MenuPage — public order flow at "/menu"
//
// One component handles three "views" via local state:
//   - browse:  product grid with quantity selectors and a sticky cart bar
//   - form:    customer info + pickup/delivery + date/time + prepayment checkbox
//   - success: thank-you screen with the order ID
//
// Cart state is a plain Record<productId, quantity> kept in this component.
// We don't persist it across page reloads — orders are usually built and
// submitted in one sitting, and the form is short enough that this is fine.

import { useState, useMemo, type FormEvent, type ReactNode } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

// --- Types ----------------------------------------------------------------

type Product = {
  id: string
  name: string
  description: string | null
  priceCents: number
  imageUrl: string | null
  available: boolean
  createdAt: string
  updatedAt: string
}

type CartItem = { product: Product; quantity: number }

type CreateOrderInput = {
  customerName: string
  customerEmail: string
  customerPhone: string
  fulfillmentType: 'PICKUP' | 'DELIVERY'
  deliveryAddress?: string
  requestedDate: string
  notes?: string
  items: { productId: string; quantity: number }[]
}

type CreatedOrder = {
  id: string
  fulfillmentType: 'PICKUP' | 'DELIVERY'
}

// --- Inline icons (kept consistent with HomePage) -------------------------

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

function InstagramIcon({ className = '' }: { className?: string }) {
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
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

const INSTAGRAM_URL = 'https://www.instagram.com/homasbakery/'

// --- Formatting + API helpers ---------------------------------------------

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// Returns the earliest selectable datetime-local value: tomorrow at the
// current time, in the user's local timezone.
// (datetime-local inputs always expect local time, NOT UTC.)
function getMinDateTimeString(): string {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`
}

async function fetchProducts(): Promise<Product[]> {
  const r = await fetch('/api/products')
  if (!r.ok) throw new Error('Failed to fetch products')
  return r.json()
}

async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const r = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to submit order')
  }
  return r.json()
}

// --- Reusable form field --------------------------------------------------
// Tiny wrapper that pairs a styled label with whatever input goes inside.

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-amber-950 mb-2">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full px-4 py-2.5 border border-amber-200 rounded-lg bg-white text-amber-950 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors'

// --- MenuPage -------------------------------------------------------------

export default function MenuPage() {
  const [view, setView] = useState<'browse' | 'form' | 'success'>('browse')
  const [cart, setCart] = useState<Record<string, number>>({})

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [requestedDate, setRequestedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [agreedToPrepayment, setAgreedToPrepayment] = useState(false)

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => setView('success'),
  })

  const cartItems: CartItem[] = useMemo(() => {
    if (!productsQuery.data) return []
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, quantity]) => {
        const product = productsQuery.data!.find((p) => p.id === id)
        return product ? { product, quantity } : null
      })
      .filter((x): x is CartItem => x !== null)
  }, [cart, productsQuery.data])

  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const prepaymentAmount = Math.round(cartSubtotal * 0.5)

  const setQty = (id: string, q: number) => {
    setCart((prev) => {
      const next = { ...prev }
      if (q <= 0) delete next[id]
      else next[id] = Math.min(q, 99)
      return next
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!agreedToPrepayment) return

    const items = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => ({ productId, quantity }))
    if (items.length === 0) return

    createOrderMutation.mutate({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      fulfillmentType,
      deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
      requestedDate: new Date(requestedDate).toISOString(),
      notes: notes.trim() || undefined,
      items,
    })
  }

  const resetAll = () => {
    setCart({})
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setFulfillmentType('PICKUP')
    setDeliveryAddress('')
    setRequestedDate('')
    setNotes('')
    setAgreedToPrepayment(false)
    createOrderMutation.reset()
    setView('browse')
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-32 flex flex-col">
      {/* Same sticky nav as HomePage so customers feel like they haven't left */}
      <header className="bg-amber-50/80 backdrop-blur-sm border-b border-amber-200/60 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <WheatIcon className="w-6 h-6 text-amber-800" />
            <span className="font-display text-xl font-semibold text-amber-950 group-hover:text-amber-800 transition-colors">
              Homas Bakery
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              to="/"
              className="text-amber-800 hover:text-amber-950 transition-colors"
            >
              Home
            </Link>
            <Link to="/menu" className="text-amber-950">
              Menu
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Homas Bakery on Instagram"
              className="text-amber-800 hover:text-amber-950 transition-colors"
            >
              <InstagramIcon className="w-5 h-5" />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 lg:py-16 flex-1 w-full">
        {/* BROWSE — product grid with quantity selectors */}
        {view === 'browse' && (
          <>
            <div className="text-center mb-8">
              <p className="text-sm font-medium tracking-widest uppercase text-amber-700 mb-3">
                Afghan Pastries · Cookies · Sweets
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-medium text-amber-950 mb-3">
                Today's offerings
              </h1>
              <p className="text-stone-600 max-w-xl mx-auto">
                Pick what you'd like and we'll confirm the details with you directly.
              </p>
            </div>

            {/* Allergen disclosure — required for any food business in
                California, and important for customer safety. Always
                visible above the product grid. */}
            <div className="max-w-3xl mx-auto mb-10 bg-amber-100/70 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              <strong>Allergen notice:</strong> Our products are made in a home kitchen
              that handles wheat, dairy, eggs, and tree nuts (especially pistachio).
              Cross-contact is possible. Please tell us before ordering if you have a
              severe allergy.
            </div>

            {productsQuery.isLoading && (
              <p className="text-center text-stone-600">Loading our fresh selection…</p>
            )}
            {productsQuery.error && (
              <p className="text-center text-red-700">
                Something went wrong loading products. Please refresh.
              </p>
            )}

            {productsQuery.data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {productsQuery.data.map((product) => {
                  const qty = cart[product.id] ?? 0
                  return (
                    <article
                      key={product.id}
                      className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden flex flex-col hover:shadow-md hover:border-amber-200 transition-all"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full aspect-square object-cover bg-amber-50"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-amber-50 flex items-center justify-center text-amber-300">
                          <WheatIcon className="w-16 h-16" />
                        </div>
                      )}
                      <div className="p-6 flex flex-col flex-1">
                      <h3 className="font-display text-2xl font-semibold text-amber-950">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="mt-3 text-stone-600 leading-relaxed flex-1">
                          {product.description}
                        </p>
                      )}
                      <p className="mt-6 font-display text-3xl font-medium text-amber-900">
                        {formatPrice(product.priceCents)}
                      </p>
                      <div className="mt-5">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => setQty(product.id, 1)}
                            className="w-full py-3 px-4 bg-amber-900 hover:bg-amber-950 text-amber-50 font-medium rounded-full transition-colors"
                          >
                            Add to order
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-amber-50 rounded-full p-1">
                            <button
                              type="button"
                              onClick={() => setQty(product.id, qty - 1)}
                              aria-label="Decrease quantity"
                              className="w-10 h-10 flex items-center justify-center bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-full shadow-sm transition-colors"
                            >
                              −
                            </button>
                            <span className="text-lg font-semibold text-amber-950">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(product.id, qty + 1)}
                              aria-label="Increase quantity"
                              className="w-10 h-10 flex items-center justify-center bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-full shadow-sm transition-colors"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* FORM — customer info + pickup/delivery + date/time + prepayment */}
        {view === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-3xl md:text-4xl font-medium text-amber-950">
                Your Order Request
              </h1>
              <button
                type="button"
                onClick={() => setView('browse')}
                className="text-sm text-amber-800 hover:text-amber-950 underline"
              >
                ← Back to menu
              </button>
            </div>

            {/* Items summary */}
            <section className="bg-white rounded-2xl border border-amber-100 p-6">
              <h2 className="font-display text-xl font-semibold text-amber-950 mb-4">
                Items
              </h2>
              <ul className="divide-y divide-amber-100">
                {cartItems.map((item) => (
                  <li key={item.product.id} className="py-3 flex justify-between">
                    <span className="text-amber-950">
                      {item.quantity} × {item.product.name}
                    </span>
                    <span className="text-amber-950 font-medium">
                      {formatPrice(item.product.priceCents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-amber-200 flex justify-between text-lg font-semibold text-amber-950">
                <span>Subtotal</span>
                <span>{formatPrice(cartSubtotal)}</span>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Subtotal — final pricing confirmed by the bakery
              </p>
            </section>

            {/* Customer info */}
            <section className="bg-white rounded-2xl border border-amber-100 p-6 space-y-4">
              <h2 className="font-display text-xl font-semibold text-amber-950">
                Your Info
              </h2>
              <FormField label="Name" required>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Email" required>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Phone" required>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={inputClass}
                />
              </FormField>
            </section>

            {/* Fulfillment */}
            <section className="bg-white rounded-2xl border border-amber-100 p-6 space-y-4">
              <h2 className="font-display text-xl font-semibold text-amber-950">
                Pickup or Delivery
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="PICKUP"
                    checked={fulfillmentType === 'PICKUP'}
                    onChange={() => setFulfillmentType('PICKUP')}
                    className="sr-only peer"
                  />
                  <div className="border-2 border-amber-200 peer-checked:border-amber-800 peer-checked:bg-amber-50 rounded-xl p-5 text-center transition-all">
                    <div className="font-display text-lg font-semibold text-amber-950">
                      Pickup
                    </div>
                    <div className="text-sm text-stone-600 mt-1">From our kitchen</div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="DELIVERY"
                    checked={fulfillmentType === 'DELIVERY'}
                    onChange={() => setFulfillmentType('DELIVERY')}
                    className="sr-only peer"
                  />
                  <div className="border-2 border-amber-200 peer-checked:border-amber-800 peer-checked:bg-amber-50 rounded-xl p-5 text-center transition-all">
                    <div className="font-display text-lg font-semibold text-amber-950">
                      Delivery
                    </div>
                    <div className="text-sm text-stone-600 mt-1">To your address</div>
                  </div>
                </label>
              </div>

              {fulfillmentType === 'PICKUP' && (
                <p className="text-sm text-stone-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
                  Our pickup address will be shared with you by email and phone
                  once we confirm your order.
                </p>
              )}

              {fulfillmentType === 'DELIVERY' && (
                <>
                  <FormField label="Delivery Address" required>
                    <textarea
                      required
                      rows={3}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={inputClass}
                      placeholder="Street, City, ZIP"
                    />
                  </FormField>
                  <p className="text-sm text-stone-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
                    A delivery fee will be added when we confirm your order.
                  </p>
                </>
              )}

              <FormField
                label={fulfillmentType === 'PICKUP' ? 'Pickup Date & Time' : 'Delivery Date & Time'}
                required
              >
                <input
                  type="datetime-local"
                  required
                  min={getMinDateTimeString()}
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className={inputClass}
                />
              </FormField>
            </section>

            {/* Notes */}
            <section className="bg-white rounded-2xl border border-amber-100 p-6">
              <FormField label="Notes (optional)">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                  placeholder="Allergies, special requests, occasion details, etc."
                />
              </FormField>
            </section>

            {/* Prepayment agreement */}
            <section className="bg-amber-100/70 rounded-2xl border-2 border-amber-300 p-6">
              <h2 className="font-display text-xl font-semibold text-amber-950 mb-3">
                Prepayment Agreement
              </h2>
              <p className="text-sm text-amber-900 leading-relaxed mb-4">
                Once we confirm your order, we'll request a <strong>50% prepayment</strong> to
                hold your spot in the bake schedule. We'll send payment instructions
                by email. The remaining balance is due at pickup or delivery.
              </p>
              {cartSubtotal > 0 && (
                <p className="text-sm text-amber-900 mb-4">
                  Estimated 50% prepayment on this order:{' '}
                  <strong>{formatPrice(prepaymentAmount)}</strong>{' '}
                  <span className="text-amber-700">(of {formatPrice(cartSubtotal)})</span>
                </p>
              )}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={agreedToPrepayment}
                  onChange={(e) => setAgreedToPrepayment(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-amber-400 text-amber-800 focus:ring-amber-700 cursor-pointer"
                />
                <span className="text-sm text-amber-950 leading-snug">
                  I agree to submit a 50% prepayment after my order is confirmed.
                  <span className="text-red-700"> *</span>
                </span>
              </label>
            </section>

            {createOrderMutation.error && (
              <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {createOrderMutation.error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={createOrderMutation.isPending || !agreedToPrepayment}
              className="w-full py-4 px-6 bg-amber-900 hover:bg-amber-950 disabled:bg-amber-300 disabled:cursor-not-allowed text-amber-50 font-semibold rounded-full transition-all hover:shadow-lg disabled:hover:shadow-none"
            >
              {createOrderMutation.isPending ? 'Sending…' : 'Submit Order Request'}
            </button>

            <p className="text-center text-xs text-stone-500">
              By submitting, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-amber-800">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-amber-800">Privacy Policy</Link>.
            </p>
          </form>
        )}

        {/* SUCCESS — thank you + order ID, plus a button to start over */}
        {view === 'success' && createOrderMutation.data && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-amber-100 p-10 text-center space-y-5 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-2">
              <WheatIcon className="w-8 h-8 text-amber-800" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-medium text-amber-950">
              Thanks for your order!
            </h1>
            <p className="text-stone-700 leading-relaxed">
              We've received your request. We'll contact you at the email and phone
              you provided to confirm details
              {createOrderMutation.data.fulfillmentType === 'DELIVERY'
                ? ', the delivery fee, '
                : ', '}
              and to send 50% prepayment instructions.
            </p>
            <p className="text-xs text-stone-500 bg-amber-50 rounded-lg p-3 font-mono break-all">
              Order ID: {createOrderMutation.data.id}
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="mt-2 py-3 px-8 bg-amber-900 hover:bg-amber-950 text-amber-50 font-medium rounded-full transition-colors"
            >
              Place another order
            </button>
          </div>
        )}
      </main>

      {/* Sticky cart bar — only renders on the browse view when items > 0 */}
      {view === 'browse' && cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-amber-200 shadow-lg z-20">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-amber-950">
                {cartCount} item{cartCount === 1 ? '' : 's'} •{' '}
                {formatPrice(cartSubtotal)}
              </div>
              <div className="text-xs text-stone-500">
                Final pricing confirmed by the bakery
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView('form')}
              className="py-3 px-6 bg-amber-900 hover:bg-amber-950 text-amber-50 font-semibold rounded-full transition-colors"
            >
              Review Order →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
