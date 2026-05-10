// Sentry initialization for the API.
//
// This file must be imported FIRST in index.ts (before express, prisma,
// etc.) so Sentry can hook into Node's runtime and capture errors from
// every other module. That's why it lives in its own file — putting
// Sentry.init at the top of index.ts wouldn't run early enough because
// ESM hoists imports before init code.
//
// If SENTRY_DSN isn't set we just skip init — handy for local dev when
// you don't want noise in your Sentry project.

import 'dotenv/config';
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // We only care about errors right now — no performance tracing,
    // no profiling. Keeps the free tier happy.
    tracesSampleRate: 0,
  });
}
