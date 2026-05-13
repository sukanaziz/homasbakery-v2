// Zod input-validation schemas used by the API.
//
// Lives in its own module so the test suite can import + exercise these
// schemas directly without having to start the Express server. The
// routes in index.ts import these and call safeParse(req.body) before
// touching the database.

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  // Price in cents (integer). Frontend converts dollars before sending.
  priceCents: z.number().int().nonnegative().max(1_000_000),
  imageUrl: z.string().max(500).optional().nullable(),
  available: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createOrderSchema = z
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
  // deliveryAddress is required when fulfillmentType is DELIVERY.
  // Plain object schemas can't express cross-field dependencies, so we
  // use .refine() for the conditional rule.
  .refine(
    (data) =>
      data.fulfillmentType === 'PICKUP' ||
      (data.deliveryAddress && data.deliveryAddress.length > 0),
    {
      message: 'Delivery address is required for delivery orders',
      path: ['deliveryAddress'],
    }
  );

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED']),
});

export const moveProductSchema = z.object({
  direction: z.enum(['up', 'down']),
});
