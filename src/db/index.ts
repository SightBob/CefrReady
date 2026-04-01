import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const globalForDb = global as unknown as { db: ReturnType<typeof drizzle> | undefined };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = globalForDb.db ?? drizzle(pool, { schema });
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export { schema };
