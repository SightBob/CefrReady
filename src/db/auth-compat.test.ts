/**
 * ตาราง users สำหรับ NextAuth adapter ต้องไม่ดึงคอลัมน์ของฟีเจอร์ AI Tutor
 *
 * เหตุผล: @auth/drizzle-adapter อ่านผู้ใช้ด้วย `db.select().from(usersTable)`
 * (ไม่ระบุคอลัมน์) → drizzle แปลงเป็น "select ทุกคอลัมน์ใน schema" → ถ้า migration 0045
 * ยังไม่ได้รัน คิวรีจะพัง → ล็อกอิน/สมัครผ่าน OAuth ล้ม แม้ฟีเจอร์ AI Tutor จะปิดอยู่
 *
 * เทสนี้ยืนยันว่า:
 * 1. มุมมองที่ส่งให้ adapter ไม่มีคอลัมน์ ai_tutor_access ใน SQL
 * 2. ตาราง users ต้นฉบับยังมีคอลัมน์ครบ (drizzle-kit เห็น schema เดิม)
 */
import { describe, expect, it } from 'vitest';
import { Table, getTableColumns, and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pg-proxy';

import { accounts, users } from '@/db/schema';
import { AUTH_OMITTED_USER_COLUMNS, omitTableColumns, usersForAuth } from './auth-compat';

/**
 * ใช้ pg-proxy (ไม่ต่อฐานข้อมูลจริง) เพราะต้องการแค่ SQL ที่ drizzle สร้าง
 * — ไม่ต้องมี DATABASE_URL และไม่เปิด connection pool
 */
const db = drizzle(async () => ({ rows: [] }));

/** ตาราง users ที่ adapter ใช้จริง (ดู @auth/drizzle-adapter/lib/pg.js) */
const authUsers = usersForAuth as never as typeof users;
const authAccounts = accounts as never as typeof accounts;

describe('usersForAuth — มุมมองตารางสำหรับ NextAuth adapter', () => {
  it('ไม่ดึงคอลัมน์ ai_tutor_access ใน SQL', () => {
    const sql = db.select().from(usersForAuth).toSQL().sql;
    expect(sql).not.toContain('ai_tutor_access');
    expect(sql).toContain('"email"');
  });

  it('ตาราง users ต้นฉบับยังมีคอลัมน์ครบ (ไม่ไปแก้ schema ที่ drizzle-kit ใช้)', () => {
    const sql = db.select().from(users).toSQL().sql;
    expect(sql).toContain('ai_tutor_access');
    expect(Object.keys(getTableColumns(users))).toContain('aiTutorAccess');
  });

  it('insert ของ adapter ไม่พยายามใส่คอลัมน์ที่ถูกตัด', () => {
    const sql = db
      .insert(usersForAuth)
      .values({ id: 'u1', name: 'n', email: 'e@example.com', emailVerified: null, image: null })
      .toSQL().sql;
    expect(sql).not.toContain('ai_tutor_access');
  });

  it('ยังเป็นตาราง drizzle ชื่อเดิม (ไม่ได้สร้างตารางใหม่ใน schema)', () => {
    const nameSymbol = (Table as unknown as { Symbol: { Name: symbol } }).Symbol.Name;
    expect(usersForAuth).toBeInstanceOf(Table);
    expect((usersForAuth as unknown as Record<symbol, unknown>)[nameSymbol]).toBe('users');
    expect(Object.keys(getTableColumns(usersForAuth))).toEqual(
      Object.keys(getTableColumns(users)).filter((name) => !AUTH_OMITTED_USER_COLUMNS.includes(name as never)),
    );
  });

  it('ตัดคอลัมน์ออกแล้วอ้างถึงคอลัมน์ที่ถูกตัดไม่ได้', () => {
    const view = usersForAuth as unknown as Record<string, unknown>;
    expect(view.aiTutorAccess).toBeUndefined();
  });

  it('omitTableColumns ไม่แก้ตารางต้นฉบับ', () => {
    const before = Object.keys(getTableColumns(users));
    omitTableColumns(users, ['aiTutorAccess']);
    expect(Object.keys(getTableColumns(users))).toEqual(before);
  });
});

/**
 * ทุก query ที่ @auth/drizzle-adapter ใช้กับตาราง users
 * (อ้างอิง: node_modules/@auth/drizzle-adapter/lib/pg.js)
 *
 * - getUser / getUserByEmail → ล็อกอินผู้ใช้เดิม (ค้นด้วย id / email)
 * - getUserByAccount → เชื่อมบัญชี OAuth เข้ากับผู้ใช้
 * - createUser → สมัครผู้ใช้ใหม่ (INSERT)
 * - updateUser → อัปเดตโปรไฟล์
 * - deleteUser → ลบผู้ใช้
 *
 * ทุก query ต้องไม่มี ai_tutor_access → ใช้ได้ทั้งก่อนและหลังรัน migration 0045
 */
describe('auth-compat — query ทุกตัวของ @auth/drizzle-adapter ที่แตะตาราง users', () => {
  const adapterQueries: Array<{ name: string; sql: string }> = [
    {
      name: 'getUser (ล็อกอินผู้ใช้เดิม)',
      sql: db.select().from(authUsers).where(eq(authUsers.id, 'u1')).toSQL().sql,
    },
    {
      name: 'getUserByEmail (ล็อกอินด้วยอีเมล)',
      sql: db.select().from(authUsers).where(eq(authUsers.email, 'user@example.com')).toSQL().sql,
    },
    {
      name: 'getUserByAccount (เชื่อมบัญชี OAuth)',
      sql: db
        .select({ account: authAccounts, user: authUsers })
        .from(authAccounts)
        .innerJoin(authUsers, eq(authAccounts.userId, authUsers.id))
        .where(and(
          eq(authAccounts.provider, 'google'),
          eq(authAccounts.providerAccountId, 'acc-1'),
        ))
        .toSQL().sql,
    },
    {
      name: 'createUser (สมัครผู้ใช้ใหม่)',
      sql: db
        .insert(authUsers)
        .values({ id: 'u1', name: 'n', email: 'user@example.com', emailVerified: null, image: null })
        .toSQL().sql,
    },
    {
      name: 'updateUser (อัปเดตโปรไฟล์)',
      sql: db.update(authUsers).set({ name: 'ชื่อใหม่' }).where(eq(authUsers.id, 'u1')).toSQL().sql,
    },
    {
      name: 'deleteUser (ลบผู้ใช้)',
      sql: db.delete(authUsers).where(eq(authUsers.id, 'u1')).toSQL().sql,
    },
  ];

  it.each(adapterQueries)('$name — ไม่มี ai_tutor_access', ({ sql }) => {
    expect(sql).not.toContain('ai_tutor_access');
  });

  it.each(adapterQueries)('$name — ยังอ้างถึงตาราง users ตามปกติ', ({ sql }) => {
    expect(sql).toContain('"users"');
  });

  it('ถ้าเอา compat ออก (ตารางปกติ) คิวรีจะดึงคอลัมน์ใหม่มา — เทสนี้จึงมีความหมาย', () => {
    const sql = db.select().from(users).toSQL().sql;
    expect(sql).toContain('ai_tutor_access');
  });
});
