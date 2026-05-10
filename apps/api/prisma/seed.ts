// ---------------------------------------------------------------------------
// Database seed: create the bakery owner's admin account.
//
// Run with:    npx prisma db seed
// (configured under "prisma": { "seed": ... } in apps/api/package.json)
//
// Reads credentials from .env so we never commit them. Idempotent — if
// the admin already exists, this is a no-op. Safe to re-run any time.
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  const name = process.env.SEED_ADMIN_NAME ?? 'Bakery Owner'

  if (!email || !password) {
    throw new Error(
      'Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in .env'
    )
  }

  // bcrypt with work factor 12 takes ~150ms per hash on modern hardware.
  // That's slow enough that brute-forcing the hash table from a stolen
  // database is impractical, fast enough that login feels snappy.
  const passwordHash = await bcrypt.hash(password, 12)

  // upsert = "update if exists, create if not". Passing an empty `update`
  // means re-running this script never changes an existing admin's
  // password — which is what we want; the seed is for first-time setup,
  // not for resetting credentials.
  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name },
  })

  console.log(`Admin ready: ${admin.email} (${admin.name})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // Always close the DB connection cleanly so the script doesn't hang.
    await prisma.$disconnect()
  })
