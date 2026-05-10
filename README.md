# Homas Bakery

Production e-commerce + admin tool for a small, family-run Afghan bakery in
Hayward, California. Customers browse the menu, place pickup or delivery
order requests, and receive a confirmation email. The bakery owner manages
the menu, photos, and incoming orders from a private admin dashboard.

This is a full rebuild of an earlier version that was a vanilla
HTML/CSS/JS + SQLite app. The goals of this rewrite were:

- Move to a typed, modern stack so the codebase is easier to extend.
- Replace SQLite with Postgres so the system can grow.
- Add a real admin experience (orders + product management) so the
  bakery owner doesn't need a developer to update the menu.
- Layer in real production hygiene (auth, validation, rate limits,
  transactional email, image uploads).

## What it does

**Customer-facing site**

- Welcome page with a rotating "Customer Favorites" slideshow pulled
  from whatever's at the top of the menu order.
- Menu page with product cards (name, photo, description, price) and
  a quantity selector on each card.
- Cart bar that sticks to the bottom of the menu while items are selected.
- Order request form: customer info, pickup-or-delivery toggle (delivery
  shows an address field and notes that a delivery fee will be added on
  confirmation), date + time picker, optional notes, required 50%
  prepayment agreement checkbox.
- Confirmation screen with the order ID after submission.

**Behind the scenes**

- A confirmation email goes out to the customer (FROM `orders@homasbakery.com`)
  via Resend. Their `Reply-To` is the bakery's Gmail so a customer reply
  lands in the bakery's actual inbox.
- A separate notification email goes to the bakery owner with all the
  order details, customer contact info, and totals.

**Admin side (`/admin/*`)**

- Email + password login backed by bcrypt + Redis-stored sessions.
- Orders dashboard with status badges (NEW / CONFIRMED / COMPLETED /
  CANCELLED) and contextual action buttons that walk an order through
  its lifecycle. Status transitions are validated server-side.
- Products dashboard for adding, editing, deleting, and reordering menu
  items. Image upload is built in. Reordering uses up/down arrows;
  display order is reflected on the customer site.

## Stack

- **Frontend** — React + TypeScript + Vite, TailwindCSS v4, TanStack Query
  for server state, react-router-dom for routing.
- **Backend** — Node.js + Express + TypeScript with Zod for input validation.
- **Database** — PostgreSQL with Prisma as the ORM and migration tool.
- **Sessions** — Redis (via `connect-redis` + `express-session`).
- **Email** — Resend with a verified `homasbakery.com` sending domain.
- **Image upload** — `multer` to local disk in dev; will move to S3 in prod.
- **Security** — `helmet` for response headers, `express-rate-limit` for
  login + order spam protection, signed cookies, CORS lock to the local
  frontend origin.
- **Local infra** — Docker Compose runs Postgres and Redis so the dev
  setup is "clone and `npm run dev`."

## Project layout

```
homasbakery-v2/
├── apps/
│   ├── web/                React frontend (Vite)
│   │   └── src/
│   │       ├── pages/      One file per top-level route
│   │       └── lib/        Shared client helpers (auth hooks)
│   └── api/                Express backend
│       ├── src/
│       │   ├── index.ts    Routes, middleware, server bootstrap
│       │   └── mailer.ts   Resend email templates + send logic
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── seed.ts     Creates the first admin user
│       │   └── migrations/ Versioned SQL — committed
│       └── uploads/        Product images in dev
├── docker-compose.yml
└── package.json            npm workspaces root
```

## Running locally

Requires Docker Desktop and Node 20+.

```bash
# 1. Start Postgres + Redis containers
docker compose up -d

# 2. Install all workspace deps
npm install

# 3. Apply database migrations and generate the Prisma client
cd apps/api && npx prisma migrate dev && cd ../..

# 4. Seed the first admin user (uses values from apps/api/.env)
cd apps/api && npx prisma db seed && cd ../..

# 5. Start both frontend and backend dev servers
npm run dev
```

Then open:

- `http://localhost:5173/` — customer site
- `http://localhost:5173/admin/login` — admin (bookmark this; there is no link to it from the public pages)
- `http://localhost:3000/api/health` — API health probe

### Required env vars

Live in `apps/api/.env`. A real `.env` is gitignored; the keys you need are:

```
DATABASE_URL          Postgres connection string
SESSION_SECRET        Used to sign session cookies
REDIS_URL             redis://localhost:6379 in dev
RESEND_API_KEY        From resend.com
FROM_EMAIL            "Homas Bakery <orders@homasbakery.com>"
BAKERY_EMAIL          Where bakery notifications get sent
SEED_ADMIN_EMAIL      Used by prisma/seed.ts
SEED_ADMIN_PASSWORD   Plaintext; the seed script bcrypts it
SEED_ADMIN_NAME       Display name for the admin
```

## Status

🚧 Active development. Live v1 site (vanilla JS + SQLite) still serves
real customer orders at homasbakery.com on Render. v2 will replace it
once the cutover plan (DNS swap, data migration, AWS deployment) lands.
