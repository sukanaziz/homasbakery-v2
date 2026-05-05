import { useQuery } from '@tanstack/react-query'

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

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

function App() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-amber-200">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h1 className="text-4xl font-bold text-amber-900">Homas Bakery</h1>
          <p className="mt-2 text-amber-700">Fresh-baked goods, made daily.</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold text-amber-900 mb-6">Our Menu</h2>

        {isLoading && (
          <p className="text-amber-700">Loading our fresh selection...</p>
        )}

        {error && (
          <p className="text-red-700">
            Something went wrong loading our products. Please refresh.
          </p>
        )}

        {products && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <article
                key={product.id}
                className="bg-white rounded-lg shadow-sm border border-amber-100 p-6"
              >
                <h3 className="text-xl font-semibold text-amber-900">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="mt-2 text-amber-700">{product.description}</p>
                )}
                <p className="mt-4 text-2xl font-bold text-amber-900">
                  {formatPrice(product.priceCents)}
                </p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App