// Order status state machine.
//
// Extracted into its own module so it can be unit-tested in isolation
// (no need to spin up the full Express app to verify the rules).
// The /api/orders/:id route in index.ts uses canTransition() to enforce
// these rules at request time.

export type OrderStatus = 'NEW' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type NextStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

/**
 * Maps each current status to the set of statuses it's allowed to move to.
 * COMPLETED and CANCELLED are terminal — no further transitions.
 */
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, readonly NextStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Returns true if it's legal to move an order from `from` to `to`.
 * Used by both the API (to validate requests) and the admin UI (to
 * decide which action buttons to render).
 */
export function canTransition(from: OrderStatus, to: NextStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}
