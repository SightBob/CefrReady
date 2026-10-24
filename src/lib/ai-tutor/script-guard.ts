/**
 * กันสคริปต์ AI Tutor ที่ "เขียน DB" ให้รันผิดฐานโดยไม่ตั้งใจ
 *
 * กฎ (2 ชั้นที่มีผลจริง):
 * 1. ค่าเริ่มต้น = dry-run (ไม่เขียนอะไร) → ต้องใส่ --apply จึงเขียน
 * 2. ต้องยืนยัน host ปลายทางด้วย --confirm-host <host ของ DATABASE_URL>
 * 3. host ที่อยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS) → ปฏิเสธ
 *
 * ⚠️ ตั้งใจไม่ใช้ AI_TUTOR_TEST_DB_HOSTS — ตัวนั้นคือ allowlist ของ "เทสที่ต่อ DB"
 * ไม่ใช่รายชื่อฐานที่อนุญาตให้สคริปต์เขียน
 *
 * ⚠️ ไม่ใช้เกณฑ์ "ชื่อ host มีคำว่า prod/production" (แบบของ scripts/apply-migration.ts)
 * เพราะเป็นการเดาจากชื่อ ไม่ใช่ชั้นป้องกันจริง → ผู้ดูแลต้องตั้งบล็อกลิสต์เอง
 */
import { parseBlockedHosts } from '@/lib/migration/apply-core';

export type ScriptGuardFailure = {
  ok: false;
  reason:
    | 'no_database_url'
    | 'blocked_host'
    | 'missing_confirm_host'
    | 'mismatched_confirm_host';
  message: string;
};

export type ScriptGuardResult =
  | { ok: true; host: string; dryRun: boolean }
  | ScriptGuardFailure;

/**
 * ทำให้ host ของ Neon ที่สองแบบเทียบกันได้
 *
 * Neon ให้ connection string 2 แบบของ "branch เดียวกัน":
 * - แบบ pooled  : ep-xxx-pooler.<region>.aws.neon.tech
 * - แบบ direct  : ep-xxx.<region>.aws.neon.tech
 * ถ้าเทียบแบบตรง ๆ บล็อกลิสต์ที่ใส่แบบหนึ่งจะไม่มีผลกับอีกแบบ
 * → ตัด suffix "-pooler" ออกก่อนเทียบเสมอ
 */
export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^([a-z0-9-]+)-pooler\./, '$1.');
}

/** host อยู่ในบล็อกลิสต์ไหม (เทียบแบบไม่สนคำว่า pooler) */
export function isHostBlocked(host: string, blockedList: string[]): boolean {
  const normalized = normalizeHost(host);
  return blockedList.some((value) => normalizeHost(value) === normalized);
}

/** ดึง host จาก DATABASE_URL (null = อ่านไม่ได้) */
export function hostOfDatabaseUrl(databaseUrl: string | undefined): string | null {
  if (!databaseUrl?.trim()) return null;
  try {
    return new URL(databaseUrl.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** แยก flag ของสคริปต์ออกจาก positional args */
export function extractScriptFlags(argv: string[]): {
  apply: boolean;
  confirmHost: string | null;
  rest: string[];
} {
  let apply = false;
  let confirmHost: string | null = null;
  const rest: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') apply = true;
    else if (arg === '--confirm-host') {
      index += 1;
      confirmHost = argv[index] ?? null;
    } else if (arg.startsWith('--confirm-host=')) {
      confirmHost = arg.slice('--confirm-host='.length);
    } else {
      rest.push(arg);
    }
  }
  return { apply, confirmHost, rest };
}

/**
 * ตรวจเงื่อนไขก่อนเขียน DB
 *
 * @param options.apply ผู้ใช้ใส่ --apply หรือยัง
 * @param options.confirmHost ค่า --confirm-host
 * @param options.databaseUrl process.env.DATABASE_URL
 * @param options.blockedHosts process.env.APPLY_MIGRATION_BLOCKED_HOSTS (คั่นด้วย comma)
 */
export function checkScriptWriteGuards(options: {
  apply: boolean;
  confirmHost: string | null;
  databaseUrl: string | undefined;
  blockedHosts?: string | undefined;
}): ScriptGuardResult {
  const host = hostOfDatabaseUrl(options.databaseUrl);
  if (!host) {
    return {
      ok: false,
      reason: 'no_database_url',
      message: 'ไม่พบ DATABASE_URL — ตั้งค่าใน .env หรือส่งเป็น environment variable',
    };
  }

  const blockedList = parseBlockedHosts(options.blockedHosts);
  if (isHostBlocked(host, blockedList)) {
    return {
      ok: false,
      reason: 'blocked_host',
      message: `🚫 host นี้ (${host}) อยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS) — โดยค่าเริ่มต้นห้ามเขียนลงฐานนี้`,
    };
  }

  if (!options.apply) {
    // dry-run — อ่านอย่างเดียว ไม่เขียน
    return { ok: true, host, dryRun: true };
  }

  if (!options.confirmHost) {
    return {
      ok: false,
      reason: 'missing_confirm_host',
      message: `🚫 ขาด --confirm-host — ต้องยืนยันว่า host ถูกต้อง (คัดลอกจากข้างบน)\n   ตัวอย่าง: --confirm-host ${host}`,
    };
  }

  // เทียบแบบ normalize (ตัด -pooler) → host แบบ pooled/direct ของ branch เดียวกันถือว่าตรงกัน
  if (normalizeHost(options.confirmHost) !== normalizeHost(host)) {
    return {
      ok: false,
      reason: 'mismatched_confirm_host',
      message: `🚫 --confirm-host ไม่ตรงกับ DATABASE_URL\n   ยืนยัน: ${options.confirmHost}\n   จริง  : ${host}`,
    };
  }

  return { ok: true, host, dryRun: false };
}
