import { Table } from 'drizzle-orm';

import { users } from './schema';

/**
 * มุมมองของตาราง users สำหรับ NextAuth adapter — ตัดคอลัมน์ของฟีเจอร์ AI Tutor ออก
 *
 * ⚠️ ห้ามอัปเดต `drizzle-orm` / `@auth/drizzle-adapter` โดยไม่รันเทสชุดนี้ก่อน
 *    (`src/db/auth-compat.test.ts`) — เพราะข้อนี้พึ่งกลไกภายในของ drizzle
 *    (`Table.Symbol.Columns` เป็น @internal) ถ้ากลไกเปลี่ยน มุมมองจะหยุดกรองคอลัมน์
 *    แบบเงียบ ๆ → ล็อกอิน/สมัครจะพังทันทีถ้า migration 0045 ยังไม่รัน
 *    → เวอร์ชัน drizzle-orm ถูก pin ไว้ (ไม่มี ^ หรือ ~) ใน package.json เพื่อกันการอัปเดตเงียบ ๆ
 *
 * ทำไมต้องมี:
 * - @auth/drizzle-adapter อ่านผู้ใช้ด้วย `db.select().from(usersTable)` (ไม่ระบุคอลัมน์)
 *   → drizzle จะแปลงเป็น "select <ทุกคอลัมน์ใน schema>" รวมถึง ai_tutor_access
 *   → ถ้า migration 0045 ยังไม่ได้รัน คิวรีจะพังทันที
 *     (ผลคือ: ล็อกอิน/สมัครผ่าน OAuth ล้ม แม้ AI_TUTOR_ENABLED จะปิดอยู่)
 * - โค้ดส่วนอื่นของโปรเจกต์ระบุคอลัมน์ชัดเจนอยู่แล้ว จึงแก้ได้แค่ฝั่ง adapter
 *
 * วิธีทำ: สร้าง "มุมมอง" ของตาราง (object ใหม่ที่ใช้ prototype เดิม) แล้วตัดคอลัมน์ที่ไม่ต้องการ
 * ออกจากรายการคอลัมน์ของ drizzle — ตารางต้นฉบับ (users) ไม่ถูกแตะ → drizzle-kit เห็น schema เดิม
 *
 * หมายเหตุ: คอลัมน์ที่ตัดออกคือคอลัมน์ที่ "เพิ่งเพิ่ม" ใน migration 0045 เท่านั้น
 * ถ้ามีคอลัมน์ใหม่ของฟีเจอร์อื่นในอนาคต ให้เพิ่มชื่อเข้าไปในรายการด้านล่าง
 */

/** คอลัมน์ของ users ที่ NextAuth adapter ไม่ต้องใช้ (เพิ่มภายหลังจากที่ NextAuth ออกแบบมา) */
export const AUTH_OMITTED_USER_COLUMNS = ['aiTutorAccess'] as const;

type ColumnMap = Record<string, unknown>;

/**
 * drizzle ไม่ประกาศ `Table.Symbol` ในไฟล์ .d.ts (เป็น @internal) แต่ runtime ใช้จริง
 * → ดึงมาผ่าน cast ครั้งเดียวที่นี่
 */
const TABLE_SYMBOLS = (Table as unknown as { Symbol: { Columns: symbol } }).Symbol;

function columnsSymbol(): symbol {
  return TABLE_SYMBOLS.Columns;
}

function readColumns(table: Table): ColumnMap {
  const holder = table as unknown as Record<symbol, ColumnMap>;
  return holder[columnsSymbol()] ?? {};
}

/**
 * คืน "มุมมอง" ของตารางที่ตัดคอลัมน์ออก — ตารางต้นฉบับไม่ถูกแก้
 */
export function omitTableColumns<TTable extends Table>(
  table: TTable,
  exclude: readonly string[],
): TTable {
  const original = readColumns(table);
  const kept: ColumnMap = {};
  for (const [name, column] of Object.entries(original)) {
    if (!exclude.includes(name)) kept[name] = column;
  }

  const view = Object.create(Object.getPrototypeOf(table)) as TTable;
  Object.assign(view, table);

  const key = columnsSymbol();
  (view as unknown as Record<symbol, ColumnMap>)[key] = kept;

  // เอาคอลัมน์ที่ตัดออกออกจาก property ของตารางด้วย (ไม่ให้มีทางอ้างถึงได้)
  for (const name of exclude) {
    delete (view as unknown as Record<string, unknown>)[name];
  }

  return view;
}

/** ตาราง users สำหรับ NextAuth adapter (ไม่มีคอลัมน์ ai_tutor_access) */
export const usersForAuth = omitTableColumns(users, AUTH_OMITTED_USER_COLUMNS);
