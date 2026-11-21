import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

/**
 * Transaction helper สำหรับ Neon
 *
 * ทำไมต้องแยกจาก `db`:
 * - `db` (จาก `@/db`) ใช้ Neon **HTTP** driver ซึ่งไม่รองรับ transaction
 * - Neon รองรับ transaction ผ่าน **WebSocket** (Pool) แต่ socket ผูกกับ request
 *   เดียว — บน Cloudflare Workers ห้ามใช้ pool ข้าม request
 * - จึงสร้าง Pool ต่อการเรียกหนึ่งครั้ง ปิดใน `finally`
 *
 * ใช้แทน `db.transaction(...)` ได้ตรง ๆ:
 *
 *   await withTransaction(async (tx) => { ... })
 */
type TxDatabase = ReturnType<typeof drizzle<typeof schema>>;
export type DbTransaction = Parameters<Parameters<TxDatabase['transaction']>[0]>[0];

export async function withTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not defined');

  const pool = new Pool({ connectionString });
  try {
    const txDb = drizzle(pool, { schema });
    return await txDb.transaction(fn);
  } finally {
    await pool.end().catch(() => undefined);
  }
}
