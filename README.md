# Homa's Bakery

[![CI](https://github.com/sukanaziz/homasbakery-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/sukanaziz/homasbakery-v2/actions/workflows/ci.yml)

Production e-commerce + admin tool for a small, family-run Afghan bakery in
Hayward, California. Customers browse the menu, place pickup or delivery order
requests, and receive confirmation emails. The bakery owner manages the menu,
product photos, and incoming orders from a private admin dashboard.

Live production URLs:

- Customer site: https://www.homasbakery.com
- API: https://api.homasbakery.com
- API health check: https://api.homasbakery.com/api/health

This is a full rebuild of an earlier version that was a vanilla HTML/CSS/JS +
SQLite app. The goals of this rewrite were:

- Move to a typed, modern stack so the codebase is easier to extend.
- Replace SQLite with PostgreSQL so the system can grow.
- Add a real admin experience for orders and product management.
- Allow the bakery owner to update the menu without needing a developer.
- Add production hygiene: authentication, validation, rate limiting,
  transactional email, image uploads, error tracking, CI, and AWS deployment.

## What it does

### Customer-facing site

- Welcome page with a rotating "Customer Favorites" slideshow pulled from
  products in the menu.
- Menu page with product cards including name, photo, description, price, and
  quantity selector.
- Cart bar that sticks to the bottom of the menu while items are selected.
- Order request form with customer info, pickup-or-delivery flow, delivery
  address fields, requested date/time, optional notes, and required 50%
  prepayment agreement.
- Confirmation screen with the order ID after submission.
- Confirmation email sent to the customer after an order request is placed.

### Behind the scenes

- Customer confirmation emails are sent through Resend.
- Bakery notification emails include order details, customer contact info,
  pickup/delivery details, notes, totals, and order ID.
- Customer replies go to the bakery inbox through the configured bakery email.
- Orders store price snapshots at the time of purchase so historical order
  totals remain accurate even if product prices change later.

### Admin side

- Private admin login with bcrypt-backed password verification.
- Redis-backed sessions using signed cookies.
- Orders dashboard with status badges and contextual action buttons.
- Server-validated order lifecycle transitions:
  - NEW
  - CONFIRMED
  - COMPLETED
  - CANCELLED
- Products dashboard for adding, editing, deleting, and reordering menu items.
- Product image upload with processing and validation.
- Reordering uses up/down controls and is reflected on the customer-facing menu.

## Stack

- **Frontend** — React + TypeScript + Vite, TailwindCSS v4, TanStack Query,
  and react-router-dom.
- **Backend** — Node.js + Express + TypeScript with Zod request validation.
- **Database** — PostgreSQL with Prisma as the ORM and migration tool.
- **Sessions** — Redis using `connect-redis` + `express-session`.
- **Authentication** — bcrypt password hashing with server-side session storage.
- **Email** — Resend with the `homasbakery.com` sending domain.
- **Image upload** — `multer` + Sharp image processing. Product images are
  currently stored on the API host and served through the API domain; moving
  uploads to S3 is planned as a future improvement.
- **Security** — Helmet response headers, signed cookies, production CORS
  allowlist, Zod validation, and rate limiting for sensitive routes.
- **Monitoring** — Sentry error tracking.
- **Testing** — Vitest test suite.
- **CI** — GitHub Actions typechecks and runs tests on every push.
- **Deployment** — AWS EC2, RDS PostgreSQL, Docker, Redis, Nginx, Certbot,
  S3, CloudFront, ACM, and GoDaddy DNS.

## Production architecture

The production deployment uses separate frontend and backend hosts:

- `https://www.homasbakery.com` serves the React frontend through S3 +
  CloudFront.
- `https://api.homasbakery.com` serves the Express API through Nginx on EC2.

Current production architecture:

- React/Vite frontend hosted in S3.
- CloudFront serves the frontend with HTTPS and React route fallbacks.
- Express/TypeScript API runs as a Docker container on EC2.
- Nginx reverse proxies HTTPS API traffic to the Dockerized API on port 3000.
- PostgreSQL production database is hosted on AWS RDS.
- Redis runs in Docker on EC2 for session storage.
- SSL/TLS is configured with ACM for the frontend and Certbot for the API.
- GoDaddy DNS points the production domains to CloudFront and EC2.

## Move to Render

The root `render.yaml` defines one Node web service. It builds the frontend
and API together, and the API serves the frontend on the same origin. It does
not create a Postgres database, Key Value instance, or persistent disk. Create
or keep those resources separately, in the same Render region as the web
service, and set `DATABASE_URL` and `REDIS_URL` on the service. Product images
are stored on the service filesystem and can be lost on redeploy or restart
unless persistent storage or object storage is configured.

### Fresh start without AWS

1. Push this repository, including `render.yaml`, to GitHub. In Render, create
  or update the Blueprint and review its one web service. Provision Postgres
  and Key Value separately if they do not already exist. Set the service's
  `DATABASE_URL` and `REDIS_URL` to the connection URLs for those Render
  resources; use their internal URLs when connecting within the same region.
2. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` directly in Render. The
  API applies Prisma migrations on startup. The Blueprint's seed hook runs
  only after a service's first successful deploy. If this is an existing
  service, run `cd apps/api && npx prisma db seed` once from its Render Shell
  after the first deploy. Confirm the admin is ready in the logs, then remove
  both `SEED_ADMIN_*` variables.
3. Configure `RESEND_API_KEY` if order emails should send. Set `SENTRY_DSN`
  and the frontend build variable `VITE_SENTRY_DSN` if error reporting is used.
4. Sign in to the admin dashboard and add products and photos again. A fresh
  database has no old products, orders, or admin accounts; those can only be
  recovered from an AWS backup or another copy.
5. Test the API health check, menu, image uploads, order submission, email,
  and admin login. To use a custom domain, add it to the Render web service
  and point its DNS record at the target shown in Render. Do not remove email
  MX or TXT records. Set `FRONTEND_URL` to the actual site origin and leave
  `VITE_API_URL` empty when the API and frontend share that origin.

## Project layout

```txt
homasbakery-v2/
├── apps/
│   ├── web/                  React frontend (Vite)
│   │   └── src/
│   │       ├── pages/        One file per top-level route
│   │       └── lib/          Shared client helpers
│   └── api/                  Express backend
│       ├── src/
│       │   ├── index.ts      Routes, middleware, and server bootstrap
│       │   ├── instrument.ts Sentry/server instrumentation
│       │   ├── mailer.ts     Resend email templates and send logic
│       │   └── lib/          Shared backend helpers and schemas
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── seed.ts       Creates the first admin user
│       │   └── migrations/   Versioned SQL migrations
│       └── uploads/          Product images in local/dev usage
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
└── package-lock.json