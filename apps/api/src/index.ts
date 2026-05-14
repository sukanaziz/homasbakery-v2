// ---------------------------------------------------------------------------
// Homas Bakery API
//
// Single-file Express + TypeScript backend. Handles three concerns:
//   1. Public endpoints the customer site uses (health check, products,
//      submitting an order request).
//   2. Admin auth (login / logout / me) backed by bcrypt + Redis sessions.
//   3. Admin-only endpoints for managing orders and products, behind the
//      requireAdmin middleware.
//
// We deliberately keep everything in one file for now — there are roughly
// a dozen endpoints, so splitting into routers and services would add
// indirection without much benefit. If this grows past ~30 endpoints
// it'd be worth breaking up.
// ---------------------------------------------------------------------------

// Sentry is preloaded via Node's --import flag (see apps/api/package.json
// scripts) so it can hook into the runtime before any other module loads.
// We import the Sentry SDK here only for the express error handler below.
import * as Sentry from '@sentry/node';
import express, { type Request, type Response, type NextFunction } from 'express';
import { canTransition } from './lib/orderStatus.js';
import {
  loginSchema,
  createProductSchema,
  updateProductSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  moveProductSchema,
} from './lib/schemas.js';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { sendOrderEmails } from './mailer.js';

// Tells TypeScript that req.session.adminId is a thing we set during login.
// Without this, accessing req.session.adminId anywhere in the file would
// be a type error.
declare module 'express-session' {
  interface SessionData {
    adminId?: string;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Where the frontend lives. Defaults to local Vite. In production this
// gets set to https://homasbakery.com via env var.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const prisma = new PrismaClient();

// Hard guard: refuse to start in production with the dev placeholder
// secret. Forging a session cookie is trivial if the secret is a known
// value, so this prevents the worst possible deploy mistake.
if (process.env.NODE_ENV === 'production' && SESSION_SECRET === 'dev-secret-change-me') {
  throw new Error(
    'SESSION_SECRET must be set to a real secret in production. ' +
    'Generate one with: openssl rand -hex 32'
  );
}

// Redis powers two things in this app: session storage (so login state
// survives an API restart) and rate limit counters. We connect once at
// startup; the connection is reused for the rest of the process lifetime.
const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis client error:', err));
await redisClient.connect();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// When deployed behind a load balancer or CDN, the real client IP arrives
// in the X-Forwarded-For header, not on the socket. Trusting one proxy
// hop tells Express to read it. Without this, rate limiting would treat
// every request as coming from the load balancer and either let everyone
// through or block everyone at once.
app.set('trust proxy', 1);

// Helmet sets ~15 standard security response headers for us
// We override its default Cross-Origin-Resource-Policy because the React
// frontend runs on a different port (5173) than the API (3000), and the
// strict default would block <img> requests for /uploads/* images.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Express runs in ESM mode (`"type": "module"` in package.json), which
// removes the implicit `__dirname` global. Recreate it from import.meta.url
// so we can resolve a static path to the uploads folder.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

// Make uploaded product images publicly readable at /uploads/<filename>.
// This is fine for dev. For production we'll move uploads to S3 + CloudFront
// and remove this line.
app.use('/uploads', express.static(UPLOADS_DIR));

// CORS lets the browser send requests from the frontend origin to this API
// origin. credentials: true is required for the session cookie to flow
// across origins. The allowed origin comes from FRONTEND_URL so the same
// code works locally (localhost:5173) and in production (homasbakery.com).
//
// We additionally allow private-network origins in dev so you can preview
// the site on a phone over Wi-Fi (e.g. http://192.168.1.42:5173). This is
// gated by NODE_ENV !== 'production' so prod stays locked to FRONTEND_URL.
const PRIVATE_LAN_ORIGIN = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$/;

app.use(
  cors({
    origin: (origin, cb) => {
      // Non-browser callers (curl, server-to-server) don't send an Origin
      // header. Let those through — CORS only applies to browsers anyway.
      if (!origin) return cb(null, true);
      if (origin === FRONTEND_URL) return cb(null, true);
      if (process.env.NODE_ENV !== 'production' && PRIVATE_LAN_ORIGIN.test(origin)) {
        return cb(null, true);
      }
      cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// Cap request bodies at 32 KB. Our largest legitimate payload is an order
// with maybe a dozen items — well under 4 KB. Capping low cuts off
// abuse attempts cheaply (a 200 MB body would never be ours).
app.use(express.json({ limit: '32kb' }));

// --- Rate limiting --------------------------------------------------------
//
// Three tiers: a general bucket for all of /api, a strict one for login
// (brute-force defense), and a moderate one for order submission (spam
// defense). standardHeaders: true emits the modern `RateLimit-*` headers
// so well-behaved clients can self-throttle.

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again.' },
});

// Only failed login attempts count against the limit, so a real user who
// fat-fingers their password three times before getting it right won't
// get locked out — but a bot trying random passwords gets cut off after 8.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait and try again.' },
});

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order submissions. Please try again later.' },
});

