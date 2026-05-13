// Vitest configuration for the API.
//
// We keep tests in apps/api/test/ instead of next to source files. The
// include pattern below picks up anything matching *.test.ts inside that
// directory.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Tests run against functions, no database, no network. Single
    // process is fine and avoids spinning up worker threads.
    pool: 'forks',
    environment: 'node',
  },
});
