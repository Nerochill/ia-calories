import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

import * as schema from './schema';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Runs `fn` with a Drizzle client backed by a fresh Neon pool, then closes the pool.
 * Server-only (API routes, Trigger.dev tasks): never import this from app screens.
 * A pool per call keeps it safe on serverless runtimes that can't share sockets
 * across requests, and the WebSocket driver supports `db.transaction`.
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString: url });
  try {
    return await fn(drizzle({ client: pool, schema }));
  } finally {
    await pool.end();
  }
}

export * from './schema';
