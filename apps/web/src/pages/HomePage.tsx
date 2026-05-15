// HomePage — public welcome page at "/"
//
// Sections, top to bottom:
//   - Sticky nav bar with logo, links, Instagram icon, "Order Now" button
//   - Hero with the headline and primary CTA
//   - Customer Favorites slideshow (auto rotating, top 4 by displayOrder)
//   - About section
//   - 3-card info grid: Made to Order / Pickup / Get in Touch
//   - Bottom CTA on a dark amber background
//   - Footer with Instagram link
//
// All decorative SVG icons are inlined below to avoid pulling in an icon
// library for what's a small handful of glyphs.
import { apiUrl, assetUrl} from '../lib/api'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

// --- Slideshow data fetching ---------------------------------------------

type Product = {
  id: string
  name: string
  description: string | null
  priceCents: number
  imageUrl: string | null
  available: boolean
}

async function fetchProducts(): Promise<Product[]> {
  const r = await fetch(apiUrl('/api/products'))
  if (!r.ok) throw new Error('Failed to fetch products')
  return r.json()
}

// --- Inline SVG icons ----------------------------------------------------
// We use a small set of decorative glyphs in just a couple of places.
// Inlining them is cheaper than installing an icon library.

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

function SparkleIcon({ className = '' }: { className?: string }) {
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
      <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
      <path d="M19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9z" />
    </svg>
  )
}

function HomeIcon({ className = '' }: { className?: string }) {
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
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  )
}

function MailIcon({ className = '' }: { className?: string }) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
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

// --- Featured Slideshow ---------------------------------------------------
//
// Auto-rotates through the top 4 products by displayOrder every 4.5
// seconds. Pauses on hover so the customer can read a description without
// it sliding away. Dots underneath the slide also let them jump manually.
//
// Each slide has a blurred copy of the image filling the box behind the
// fully-visible image, so we get a polished backdrop instead of empty
// bars when the photo's aspect ratio doesn't match the slide.