// Apply the general limiter to every /api/* route. The stricter limiters
// are attached individually to /api/auth/login and /api/orders below.
app.use('/api/', apiLimiter);

// --- Sessions -------------------------------------------------------------
//
// express-session creates a signed cookie holding only an opaque session
// ID; the actual session data (just `adminId` in our case) lives in Redis.
// Must come BEFORE any route that reads or writes req.session.
app.use(
  session({
    store: new RedisStore({ client: redisClient, prefix: 'sess:' }),
    secret: SESSION_SECRET,
    resave: false,             // don't re-save unchanged sessions
    saveUninitialized: false,  // don't create sessions for anonymous visitors
    cookie: {
      httpOnly: true,                                 // browser JS cannot read the cookie (XSS defense)
      secure: process.env.NODE_ENV === 'production',  // HTTPS-only in prod
      sameSite: 'lax',                                // basic CSRF defense
      maxAge: 1000 * 60 * 60 * 24 * 7,                // 7 days
    },
  })
);

// ---------------------------------------------------------------------------
// File uploads (multer)
// ---------------------------------------------------------------------------
//
// Stores product images on local disk in dev. Each upload gets a random
// filename so two products with the same image filename don't collide and
// so a malicious user can't pick a path-traversal-y filename to mess with
// our filesystem.

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const random = crypto.randomBytes(16).toString('hex');
      // Sanitize the extension to strip anything weird the user might pass.
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, `${random}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per file
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, gif).'));
    }
  },
});

// Input validation schemas live in ./lib/schemas.ts so they can be unit-
// tested in isolation. Routes below call schema.safeParse(req.body)
// before touching the database — bad input is rejected with a 400
// plus a list of issues, so we never write malformed data.

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
//
// Drop this in front of any route that should require an admin session.
// Returns 401 immediately if there's no session.adminId; otherwise lets
// the request through to the handler.

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// ===========================================================================
// PUBLIC ROUTES — no auth required
// ===========================================================================

// Lightweight liveness probe. Used by uptime monitors and load balancers.
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'homasbakery-api',
    timestamp: new Date().toISOString(),
  });
});

// Returns the public menu. Filters out unavailable items, sorts by the
// admin-controlled displayOrder. createdAt is a tiebreaker so the result
// is fully deterministic even if multiple products share the same order.
app.get('/api/products', async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Place an order request. The bakery owner gets notified via email and
// follows up to confirm pricing, payment, and pickup/delivery details.
//
// Three phases: validate, verify, mutate. Any well-built write endpoint
// looks like this.
app.post('/api/orders', orderLimiter, async (req: Request, res: Response) => {
  // 1. Validate the request body shape.
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      issues: parsed.error.issues,
    });
  }
  const data = parsed.data;

  try {
    // 2. Verify the products in the cart actually exist and are still
    // available. Defends against a malicious client sending a fake
    // productId or trying to order something we marked unavailable.
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, available: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        error: 'One or more products are not available',
      });
    }

    // Build a lookup so the create can reference the *server-known* price
    // for each product, ignoring whatever priceCents the client claimed.
    const priceMap = new Map(products.map((p) => [p.id, p.priceCents]));

    // 3. Create the Order plus all its OrderItems in a single atomic
    // transaction. Prisma's nested `items.create` handles the
    // relationship — if the DB or process dies halfway through, the
    // whole thing rolls back; we never end up with an Order that has
    // no line items, or vice versa.
    //
    // priceCents on each line item is *snapshotted* from the current
    // product price. If the bakery raises a price next week, this order
    // still reflects what the customer agreed to today.
    const order = await prisma.order.create({
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        fulfillmentType: data.fulfillmentType,
        deliveryAddress: data.deliveryAddress ?? null,
        requestedDate: new Date(data.requestedDate),
        notes: data.notes ?? null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceCents: priceMap.get(item.productId)!,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Fire confirmation emails to the customer and the bakery without
    // awaiting — we want the customer to see "thanks!" immediately,
    // even if the email service is slow. Failures are logged inside
    // sendOrderEmails so they never bubble up here.
    sendOrderEmails(order).catch((err) =>
      console.error('Order emails failed for', order.id, err)
    );

    res.status(201).json(order);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ===========================================================================
// AUTH ROUTES
// ===========================================================================

app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  const { email, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });

    // We return the same generic error for "no such email" and "wrong
    // password" so an attacker can't use the response to figure out which
    // emails have accounts (a.k.a. user enumeration).
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // bcrypt.compare is constant-time, so it doesn't leak info via timing.
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set the session — the cookie sent in the response will, from now
    // on, identify this admin until they log out or the session expires.
    req.session.adminId = admin.id;

    res.json({ id: admin.id, email: admin.email, name: admin.name });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    // Belt-and-suspenders: also tell the browser to drop the cookie.
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// "Who am I?" endpoint. The frontend calls this on app load to decide
// whether to show the admin pages or redirect to login.
app.get('/api/auth/me', async (req: Request, res: Response) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.session.adminId },
      // Explicitly select only safe fields. We never want passwordHash
      // accidentally returned in an API response.
      select: { id: true, email: true, name: true },
    });

    // The session points at an admin row that no longer exists — clean
    // up and treat as logged out.
    if (!admin) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Failed to fetch current admin:', error);
    res.status(500).json({ error: 'Failed to fetch current admin' });
  }
});

// ===========================================================================
// ADMIN-ONLY ROUTES — every handler below uses requireAdmin
// ===========================================================================

// --- Order status updates ---------------------------------------------------
//
// Orders move through a small state machine. A bakery owner can confirm
// or cancel a NEW order, mark a CONFIRMED order COMPLETED, or cancel a
// CONFIRMED one. Once an order reaches COMPLETED or CANCELLED it's
// terminal — no more transitions.
//
// We enforce the allowed moves on the server even though the UI hides
// the wrong buttons, so a malicious client can't use a hand-crafted PATCH
// to corrupt history.

// The actual transition table + the request body schema both live in
// ./lib/ so they can be unit-tested without booting Express.

app.patch(
  '/api/orders/:id',
  requireAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        issues: parsed.error.issues,
      });
    }
    const { status: newStatus } = parsed.data;
    const orderId = req.params.id;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!canTransition(order.status, newStatus)) {
        return res.status(400).json({
          error: `Cannot move order from ${order.status} to ${newStatus}`,
        });
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: { items: { include: { product: true } } },
      });

      res.json(updated);
    } catch (error) {
      console.error('Failed to update order status:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }
);

// Full list of orders for the admin dashboard. Includes line items + the
// product each one references so the UI can render everything without a
// second round trip.
app.get('/api/orders', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// --- Admin product management ----------------------------------------------

// Returns ALL products including unavailable ones — the admin needs to
// see and edit hidden items. The public /api/products endpoint filters
// those out for customers.
app.get('/api/admin/products', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/admin/products', requireAdmin, async (req: Request, res: Response) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      issues: parsed.error.issues,
    });
  }

  try {
    // New products land at the bottom of the menu. The admin can drag
    // them up later via the move endpoint below.
    const aggregate = await prisma.product.aggregate({
      _max: { displayOrder: true },
    });
    const nextOrder = (aggregate._max.displayOrder ?? 0) + 1;

    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        priceCents: parsed.data.priceCents,
        imageUrl: parsed.data.imageUrl ?? null,
        available: parsed.data.available ?? true,
        displayOrder: nextOrder,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Reorder one product up or down by a single position.
//
// We pull every product, swap the two relevant entries, then renumber
// all of them 1..N in a single transaction. This is O(N) on every move,
// which is overkill at 30 products but completely fine — and it means
// we never have to worry about ties or fractional ordering schemes.

app.post(
  '/api/admin/products/:id/move',
  requireAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const parsed = moveProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid direction' });
    }
    const { direction } = parsed.data;

    try {
      const all = await prisma.product.findMany({
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        select: { id: true },
      });

      const idx = all.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      // Already at the top/bottom — nothing to do.
      if (targetIdx < 0 || targetIdx >= all.length) {
        return res.json({ ok: true, atBoundary: true });
      }

      const reordered = [...all];
      [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];

      await prisma.$transaction(
        reordered.map((p, i) =>
          prisma.product.update({
            where: { id: p.id },
            data: { displayOrder: i + 1 },
          })
        )
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to move product:', error);
      res.status(500).json({ error: 'Failed to reorder product' });
    }
  }
);

app.patch(
  '/api/admin/products/:id',
  requireAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        issues: parsed.error.issues,
      });
    }

    try {
      const product = await prisma.product.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      res.json(product);
    } catch (error: unknown) {
      // P2025 is Prisma's "record not found" code. We translate it to a
      // proper 404 instead of letting it surface as a 500.
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return res.status(404).json({ error: 'Product not found' });
      }
      console.error('Failed to update product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

app.delete(
  '/api/admin/products/:id',
  requireAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      await prisma.product.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        // P2003 = foreign key constraint. The product is referenced by
        // at least one OrderItem, so we can't delete it without
        // destroying order history. Tell the admin to mark it
        // unavailable instead.
        if (error.code === 'P2003') {
          return res.status(400).json({
            error:
              'This product has past orders. Mark it unavailable instead of deleting.',
          });
        }
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Product not found' });
        }
      }
      console.error('Failed to delete product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

// Image upload. multer.single('image') parses the multipart form and saves
// the raw bytes to disk; THEN we reprocess the file through sharp to:
//
//   - Validate it's actually an image (sharp throws on garbage). Defends
//     against a malicious upload that lies about its MIME type.
//   - Strip EXIF metadata. Phone photos contain GPS coordinates by default
//     and we don't want the bakery's home address leaking through a product photo.
//   - Honor EXIF orientation (.rotate() with no args), so portrait photos
//     don't display sideways.
//   - Cap dimensions at 1600x1600 so we don't serve 12-megapixel originals.
//
// If sharp can't read the file we delete it and reject with 400.
app.post(
  '/api/admin/upload',
  requireAdmin,
  upload.single('image'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(UPLOADS_DIR, req.file.filename);

    try {
      const processed = await sharp(filePath)
        .rotate() // bake in EXIF orientation before metadata gets stripped
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      // Overwrite the original with the cleaned version. Atomic enough for
      // our needs since nothing else is reading this file yet.
      await fs.writeFile(filePath, processed);
    } catch (err) {
      // Sharp rejected the file — clean up the bytes multer saved.
      await fs.unlink(filePath).catch(() => {});
      console.error('Image processing failed:', err);
      return res.status(400).json({ error: 'Invalid or corrupt image file' });
    }

    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  }
);

// Sentry error handler — must come AFTER all routes. Forwards any
// unhandled exception thrown inside a request handler to Sentry, then
// hands control to the next error middleware (Express's default in our
// case, which returns a 500).
Sentry.setupExpressErrorHandler(app);

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

// Disconnect cleanly on Ctrl+C so we don't leak DB connections or leave
// Redis subscriptions dangling.
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
