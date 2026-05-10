// PrivacyPolicyPage — static legal page at "/privacy"
//
// What we collect, how we use it, who we share it with, and how to
// reach us about deletion / data requests. Plain language; not legal
// boilerplate. The bakery owner should review the contact email and
// update the effective date if anything material changes.
//
// Linked from the footer of HomePage and MenuPage, and from the small
// "by submitting" line under the order form.

import { Link } from 'react-router-dom'

const EFFECTIVE_DATE = 'May 2026'

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

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-50/80 backdrop-blur-sm border-b border-amber-200/60 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <WheatIcon className="w-6 h-6 text-amber-800" />
            <span className="font-display text-xl font-semibold text-amber-950 group-hover:text-amber-800 transition-colors">
              Homas Bakery
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-amber-800 hover:text-amber-950 transition-colors">Home</Link>
            <Link to="/menu" className="text-amber-800 hover:text-amber-950 transition-colors">Menu</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 flex-1 w-full">
        <p className="text-sm font-medium tracking-widest uppercase text-amber-700 mb-3">Legal</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-amber-950 mb-3">
          Privacy Policy
        </h1>
        <p className="text-stone-600 mb-12">Effective {EFFECTIVE_DATE}</p>

        <div className="space-y-8 text-stone-700 leading-relaxed">
          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Who we are</h2>
            <p>
              Homas Bakery is a small home-based Afghan bakery in Hayward, California.
              This Privacy Policy explains what information we collect through our website,
              what we do with it, and how to contact us if you'd like it changed or removed.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">What we collect</h2>
            <p>When you submit an order request, we collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your name</li>
              <li>Your email address</li>
              <li>Your phone number</li>
              <li>Your delivery address (only if you select delivery)</li>
              <li>The items you'd like to order, quantities, and any notes you include</li>
              <li>Your requested pickup or delivery date and time</li>
            </ul>
            <p className="mt-3">
              We do not collect or store payment card information. The 50% prepayment
              we mention during checkout is handled separately by phone, email, or in
              person — never through this website.
            </p>
            <p className="mt-3">
              We use a small session cookie when an admin signs in. We do not use any
              third-party tracking, analytics, or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">How we use it</h2>
            <p>We use the information you provide to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Contact you to confirm details, pricing, and prepayment instructions for your order</li>
              <li>Schedule and prepare your order</li>
              <li>Coordinate pickup or delivery</li>
              <li>Respond to questions you send us</li>
            </ul>
            <p className="mt-3">
              We do not sell your information, share it with advertisers, or use it for
              marketing purposes beyond following up about your specific order.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Who we share it with</h2>
            <p>
              We use a small number of service providers to operate the site. These
              providers only see the data they need to do their job, and only for that
              purpose:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Resend</strong> — sends the confirmation email when you place an
                order. They process your name and email address.
              </li>
              <li>
                <strong>Our hosting provider</strong> — stores the order in our database
                and serves the website.
              </li>
            </ul>
            <p className="mt-3">
              We never sell, rent, or trade your information to anyone.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">How long we keep it</h2>
            <p>
              We keep order records for as long as we need them to operate the business —
              typically a few years for accounting and customer service. You can request
              deletion at any time (see below).
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Your choices</h2>
            <p>
              You can email us any time to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Ask what information we have about you</li>
              <li>Correct anything that's wrong</li>
              <li>Have your information deleted</li>
              <li>Opt out of any future contact about your order</li>
            </ul>
            <p className="mt-3">
              California residents have additional rights under the California Consumer
              Privacy Act (CCPA), including the right to know what personal information
              we collect and the right to request deletion. We honor these requests for
              all customers regardless of where you live.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Security</h2>
            <p>
              We protect your information with standard practices: encrypted connections
              (HTTPS), salted password hashes for any admin accounts, rate-limited login,
              and access controls so only the bakery owner sees order details.
            </p>
            <p className="mt-3">
              No system is perfectly secure, but we take reasonable steps to keep your
              data safe.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Changes to this policy</h2>
            <p>
              We may update this policy occasionally. The effective date at the top will
              tell you when it last changed. Material changes will be reflected on this
              page; if we ever do something that significantly changes how your data is
              used, we'll let you know directly.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Contact</h2>
            <p>
              Questions about this policy or your data? Email us at{' '}
              <a href="mailto:homasbakery20@gmail.com" className="text-amber-800 underline hover:text-amber-950">
                homasbakery20@gmail.com
              </a>
              {' '}and we'll get back to you within a few days.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-amber-200">
          <Link to="/" className="text-amber-800 hover:text-amber-950 underline text-sm">
            ← Back to home
          </Link>
        </div>
      </main>

      <footer className="bg-amber-950 text-amber-200 py-10 mt-auto">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-amber-300">
          &copy; {new Date().getFullYear()} Homas Bakery
        </div>
      </footer>
    </div>
  )
}
