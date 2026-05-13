// Tests for the order status state machine.
//
// canTransition() encodes the entire allowed-moves graph for orders.
// These tests pin that graph down so future changes can't accidentally
// open up a forbidden transition (e.g. moving COMPLETED back to NEW).

import { describe, it, expect } from 'vitest';
import { canTransition, VALID_STATUS_TRANSITIONS } from '../src/lib/orderStatus';

describe('canTransition', () => {
  it('allows NEW → CONFIRMED', () => {
    expect(canTransition('NEW', 'CONFIRMED')).toBe(true);
  });

  it('allows NEW → CANCELLED', () => {
    expect(canTransition('NEW', 'CANCELLED')).toBe(true);
  });

  it('allows CONFIRMED → COMPLETED', () => {
    expect(canTransition('CONFIRMED', 'COMPLETED')).toBe(true);
  });

  it('allows CONFIRMED → CANCELLED', () => {
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
  });

  it('refuses to skip CONFIRMED (NEW → COMPLETED)', () => {
    expect(canTransition('NEW', 'COMPLETED')).toBe(false);
  });

  it('refuses to move out of COMPLETED (terminal state)', () => {
    expect(canTransition('COMPLETED', 'CONFIRMED')).toBe(false);
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
  });

  it('refuses to move out of CANCELLED (terminal state)', () => {
    expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransition('CANCELLED', 'COMPLETED')).toBe(false);
  });
});

describe('VALID_STATUS_TRANSITIONS', () => {
  it('lists terminal states with empty transition arrays', () => {
    expect(VALID_STATUS_TRANSITIONS.COMPLETED).toEqual([]);
    expect(VALID_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('never lists NEW as a destination — orders cannot go backwards', () => {
    for (const transitions of Object.values(VALID_STATUS_TRANSITIONS)) {
      expect(transitions).not.toContain('NEW');
    }
  });
});
