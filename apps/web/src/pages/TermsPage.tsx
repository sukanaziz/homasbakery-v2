// TermsPage — static legal page at "/terms"
//
// Defines what the service does, what an order request means (vs. a
// confirmed order), the prepayment policy, cancellation/refunds, and
// the usual liability/governing-law boilerplate.

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

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-stone-600 mb-12">Effective {EFFECTIVE_DATE}</p>

        <div className="space-y-8 text-stone-700 leading-relaxed">
          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">About these terms</h2>
            <p>
              These are the terms that apply when you use the Homas Bakery website or
              place an order request through it. Plain language version: please be
              respectful, your order is a request not a contract until we both confirm,
              and we'll do our best to make great food for you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Order requests are not confirmed orders</h2>
            <p>
              When you submit your order through the form, you're sending us a
              <strong> request</strong>. It is not yet a confirmed order. We'll review
              what you've requested and contact you by email or phone to confirm:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Whether we can fulfill it on the date and time you asked for</li>
              <li>The final price (including any delivery fee, if applicable)</li>
              <li>Pickup address details, if you selected pickup</li>
              <li>How and when to send the 50% prepayment</li>
            </ul>
            <p className="mt-3">
              The order is only confirmed after we get back to you and you complete
              the prepayment. We reserve the right to decline an order request for
              any reason — for example, if we're already booked, if the request is
              outside our capacity, or if we need to focus on existing orders.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Prepayment</h2>
            <p>
              Once we confirm your order, we'll request a 50% prepayment to hold your
              spot in our baking schedule. The remaining 50% is due at pickup or
              delivery. We'll send payment instructions in our confirmation email.
            </p>
            <p className="mt-3">
              If you don't send the prepayment within the time we agree on (usually
              a few days), we may release your slot to another customer.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Cancellations and refunds</h2>
            <p>
              Plans change. Here's how we handle that:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                Cancel <strong>more than 48 hours</strong> before your pickup or delivery
                time and we'll refund the prepayment in full.
              </li>
              <li>
                Cancel <strong>between 24 and 48 hours</strong> before and we'll refund
                half the prepayment (we may have already started ingredients).
              </li>
              <li>
                Cancel <strong>less than 24 hours</strong> before and the prepayment is
                non-refundable, since the food will likely already be made.
              </li>
            </ul>
            <p className="mt-3">
              If something goes wrong on our end — we miss a confirmed order, the food
              isn't right, etc. — we'll make it right. Reach out and we'll either remake
              the order or refund you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Allergens</h2>
            <p>
              Our products are made in a home kitchen that handles wheat, dairy, eggs,
              and tree nuts (especially pistachio). Cross-contact between products is
              possible. <strong>Please tell us before ordering if you have a severe
              allergy</strong> — we'll do our best to accommodate, but we cannot
              guarantee an allergen-free product.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Use of the website</h2>
            <p>
              Please don't try to break or abuse the site — no spamming the order form,
              no automated submissions, no attempting to access the admin area. Be
              honest with the information you provide so we can actually deliver your
              order.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Limitation of liability</h2>
            <p>
              To the extent allowed by law, Homas Bakery's total liability arising from
              your use of the website or the food we provide is limited to the amount
              you paid for the relevant order. We're a small home bakery doing our best;
              please give us a chance to make things right before escalating.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Governing law</h2>
            <p>
              These terms are governed by the laws of the State of California. Any
              dispute will be resolved in a court located in Alameda County, California.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Changes</h2>
            <p>
              We may update these terms occasionally. The effective date at the top
              shows when they last changed. Continued use of the site after changes
              means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-amber-950 mb-3">Contact</h2>
            <p>
              Questions, concerns, or just want to talk to a human?{' '}
              <a href="mailto:homasbakery20@gmail.com" className="text-amber-800 underline hover:text-amber-950">
                homasbakery20@gmail.com
              </a>.
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
