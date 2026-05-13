// Tests for the small pure-function helpers in mailer.ts.
//
// The actual email sending is integration-only (it'd hit Resend's API);
// here we just lock down the formatting + escaping helpers because they
// run on every email we generate.

import { describe, it, expect } from 'vitest';
import { formatPrice, escape } from '../src/mailer';

describe('formatPrice', () => {
  it('converts cents to a USD string with two decimal places', () => {
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(100)).toBe('$1.00');
    expect(formatPrice(425)).toBe('$4.25');
    expect(formatPrice(4000)).toBe('$40.00');
  });

  it('handles large amounts', () => {
    expect(formatPrice(123456)).toBe('$1234.56');
  });
});

describe('escape', () => {
  // Customer-supplied strings (name, notes, etc.) are interpolated into
  // the HTML email templates. Without escaping, a customer could break
  // the layout or worse by including markup in their name.

  it('escapes < and > so injected tags become inert text', () => {
    expect(escape('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escape('Bread & Butter')).toBe('Bread &amp; Butter');
  });

  it('escapes quotes that could break attribute values', () => {
    expect(escape('"hello"')).toBe('&quot;hello&quot;');
    expect(escape("it's")).toBe('it&#39;s');
  });

  it('leaves ordinary text alone', () => {
    expect(escape('Pumpkin Muffin')).toBe('Pumpkin Muffin');
  });
});
