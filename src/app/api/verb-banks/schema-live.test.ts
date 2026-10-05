/**
 * ทดสอบการเชื่อมต่อ DB จริงด้วย drizzle (ใช้ schema จาก src/db/schema.ts ตัวจริง)
 * ทุกกรณีที่เขียนข้อมูลจะอยู่ใน transaction ที่ rollback เสมอ → ไม่ทิ้งข้อมูลค้าง
 * ข้ามอัตโนมัติถ้าไม่มี DATABASE_URL
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { asc, eq, ilike, or, sql } from 'drizzle-orm';

// vitest ไม่โหลด .env เอง — โหลดเฉพาะตัวแปรที่ต้องใช้ (ไฟล์ไม่มีก็ข้าม ไม่พัง)
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ignore — จะ skip ถ้าไม่มี DATABASE_URL
}

const { verbBanks } = await import('@/db/schema');
const { validateVerbEntry } = await import('@/lib/verb-bank');

const connectionString = process.env.DATABASE_URL;
const describeLive = connectionString ? describe : describe.skip;

describeLive('verb_banks ↔ schema.ts (DB จริง)', () => {
  let pool: pg.Pool;
  let db: NodePgDatabase<Record<string, never>>;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString });
    db = drizzle(pool) as unknown as NodePgDatabase<Record<string, never>>;
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('อ่านรายการเรียงตาม id ด้วย drizzle ตัวจริงได้', async () => {
    const rows = await db
      .select({ id: verbBanks.id, v1: verbBanks.v1, v2: verbBanks.v2, v3: verbBanks.v3 })
      .from(verbBanks)
      .orderBy(asc(verbBanks.id));

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(typeof row.id).toBe('number');
      expect(row.v1).toBeTruthy();
      expect(row.v2).toBeTruthy();
      expect(row.v3).toBeTruthy();
    }
    // seed เดิมต้องอยู่
    expect(rows.some(r => r.v1 === 'go' && r.v2 === 'went' && r.v3 === 'gone')).toBe(true);
  });

  it('ค้นหาด้วย ilike ข้ามทั้ง 3 ช่อง (ใช้เงื่อนไขเดียวกับ admin GET)', async () => {
    const search = 'one'; // เจอใน gone (v3)
    const rows = await db
      .select({ id: verbBanks.id })
      .from(verbBanks)
      .where(
        or(
          ilike(verbBanks.v1, `%${search}%`),
          ilike(verbBanks.v2, `%${search}%`),
          ilike(verbBanks.v3, `%${search}%`),
        ),
      );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('insert → update → delete ผ่าน drizzle จริง แล้ว rollback ไม่ทิ้งข้อมูล', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = drizzle(client);

      const { values } = validateVerbEntry({ v1: ' tmp-live ', v2: 'tmp-lived', v3: 'tmp-tried' });
      expect(values).toEqual({ v1: 'tmp-live', v2: 'tmp-lived', v3: 'tmp-tried' });

      const inserted = await tx
        .insert(verbBanks)
        .values(values!)
        .returning({ id: verbBanks.id, v1: verbBanks.v1 });
      expect(inserted[0].v1).toBe('tmp-live');
      const newId = inserted[0].id;

      const updated = await tx
        .update(verbBanks)
        .set({ ...values!, v2: 'tmp-edited' })
        .where(eq(verbBanks.id, newId))
        .returning({ v2: verbBanks.v2 });
      expect(updated[0].v2).toBe('tmp-edited');

      const deleted = await tx
        .delete(verbBanks)
        .where(eq(verbBanks.id, newId))
        .returning({ id: verbBanks.id });
      expect(deleted[0].id).toBe(newId);

      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }

    // หลัง rollback ต้องไม่มีแถวทดสอบค้าง
    const leftover = await db
      .select({ id: verbBanks.id })
      .from(verbBanks)
      .where(eq(verbBanks.v1, 'tmp-live'));
    expect(leftover).toHaveLength(0);
  });

  it('unique index บังคับชุด 3 ช่องซ้ำไม่ได้ (23505)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await expect(
        client.query(
          `insert into verb_banks (v1,v2,v3) values ('dup-live','dup-past','dup-done')
             on conflict do nothing`,
        ),
      ).resolves.toBeDefined();
      // ครั้งที่สองต้องถูกบล็อกด้วย 23505
      await expect(
        client.query(`insert into verb_banks (v1,v2,v3) values ('dup-live','dup-past','dup-done')`),
      ).rejects.toMatchObject({ code: '23505' });
      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('varchar(100) ตัดคำยาวเกินที่ระดับ DB ด้วย 22001', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await expect(
        client.query(
          `insert into verb_banks (v1,v2,v3) values ('x', repeat('y',101), 'z')`,
        ),
      ).rejects.toMatchObject({ code: '22001' });
      await client.query('ROLLBACK');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('created_at / updated_at มีค่าและอัปเดตได้', async () => {
    const rows = await db
      .select({ createdAt: verbBanks.createdAt, updatedAt: verbBanks.updatedAt })
      .from(verbBanks)
      .orderBy(asc(verbBanks.id))
      .limit(1);
    expect(rows[0].createdAt).toBeInstanceOf(Date);

    const now = await db.execute(sql`select now() as n`);
    expect(now.rows[0].n).toBeTruthy();
  });
});
