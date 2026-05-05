# Homas Bakery v2

Production rebuild of [homasbakery.com](https://homasbakery.com) — a full-stack e-commerce platform for a local Bay Area bakery — using a modern, type-safe, container-first stack.

## Stack

- **Frontend:** React 18 + TypeScript + Vite, TailwindCSS, TanStack Query
- **Backend:** Node.js + Express + TypeScript, Zod for runtime validation
- **Database:** PostgreSQL with Prisma ORM (migrated from SQLite in v1)
- **Cache / Sessions:** Redis
- **Testing:** Vitest (unit), Playwright (end-to-end)
- **Infra:** Docker Compose for local dev, GitHub Actions CI

## Project Structure
homasbakery-v2/
├── apps/
│   ├── web/    # React frontend
│   └── api/    # Express backend
├── docker-compose.yml
└── package.json

## Local Development

```bash
# Start Postgres + Redis
docker compose up -d

# Install dependencies
npm install

# Run frontend (localhost:5173) and backend (localhost:3000)
npm run dev
```

## Status

🚧 In active development. v1 remains live at homasbakery.com on Render.