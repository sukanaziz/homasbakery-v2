import express, { type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ============================================================
// Validation schemas
// ============================================================

const createOrderSchema = z
  .object({
    customerName: z.string().min(1).max(200),
    customerEmail: z.string().email().max(200),
    customerPhone: z.string().min(7).max(50),
    fulfillmentType: z.enum(['PICKUP', 'DELIVERY']),
    deliveryAddress: z.string().max(500).optional(),
    requestedDate: z.string().datetime(),
    notes: z.string().max(2000).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive().max(1000),
        })
      )
      .min(1),
  })
  .refine(
    (data) =>
      data.fulfillmentType === 'PICKUP' ||
      (data.deliveryAddress && data.deliveryAddress.length > 0),
    {
      message: 'Delivery address is required for delivery orders',
      path: ['deliveryAddress'],
    }
  );

// ============================================================
// Routes
// ============================================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'homasbakery-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/products', async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/orders', async (req: Request, res: Response) => {
  // 1. Validate the incoming request
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      issues: parsed.error.issues,
    });
  }
  const data = parsed.data;

  try {
    // 2. Verify all products exist AND are still available
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, available: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        error: 'One or more products are not available',
      });
    }

    // Lookup table: productId -> current priceCents
    const priceMap = new Map(products.map((p) => [p.id, p.priceCents]));

    // 3. Create the order with its line items in one transaction
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

    res.status(201).json(order);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// TEMPORARY: unauthenticated GET for local testing.
// In Week 5 we'll move this behind admin auth.
app.get('/api/orders', async (_req: Request, res: Response) => {
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

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});