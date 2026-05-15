// AdminProductsPage — menu management at "/admin/products"
//
// Full CRUD for the Product table, plus image upload and reorder. The
// page has a list of products and a modal-style editor that opens when
// the admin clicks "Add Product" or "Edit" on a card.
//
// Image upload flow:
//   1. User picks a file → POST /api/admin/upload (multipart)
//   2. Backend saves it to apps/api/uploads/ and returns a URL like /uploads/<filename>
//   3. We store that URL in component state for the editor
//   4. When the form is saved, the URL goes onto the product row
//
// Ordering uses up/down arrows that hit POST /api/admin/products/:id/move.
// The backend renumbers everyone in a transaction so positions stay
// dense and unique.
import { apiUrl } from '../lib/api'
import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe, useLogout } from '../lib/auth'

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

type ProductInput = {
  name: string
  description: string | null
  priceCents: number
  imageUrl: string | null
  available: boolean
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

// --- API helpers ----------------------------------------------------------
// Each function maps to one admin endpoint. Throwing on non-OK lets
// TanStack Query's `error` handle it for us.

async function fetchAdminProducts(): Promise<Product[]> {
  const res = await fetch(apiUrl('/api/admin/products'), { credentials: 'include' })
  if (res.status === 401) throw new Error('Not authenticated')
  if (!res.ok) throw new Error('Failed to load products')
  return res.json()
}

async function createProduct(input: ProductInput): Promise<Product> {
  const res = await fetch(apiUrl('/api/admin/products'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create product')
  }
  return res.json()
}

async function updateProduct(input: { id: string; data: Partial<ProductInput> }): Promise<Product> {
  const res = await fetch(apiUrl(`/api/admin/products/${input.id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input.data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update product')
  }
  return res.json()
}

async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/products/${id}`), {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete product')
  }
}

async function moveProduct(input: { id: string; direction: 'up' | 'down' }): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/products/${input.id}/move`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ direction: input.direction }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to reorder product')
  }
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(apiUrl('/api/admin/upload'), {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Image upload failed')
  }
  const { url } = await res.json()
  return url as string
}

// --- Local helpers + styling ---------------------------------------------

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function emptyDraft(): ProductInput {
  return {
    name: '',
    description: '',
    priceCents: 0,
    imageUrl: null,
    available: true,
  }
}

const inputClass =
  'w-full px-4 py-2.5 border border-amber-200 rounded-lg bg-white text-amber-950 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors'

// --- Page -----------------------------------------------------------------

export default function AdminProductsPage() {
  const meQuery = useMe()
  const logoutMutation = useLogout()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: fetchAdminProducts,
    enabled: !!meQuery.data,
  })

  // null = no editor open. 'new' = adding a new product. <id> = editing existing.
  const [editorMode, setEditorMode] = useState<null | 'new' | string>(null)
  const [draft, setDraft] = useState<ProductInput>(emptyDraft())
  const [priceInput, setPriceInput] = useState('') // dollars as a string
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeEditor()
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeEditor()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const moveMutation = useMutation({
    mutationFn: moveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Toggle a product's `available` flag inline (no editor needed)
  const toggleAvailable = (product: Product) => {
    updateMutation.mutate({
      id: product.id,
      data: { available: !product.available },
    })
  }

  // Auth gating
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

  // ----------------------------------------
  // Editor open / close / submit handlers
  // ----------------------------------------

  function openNew() {
    setDraft(emptyDraft())
    setPriceInput('')
    setUploadError(null)
    setEditorMode('new')
  }

  function openEdit(product: Product) {
    setDraft({
      name: product.name,
      description: product.description ?? '',
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      available: product.available,
    })
    setPriceInput((product.priceCents / 100).toFixed(2))
    setUploadError(null)
    setEditorMode(product.id)
  }

  function closeEditor() {
    setEditorMode(null)
    setDraft(emptyDraft())
    setPriceInput('')
    setUploadError(null)
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setDraft((d) => ({ ...d, imageUrl: url }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const dollars = parseFloat(priceInput || '0')
    const priceCents = Math.round(dollars * 100)
    if (Number.isNaN(priceCents) || priceCents < 0) return

    const payload: ProductInput = {
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      priceCents,
      imageUrl: draft.imageUrl,
      available: draft.available,
    }

    if (editorMode === 'new') {
      createMutation.mutate(payload)
    } else if (editorMode) {
      updateMutation.mutate({ id: editorMode, data: payload })
    }
  }

  function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    deleteMutation.mutate(product.id)
  }

  const products = productsQuery.data ?? []
  const submitting = createMutation.isPending || updateMutation.isPending
  const submitError = createMutation.error?.message || updateMutation.error?.message

  // ----------------------------------------
  // Render
  // ----------------------------------------

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
              className="px-4 py-3 text-amber-700 hover:text-amber-950 transition-colors"
            >
              Orders
            </Link>
            <Link
              to="/admin/products"
              className="px-4 py-3 text-amber-950 border-b-2 border-amber-800 -mb-px"
            >
              Products
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-amber-700 mb-2">
              Manage
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-medium text-amber-950">
              Products
            </h1>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="py-2.5 px-5 bg-amber-900 hover:bg-amber-950 text-amber-50 font-medium rounded-full transition-colors"
          >
            + Add Product
          </button>
        </div>

        {productsQuery.isLoading && (
          <p className="text-stone-600">Loading products…</p>
        )}
        {productsQuery.error && (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            Failed to load products. Try refreshing.
          </p>
        )}

        {deleteMutation.error && (
          <p className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            {deleteMutation.error.message}
          </p>
        )}

        {productsQuery.data && products.length === 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 p-12 text-center">
            <WheatIcon className="w-10 h-10 text-amber-300 mx-auto mb-4" />
            <p className="font-display text-xl text-amber-950 mb-2">No products yet</p>
            <p className="text-stone-600 text-sm mb-5">
              Click "Add Product" above to add your first menu item.
            </p>
          </div>
        )}

        {/* Product list */}
        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product, idx) => {
              const isFirst = idx === 0
              const isLast = idx === products.length - 1
              const isMovingThis =
                moveMutation.isPending && moveMutation.variables?.id === product.id

              return (
                <article
                  key={product.id}
                  className={`bg-white rounded-2xl border p-5 flex flex-col transition-shadow hover:shadow-md ${
                    product.available ? 'border-amber-100' : 'border-stone-200 opacity-75'
                  }`}
                >
                  {/* Reorder buttons + position number */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-stone-500 tracking-wide">
                      #{idx + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={isFirst || isMovingThis}
                        onClick={() =>
                          moveMutation.mutate({ id: product.id, direction: 'up' })
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 disabled:opacity-30 disabled:hover:bg-amber-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={isLast || isMovingThis}
                        onClick={() =>
                          moveMutation.mutate({ id: product.id, direction: 'down' })
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 disabled:opacity-30 disabled:hover:bg-amber-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full aspect-square object-cover rounded-lg mb-4 bg-amber-50"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-amber-50 flex items-center justify-center mb-4 text-amber-300">
                      <WheatIcon className="w-12 h-12" />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-display text-lg font-semibold text-amber-950 leading-snug">
                      {product.name}
                    </h2>
                    <span className="font-display text-lg font-semibold text-amber-900 whitespace-nowrap">
                      {formatPrice(product.priceCents)}
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-sm text-stone-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-auto pt-3 border-t border-amber-100 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={product.available}
                        onChange={() => toggleAvailable(product)}
                        className="w-4 h-4 rounded border-amber-400 text-amber-800 focus:ring-amber-700 cursor-pointer"
                      />
                      <span
                        className={
                          product.available
                            ? 'text-amber-900 font-medium'
                            : 'text-stone-500'
                        }
                      >
                        {product.available ? 'Available' : 'Hidden'}
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="text-sm text-amber-800 hover:text-amber-950 font-medium underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        disabled={deleteMutation.isPending}
                        className="text-sm text-red-700 hover:text-red-900 font-medium underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* Editor modal — opens for both Add and Edit. Same form for both;
          we just track whether `editorMode` is 'new' or an existing id. */}
      {editorMode !== null && (
        <div className="fixed inset-0 bg-amber-950/50 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-amber-50 rounded-2xl shadow-xl w-full max-w-xl p-6 my-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-medium text-amber-950">
                {editorMode === 'new' ? 'Add Product' : 'Edit Product'}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="text-stone-500 hover:text-amber-950 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-amber-950 mb-2">
                  Image
                </label>
                <div className="flex items-start gap-4">
                  <div className="w-28 h-28 rounded-lg bg-white border border-amber-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {draft.imageUrl ? (
                      <img
                        src={draft.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <WheatIcon className="w-10 h-10 text-amber-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="cursor-pointer inline-block py-2 px-4 bg-white border border-amber-300 hover:border-amber-700 text-amber-900 text-sm font-medium rounded-md transition-colors">
                      {uploading ? 'Uploading…' : 'Choose image'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={uploading}
                        className="sr-only"
                      />
                    </label>
                    {draft.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, imageUrl: null }))}
                        className="block text-xs text-red-700 hover:text-red-900 underline"
                      >
                        Remove image
                      </button>
                    )}
                    <p className="text-xs text-stone-500">
                      JPEG, PNG, WebP, or GIF. Max 5 MB.
                    </p>
                    {uploadError && (
                      <p className="text-xs text-red-700">{uploadError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <label className="block">
                <span className="block text-sm font-medium text-amber-950 mb-2">
                  Name <span className="text-red-700">*</span>
                </span>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Cream Rolls"
                />
              </label>

              {/* Description */}
              <label className="block">
                <span className="block text-sm font-medium text-amber-950 mb-2">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={draft.description ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="Short description for the menu card"
                />
              </label>

              {/* Price */}
              <label className="block">
                <span className="block text-sm font-medium text-amber-950 mb-2">
                  Price (USD) <span className="text-red-700">*</span>
                </span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className={`${inputClass} pl-8`}
                    placeholder="0.00"
                  />
                </div>
              </label>

              {/* Available toggle */}
              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={draft.available}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, available: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-amber-400 text-amber-800 focus:ring-amber-700 cursor-pointer"
                />
                <span className="text-sm text-amber-950">
                  Available — shown on the public menu
                </span>
              </label>
            </div>

            {submitError && (
              <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {submitError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                disabled={submitting}
                className="py-2.5 px-5 text-amber-900 hover:bg-amber-100 font-medium rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploading}
                className="py-2.5 px-5 bg-amber-900 hover:bg-amber-950 disabled:bg-amber-300 text-amber-50 font-semibold rounded-full transition-colors"
              >
                {submitting
                  ? 'Saving…'
                  : editorMode === 'new'
                    ? 'Add Product'
                    : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
