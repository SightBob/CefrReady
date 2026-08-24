import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const globalForDb = global as unknown as { db: ReturnType<typeof drizzle> | undefined };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  // Keep pooled connections alive across invocations — Fluid compute holds
  // warm instances, so a longer idle window avoids repeated TCP+TLS+auth
  // handshakes to Neon on every burst of requests.
  idleTimeoutMillis: 300_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error (idle connection):', err?.message);
});

export const db = globalForDb.db ?? drizzle(pool, { schema });
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export { schema };