function FeaturedSlideshow() {
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const featured = (productsQuery.data ?? []).slice(0, 4)
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Auto-advance every 4.5 seconds, unless hovered
  useEffect(() => {
    if (isPaused || featured.length === 0) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % featured.length)
    }, 4000)
    return () => clearInterval(id)
  }, [isPaused, featured.length])

  // Hide the section entirely if we don't have any featured products
  if (featured.length === 0) return null

  return (
    <section className="bg-amber-50 py-20 lg:py-24 border-y border-amber-100">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium tracking-widest uppercase text-amber-700 mb-3">
            Customer Favorites
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-medium text-amber-950">
            A taste of our best
          </h2>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Slideshow window */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] max-w-3xl mx-auto rounded-3xl overflow-hidden bg-white shadow-xl">
            {featured.map((product, i) => (
              <div
                key={product.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {product.imageUrl ? (
                  <>
                    {/* Blurred backdrop — fills empty space with an artistic
                        version of the image so it doesn't look bare */}
                    <img
                      src={assetUrl(product.imageUrl)}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                    />
                    {/* The actual fully-visible image on top */}
                    <img
                      src={assetUrl(product.imageUrl)}
                      alt={product.name}
                      className="relative w-full h-full object-contain"
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                    <WheatIcon className="w-24 h-24 text-amber-400" />
                  </div>
                )}
                {/* Gradient overlay for text legibility */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-950/95 via-amber-950/60 to-transparent p-6 sm:p-8 text-left">
                  <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-1 sm:mb-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-amber-100 max-w-md text-sm sm:text-base line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {featured.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index
                    ? 'w-8 bg-amber-800'
                    : 'w-2 bg-amber-300 hover:bg-amber-500'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <Link
            to="/menu"
            className="inline-block py-3 px-8 bg-amber-900 hover:bg-amber-950 text-amber-50 font-medium rounded-full transition-all hover:shadow-lg hover:scale-[1.02]"
          >
            See the Full Menu →
          </Link>
        </div>
      </div>
    </section>
  )
}

// --- HomePage -------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      {/* Sticky header with logo, links, IG icon, and Order Now CTA */}
      <header className="bg-amber-50/80 backdrop-blur-sm border-b border-amber-200/60 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <WheatIcon className="w-6 h-6 text-amber-800" />
            <span className="font-display text-xl font-semibold text-amber-950 group-hover:text-amber-800 transition-colors">
              Homas Bakery
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-amber-950">
              Home
            </Link>
            <Link
              to="/menu"
              className="text-amber-800 hover:text-amber-950 transition-colors"
            >
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
            <Link
              to="/menu"
              className="hidden sm:inline-block py-2 px-4 bg-amber-900 hover:bg-amber-950 text-amber-50 rounded-full transition-colors"
            >
              Order Now
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — headline, tagline, CTAs. Blurred amber blobs in the
          background give the section depth without needing an image. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl"
        />

        <div className="relative mx-auto max-w-5xl px-6 py-24 lg:py-36 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-amber-700 mb-6">
            Afghan Bakery · Hayward, California
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-medium text-amber-950 leading-[1.05]">
            A taste of home,
            <br />
            <span className="italic font-light text-amber-800">baked with love.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-stone-700 max-w-2xl mx-auto leading-relaxed">
            Traditional Afghan pastries, cookies, and sweets — made by hand from
            family recipes. Order ahead for any occasion, big or small.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/menu"
              className="py-3.5 px-8 bg-amber-900 hover:bg-amber-950 text-amber-50 font-medium rounded-full transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              View the Menu →
            </Link>
            <a
              href="#about"
              className="py-3.5 px-8 text-amber-900 font-medium rounded-full transition-colors hover:bg-amber-100"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Customer Favorites slideshow — pulls top 4 products by displayOrder */}
      <FeaturedSlideshow />

      {/* About — the bakery's story */}
      <section id="about" className="bg-white py-24 border-y border-amber-100">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-amber-700 mb-4">
            Our Story
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-medium text-amber-950 mb-6">
            Family recipes, carried across continents.
          </h2>
          <p className="text-lg text-stone-700 leading-relaxed">
            Homas Bakery is a small, home-based Afghan bakery in Hayward,
            California. We bake traditional Afghan pastries, cookies, and sweets
            from recipes passed down through generations of our family. Every
            tray is mixed, shaped, and baked by hand — the way it's been done
            for as long as we can remember.
          </p>
          <p className="mt-5 text-lg text-stone-700 leading-relaxed">
            Whether it's for a wedding, an Eid celebration, a tea with friends,
            or just a quiet afternoon at home, we'd be honored to bake for you.
          </p>
        </div>
      </section>

      {/* Three-card info row: Made to Order / Pickup / Get in Touch */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-800 rounded-full mb-4">
              <SparkleIcon className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-semibold text-amber-950 mb-3">
              Made to Order
            </h3>
            <p className="text-stone-700">Each batch baked fresh</p>
            <p className="text-stone-700">just for your order</p>
            <p className="text-stone-500 text-sm mt-2">
              Submit a request anytime — we'll plan the bake around you
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-800 rounded-full mb-4">
              <HomeIcon className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-semibold text-amber-950 mb-3">
              Pickup
            </h3>
            <p className="text-stone-700">Home-based bakery</p>
            <p className="text-stone-700">Hayward, California</p>
            <p className="text-stone-500 text-sm mt-2">
              Pickup address shared by email & phone after order confirmation
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-800 rounded-full mb-4">
              <MailIcon className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-semibold text-amber-950 mb-3">
              Get in Touch
            </h3>
            <a
              href="mailto:homasbakery20@gmail.com"
              className="block text-stone-700 hover:text-amber-900 transition-colors break-words"
            >
              homasbakery20@gmail.com
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-amber-800 hover:text-amber-950 transition-colors"
            >
              <InstagramIcon className="w-4 h-4" />
              <span className="text-sm font-medium">@homasbakery</span>
            </a>
          </div>
        </div>
      </section>

      {/* Closing CTA on a dark background — last nudge to place an order */}
      <section className="relative overflow-hidden bg-amber-900 text-amber-50 py-20">
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-700/30 rounded-full blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-medium mb-4">
            Have a special order in mind?
          </h2>
          <p className="text-lg text-amber-100 mb-8">
            Whether it's a tray for an event, a gift box, or a custom request —
            tell us what you're thinking and we'll make it happen.
          </p>
          <Link
            to="/menu"
            className="inline-block py-3.5 px-8 bg-amber-50 hover:bg-white text-amber-950 font-semibold rounded-full transition-all hover:shadow-xl hover:scale-[1.02]"
          >
            Place an Order
          </Link>
        </div>
      </section>

      {/* Footer with brand wordmark, legal links, and Instagram */}
      <footer className="bg-amber-950 text-amber-200 py-10 mt-auto">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <WheatIcon className="w-5 h-5" />
            <span className="font-display text-lg font-medium text-amber-100">
              Homas Bakery
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <Link to="/privacy" className="text-amber-300 hover:text-amber-100 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-amber-300 hover:text-amber-100 transition-colors">
              Terms
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Homas Bakery on Instagram"
              className="text-amber-300 hover:text-amber-100 transition-colors"
            >
              <InstagramIcon className="w-5 h-5 inline-block" />
            </a>
            <span className="text-amber-300">
              &copy; {new Date().getFullYear()} Homas Bakery
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
