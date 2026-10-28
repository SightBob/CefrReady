/**
 * Guard กลางสำหรับเทสที่ต่อฐานข้อมูลจริง
 *
 * ทำไมต้องมี:
 * - เทสที่ต่อ DB จริงเขียน/ลบแถวในฐานข้อมูล (ซึ่งอาจเป็นสำเนาของ production)
 *   → ถ้าชี้ผิดฐาน (เช่น production เอง) เทสจะแก้ข้อมูลของผู้ใช้จริง
 * - จึงต้องมี 2 ชั้น:
 *   1. host ที่อยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS) → ไม่รันเด็ดขาด
 *   2. host ที่ไม่อยู่ใน allowlist (AI_TUTOR_TEST_DB_HOSTS) → ไม่รัน
 *      (ต้อง "เปิดใช้" อย่างจงใจ = ป้องกันการรันเทส DB โดยไม่ตั้งใจ)
 *
 * หมายเหตุ: เทสที่เขียน/ลบแถวต้องใช้ "ผู้ใช้ทดสอบ" ที่สร้างขึ้นเอง
 * (ดู createTestDbUser) และลบเฉพาะแถวของผู้ใช้นั้น ไม่ใช่ลบตาม question id
 */

/** env ที่ระบุ host ที่ห้ามแตะ */
export const TEST_DB_BLOCKED_HOSTS_ENV = 'APPLY_MIGRATION_BLOCKED_HOSTS';
/** env ที่ระบุ host ที่อนุญาตให้เทส DB จริงรัน (คั่นด้วย comma) */
export const TEST_DB_ALLOWED_HOSTS_ENV = 'AI_TUTOR_TEST_DB_HOSTS';

export type TestDbGuardResult = {
  /** อนุญาตให้เทสต่อ DB จริงไหม */
  allowed: boolean;
  /** เหตุผลที่ไม่อนุญาต (ใช้แสดงใน console + ในชื่อเทสที่ skip) */
  reason: string;
  /** host ที่อ่านได้ (null = อ่าน URL ไม่ได้) */
  host: string | null;
};

function parseHosts(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function hostOf(databaseUrl: string): string | null {
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * ตรวจว่าอนุญาตให้เทสต่อ DB จริงหรือไม่
 *
 * - ไม่มี DATABASE_URL → ไม่รัน (ยังไม่ได้ตั้งค่า)
 * - host อยู่ในบล็อกลิสต์ → ไม่รัน
 * - ไม่ได้ตั้ง allowlist → ไม่รัน (ต้องเปิดใช้อย่างจงใจ)
 * - host ไม่อยู่ใน allowlist → ไม่รัน
 */
export function evaluateTestDbGuard(params: {
  databaseUrl: string | undefined;
  blockedHosts?: string | undefined;
  allowedHosts?: string | undefined;
}): TestDbGuardResult {
  const url = params.databaseUrl?.trim();
  if (!url) {
    return { allowed: false, reason: 'ไม่ได้ตั้ง DATABASE_URL — ข้ามเทสที่ต่อฐานข้อมูลจริง', host: null };
  }

  const host = hostOf(url);
  if (!host) {
    return { allowed: false, reason: 'อ่าน DATABASE_URL ไม่ได้ — ข้ามเทสที่ต่อฐานข้อมูลจริง', host: null };
  }

  const blocked = parseHosts(params.blockedHosts);
  if (blocked.includes(host)) {
    return { allowed: false, reason: `host ${host} อยู่ในบล็อกลิสต์ (${TEST_DB_BLOCKED_HOSTS_ENV}) — ข้ามเทสที่ต่อฐานข้อมูลจริง`, host };
  }

  const allowed = parseHosts(params.allowedHosts);
  if (allowed.length === 0) {
    return {
      allowed: false,
      reason: `ไม่ได้ตั้ง ${TEST_DB_ALLOWED_HOSTS_ENV} — เทสต่อฐานข้อมูลจริงจะไม่รัน (ใส่ host ของฐานที่ใช้ทดสอบได้)`,
      host,
    };
  }

  if (!allowed.includes(host)) {
    return {
      allowed: false,
      reason: `host ${host} ไม่อยู่ใน ${TEST_DB_ALLOWED_HOSTS_ENV} — ข้ามเทสที่ต่อฐานข้อมูลจริง`,
      host,
    };
  }

  return { allowed: true, reason: 'อนุญาต (host อยู่ใน allowlist)', host };
}

/**
 * import โมดูลที่พึ่งฐานข้อมูล แบบ "ข้ามได้" เมื่อ guard ยังไม่อนุญาต
 *
 * ทำไมต้องมี: src/db/index.ts throw ทันทีตอน import ถ้าไม่มี DATABASE_URL
 * เทสที่เขียนว่า "ข้ามอัตโนมัติเมื่อไม่มี DATABASE_URL" จึงล้มตั้งแต่บรรทัด
 * import ก่อนถึง logic skip — และโมดูลอย่าง ./quota หรือ ./messages ก็ดึง @/db
 * ต่อกันเป็นทอด ๆ การ import ตรง ๆ จึงพังทั้งไฟล์
 *
 * วิธีใช้: เรียกหลังคำนวณ evaluateTestDbGuard() แล้วเท่านั้น
 * เมื่อไม่อนุญาตจะคืน object ว่าง (ไม่มีใครอ่าน เพราะ describe ถูก skip)
 */
export async function importIfAllowed<T>(allowed: boolean, loader: () => Promise<T>): Promise<T> {
  if (allowed) return loader();
  return {} as unknown as T;
}

/**
 * id ของผู้ใช้ทดสอบที่สร้างเฉพาะเทสนี้ (ไม่ใช้ผู้ใช้จริงในฐานข้อมูล)
 * → cleanup จึงลบได้เฉพาะแถวของผู้ใช้ที่เทสสร้างเอง
 */
export function createTestDbUserId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `ai-tutor-test-${prefix}-${Date.now().toString(36)}-${random}`;
}

/** email ที่ไม่ชนกับผู้ใช้จริง (โดเมน .invalid ตาม RFC 2606) */
export function testDbUserEmail(userId: string): string {
  return `${userId}@example.invalid`;
}
