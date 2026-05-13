// Tests for the Zod input-validation schemas.
//
// These are the schemas the API uses to reject malformed requests
// before they ever reach Postgres. We test the boundary conditions —
// minimum lengths, optional vs required fields, the cross-field rule
// for delivery addresses, etc. — so changes to the schema can't
// silently weaken our input contract.

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  createProductSchema,
} from '../src/lib/schemas';

describe('loginSchema', () => {
  it('accepts a valid email + password', () => {
    const result = loginSchema.safeParse({
      email: 'owner@homasbakery.com',
      password: 'a-real-password',
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed email addresses', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects empty passwords', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('createOrderSchema', () => {
  // Reusable fixture so each test only has to override what it cares about.
  const validPickupOrder = {
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '510-555-1234',
    fulfillmentType: 'PICKUP' as const,
    requestedDate: '2026-09-12T18:00:00.000Z',
    items: [{ productId: 'abc123', quantity: 2 }],
  };

  it('accepts a valid pickup order', () => {
    const result = createOrderSchema.safeParse(validPickupOrder);
    expect(result.success).toBe(true);
  });

  it('rejects an order with zero items', () => {
    const result = createOrderSchema.safeParse({ ...validPickupOrder, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a quantity of zero', () => {
    const result = createOrderSchema.safeParse({
      ...validPickupOrder,
      items: [{ productId: 'abc', quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative quantity', () => {
    const result = createOrderSchema.safeParse({
      ...validPickupOrder,
      items: [{ productId: 'abc', quantity: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-datetime requestedDate', () => {
    const result = createOrderSchema.safeParse({
      ...validPickupOrder,
      requestedDate: 'tomorrow at noon',
    });
    expect(result.success).toBe(false);
  });

  it('requires a deliveryAddress when fulfillmentType is DELIVERY', () => {
    const result = createOrderSchema.safeParse({
      ...validPickupOrder,
      fulfillmentType: 'DELIVERY',
      // deliveryAddress intentionally omitted
    });
    expect(result.success).toBe(false);
  });

  it('accepts a delivery order with an address', () => {
    const result = createOrderSchema.safeParse({
      ...validPickupOrder,
      fulfillmentType: 'DELIVERY',
      deliveryAddress: '123 Main St, Hayward, CA 94541',
    });
    expect(result.success).toBe(true);
  });

  it('does not require a deliveryAddress for pickup orders', () => {
    const result = createOrderSchema.safeParse(validPickupOrder);
    expect(result.success).toBe(true);
  });
});

describe('updateOrderStatusSchema', () => {
  it('accepts CONFIRMED, COMPLETED, CANCELLED', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'CONFIRMED' }).success).toBe(true);
    expect(updateOrderStatusSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true);
    expect(updateOrderStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(true);
  });

  it('rejects NEW (you cannot reset an order back to its initial state via the API)', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'NEW' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown statuses', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'IN_PROGRESS' });
    expect(result.success).toBe(false);
  });
});

describe('createProductSchema', () => {
  it('rejects negative prices', () => {
    const result = createProductSchema.safeParse({
      name: 'Test',
      priceCents: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer prices', () => {
    const result = createProductSchema.safeParse({
      name: 'Test',
      priceCents: 4.99, // dollar value — clients should send cents
    });
    expect(result.success).toBe(false);
  });

  it('accepts a zero price (free / promotional items)', () => {
    const result = createProductSchema.safeParse({
      name: 'Free sample',
      priceCents: 0,
    });
    expect(result.success).toBe(true);
  });
});
