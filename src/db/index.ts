import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { withTransaction } from './transaction';

/**
 * Database client (Cloudflare Workers-safe)
 *
 * ใช้ Neon **HTTP** driver สำหรับ query ปกติ — ไม่ถือ socket จึงใช้ singleton
 * ระดับ module ได้ (Workers ห้าม object ที่ทำ I/O ข้าม request)
 *
 * `db.transaction(...)` ยังเรียกได้เหมือนเดิมทุกจุด แต่ถูกส่งต่อไปที่
 * `withTransaction()` (Neon WebSocket, ต่อ connection ต่อ call) เพราะ HTTP
 * driver ไม่รองรับ transaction
 *
 * หมายเหตุ: ไม่ throw ตอน import ถ้า env ยังไม่ถูก inject — จะ error ตอน query
 */
const connectionString = process.env.DATABASE_URL ?? '';

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not defined yet — queries will fail until it is set');
}

const httpDb = drizzle(neon(connectionString), { schema });

type Db = Omit<typeof httpDb, 'transaction'> & { transaction: typeof withTransaction };

export const db = new Proxy(httpDb, {
  get(target, prop, receiver) {
    if (prop === 'transaction') return withTransaction;
    // ผูก this กับ target เสมอ — การเรียกผ่าน Proxy ไม่ควรเปลี่ยน this ของ drizzle
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as unknown as Db;

export { schema };
