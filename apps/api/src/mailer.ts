// ---------------------------------------------------------------------------
// Order confirmation emails
//
// When a customer submits an order request we send two emails:
//   1. A friendly confirmation to the customer ("we got it, we'll be in touch").
//   2. A structured notification to the bakery owner with all the order details.
//
// Both go through Resend. In dev, if RESEND_API_KEY isn't set, the
// module degrades gracefully and just logs the would-be sends to the
// console — orders still work, they just don't generate email.
// ---------------------------------------------------------------------------

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Homas Bakery <onboarding@resend.dev>';
const BAKERY_EMAIL = process.env.BAKERY_EMAIL || 'homasbakery20@gmail.com';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

if (!resend) {
  console.warn(
    '[mailer] RESEND_API_KEY not set — emails will be logged to the console instead of sent.'
  );
}

// The shape of the order data we need to render an email. Matches the
// object Prisma returns from `prisma.order.create({ include: { items: ... } })`.
type OrderForEmail = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: 'PICKUP' | 'DELIVERY';
  deliveryAddress: string | null;
  requestedDate: Date;
  notes: string | null;
  items: Array<{
    quantity: number;
    priceCents: number;
    product: { name: string };
  }>;
};

// --- Formatting helpers ---------------------------------------------------
//
// Exported so the test suite can verify them directly without booting the
// rest of the module.

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  });
}

function totalCents(order: OrderForEmail): number {
  return order.items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
}

// HTML-escape any string before interpolating it into a template, so a
// customer-controlled value (name, notes, etc.) can't inject markup or
// scripts into the email.
export function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Render the order items list as a small HTML table. Used by both
// emails so the layout stays consistent.
function itemsTableHtml(order: OrderForEmail): string {
  const rows = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding: 8px 0; color: #44403c;">${i.quantity} × ${escape(i.product.name)}</td>
          <td style="padding: 8px 0; text-align: right; color: #1c1917; font-weight: 500;">${formatPrice(i.priceCents * i.quantity)}</td>
        </tr>`
    )
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; font-family: Inter, system-ui, sans-serif; font-size: 14px;">
      ${rows}
      <tr>
        <td style="padding: 12px 0 0; border-top: 1px solid #fde68a; color: #78350f; font-weight: 600;">Subtotal</td>
        <td style="padding: 12px 0 0; border-top: 1px solid #fde68a; text-align: right; color: #78350f; font-weight: 700; font-size: 16px;">
          ${formatPrice(totalCents(order))}
        </td>
      </tr>
    </table>`;
}

// --- Customer confirmation email ------------------------------------------
//
// Goes to the customer who just placed the order. Warm tone, summary of
// what they asked for, makes it clear this is a request (not a confirmed
// order yet) and that 50% prepayment will be requested when the bakery
// follows up.
function customerEmailHtml(order: OrderForEmail): string {
  const fulfillmentText =
    order.fulfillmentType === 'DELIVERY'
      ? `<strong>Delivery to:</strong> ${escape(order.deliveryAddress || '')}<br/>
         <em style="color: #92400e; font-size: 13px;">A delivery fee will be added when we confirm your order.</em>`
      : `<strong>Pickup:</strong> Our pickup address will be shared with you when we confirm your order.`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order received</title></head>
<body style="margin: 0; padding: 0; background-color: #fffbeb; font-family: Inter, system-ui, sans-serif; color: #292524;">
  <table role="presentation" width="100%" style="padding: 40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fde68a;">

        <!-- Header -->
        <tr><td style="padding: 32px 32px 24px; background-color: #78350f; color: #fef3c7; text-align: center;">
          <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; font-weight: 500;">Homas Bakery</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: #fde68a; letter-spacing: 1px; text-transform: uppercase;">Afghan pastries · Hayward, CA</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-family: Georgia, serif; font-weight: 500; color: #1c1917; font-size: 22px;">
            Thanks for your order, ${escape(order.customerName)}!
          </h2>
          <p style="margin: 0 0 16px; line-height: 1.6; color: #44403c;">
            We've received your order request and will contact you within 24 hours to confirm the details
            and send 50% prepayment instructions. Here's a summary of what you requested:
          </p>

          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px; color: #78350f;">
              ${fulfillmentText}<br/>
              <strong>Date:</strong> ${formatDate(order.requestedDate)}
            </p>
            ${itemsTableHtml(order)}
            ${
              order.notes
                ? `<p style="margin: 16px 0 0; color: #44403c; font-size: 14px;"><strong>Notes:</strong> ${escape(order.notes)}</p>`
                : ''
            }
          </div>

          <p style="margin: 16px 0; line-height: 1.6; color: #44403c; font-size: 14px;">
            Note: this is a request, not a confirmed order. We'll reach out to confirm pricing,
            availability, and pickup or delivery details. The 50% prepayment is due once we confirm.
          </p>

          <p style="margin: 24px 0 0; line-height: 1.6; color: #44403c; font-size: 14px;">
            Questions? Just reply to this email or message us on Instagram
            <a href="https://www.instagram.com/homasbakery/" style="color: #78350f;">@homasbakery</a>.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding: 20px 32px; background-color: #fffbeb; border-top: 1px solid #fde68a; text-align: center; font-size: 12px; color: #78716c;">
          Order ID: <code style="font-family: monospace; color: #57534e;">${escape(order.id)}</code><br/>
          &copy; ${new Date().getFullYear()} Homas Bakery
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// --- Bakery notification email --------------------------------------------
//
// Goes to the bakery owner. More compact and operational than the
// customer-facing one — name and total in the subject so it's scannable
// in an inbox, customer contact info as clickable mailto/tel links, and
// the line items + notes. Reply-To is set to the customer's address on
// the send call below, so hitting Reply contacts the customer directly.
function bakeryEmailHtml(order: OrderForEmail): string {
  const fulfillmentText =
    order.fulfillmentType === 'DELIVERY'
      ? `<strong>DELIVERY</strong> to: ${escape(order.deliveryAddress || '(no address provided!)')}`
      : `<strong>PICKUP</strong>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New order</title></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: Inter, system-ui, sans-serif; color: #1c1917;">
  <table role="presentation" width="100%" style="padding: 40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4;">

        <tr><td style="padding: 24px 28px; background-color: #1c1917; color: #fef3c7;">
          <h1 style="margin: 0; font-family: Georgia, serif; font-size: 22px; font-weight: 500;">New Order Request</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #d6d3d1;">${formatPrice(totalCents(order))} subtotal · ${order.items.length} item${order.items.length === 1 ? '' : 's'}</p>
        </td></tr>

        <tr><td style="padding: 24px 28px;">
          <h2 style="margin: 0 0 4px; font-size: 18px; color: #1c1917;">${escape(order.customerName)}</h2>
          <p style="margin: 0 0 16px; color: #57534e; font-size: 14px;">
            <a href="mailto:${escape(order.customerEmail)}" style="color: #78350f;">${escape(order.customerEmail)}</a>
            · <a href="tel:${escape(order.customerPhone)}" style="color: #78350f;">${escape(order.customerPhone)}</a>
          </p>

          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin: 0 0 20px;">
            <p style="margin: 0 0 6px; color: #78350f; font-size: 14px;">${fulfillmentText}</p>
            <p style="margin: 0; color: #78350f; font-size: 14px;"><strong>Wants it by:</strong> ${formatDate(order.requestedDate)}</p>
          </div>

          ${itemsTableHtml(order)}

          ${
            order.notes
              ? `<div style="margin-top: 20px; padding: 12px 14px; background-color: #f5f5f4; border-left: 3px solid #78350f; font-size: 14px; color: #44403c;"><strong>Notes:</strong> ${escape(order.notes)}</div>`
              : ''
          }

          <p style="margin: 24px 0 0; font-size: 13px; color: #78716c;">
            Order ID: <code style="font-family: monospace;">${escape(order.id)}</code><br/>
            Open the admin dashboard to confirm or cancel this order.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// --- Public API -----------------------------------------------------------
//
// The single entrypoint the rest of the app calls. Sends both emails in
// parallel using Promise.allSettled so that if one fails (network blip,
// invalid customer address) the other still goes out. Errors are logged
// but never thrown — a bad email send must never break order creation.
export async function sendOrderEmails(order: OrderForEmail): Promise<void> {
  const total = formatPrice(totalCents(order));

  if (!resend) {
    console.log('[mailer] (DEV) Would send customer email to', order.customerEmail);
    console.log('[mailer] (DEV) Would send bakery email to', BAKERY_EMAIL, '-', total);
    return;
  }

  // Run both sends in parallel; allSettled so one failure doesn't block the other.
  const results = await Promise.allSettled([
    resend.emails.send({
      from: FROM_EMAIL,
      to: order.customerEmail,
      // If the customer hits Reply, their message goes to the bakery's actual
      // Gmail inbox — not to the no-mailbox sender address.
      replyTo: BAKERY_EMAIL,
      subject: 'Order request received — Homas Bakery',
      html: customerEmailHtml(order),
    }),
    resend.emails.send({
      from: FROM_EMAIL,
      to: BAKERY_EMAIL,
      subject: `New order from ${order.customerName} — ${total}`,
      html: bakeryEmailHtml(order),
      replyTo: order.customerEmail, // bakery can hit reply and email the customer directly
    }),
  ]);

  const [customerResult, bakeryResult] = results;

  if (customerResult.status === 'rejected') {
    console.error('[mailer] Customer email failed:', customerResult.reason);
  } else if (customerResult.value.error) {
    console.error('[mailer] Customer email error:', customerResult.value.error);
  }

  if (bakeryResult.status === 'rejected') {
    console.error('[mailer] Bakery email failed:', bakeryResult.reason);
  } else if (bakeryResult.value.error) {
    console.error('[mailer] Bakery email error:', bakeryResult.value.error);
  }
}
