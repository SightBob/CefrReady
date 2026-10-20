/**
 * ส่วนที่ทดสอบได้ของ scripts/apply-migration.ts (ตรรกะล้วน ไม่แตะ DB/ไฟล์ข้อมูล)
 *
 * แยกออกมาเพื่อให้เทสได้โดยไม่ต้องต่อฐานข้อมูลจริง
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type ApplyArgs = {
  apply: boolean;
  force: boolean;
  confirmHost: string | null;
  from: number | null;
  files: string[];
};

export function parseArgs(argv: string[]): ApplyArgs {
  const args: ApplyArgs = { apply: false, force: false, confirmHost: null, from: null, files: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--apply') args.apply = true;
    else if (current === '--force') args.force = true;
    else if (current === '--from') {
      index += 1;
      const value = Number.parseInt(argv[index] ?? '', 10);
      args.from = Number.isFinite(value) ? value : null;
    } else if (current === '--confirm-host') {
      index += 1;
      args.confirmHost = argv[index] ?? null;
    } else if (current.startsWith('--confirm-host=')) {
      args.confirmHost = current.slice('--confirm-host='.length);
    } else if (current.startsWith('-')) {
      throw new Error(`ไม่รู้จักตัวเลือก "${current}"`);
    } else {
      args.files.push(current);
    }
  }
  return args;
}

export type Target = {
  host: string;
  port: string;
  database: string;
  user: string;
  branchHint: string;
};

/** ดึง host/port/database/user จาก DATABASE_URL (ไม่เอา password ออกมาพิมพ์) */
export function describeTarget(rawUrl: string): Target {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('DATABASE_URL ไม่ใช่ URL ที่ถูกต้อง');
  }
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.replace(/^\//, '') || '(ไม่ระบุ)',
    user: url.username || '(ไม่ระบุ)',
    branchHint: url.hostname
      .replace(/^ep-/, '')
      .replace(/\.(ap-southeast-1|ap-southeast-2|us-east-1|us-west-2|eu-central-1)\..*$/, '')
      .replace(/\.aws\.neon\.tech$/, ''),
  };
}

/**
 * host ที่ห้ามรัน: บล็อกลิสต์จาก env (MIGRATION_BLOCKED_HOSTS) + ชื่อที่มีคำว่า prod/production
 */
export function isBlockedHost(host: string, blockedList: string[] = []): boolean {
  const normalized = host.toLowerCase();
  if (blockedList.map((value) => value.trim().toLowerCase()).includes(normalized)) return true;
  return /(^|[^a-z])(prod|production)([^a-z]|$)/.test(normalized);
}

/** รายการไฟล์ .sql ใน drizzle/ เรียงตามเลข (ข้ามไฟล์ที่ไม่ได้มีเลขนำหน้า เช่น audit_*.sql) */
export function listMigrationFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort((a, b) => {
      const numA = Number.parseInt(a.slice(0, 4), 10);
      const numB = Number.parseInt(b.slice(0, 4), 10);
      if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) return numA - numB;
      return a.localeCompare(b);
    })
    .map((name) => join(dir, name));
}

/** เลขนำหน้าของไฟล์ migration (เช่น 0048_ai_tutor_settings.sql → 48) */
export function migrationNumber(filePath: string): number {
  const name = filePath.replace(/\\/g, '/').split('/').pop() ?? '';
  const value = Number.parseInt(name.slice(0, 4), 10);
  return Number.isFinite(value) ? value : -1;
}

/** ตัดความคิดเห็นและบรรทัดว่างออก แล้วแยกเป็น statement ต่อ statement-breakpoint */
export function splitStatements(sqlText: string): string[] {
  return sqlText
    .split('--> statement-breakpoint')
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--') && line.trim() !== '')
        .join('\n')
        .trim(),
    )
    .filter((chunk) => chunk.length > 0);
}

/**
 * เวลาของ migration ตามที่ drizzle-kit คาดหวัง: journal.when → ถ้าไม่มีใช้เวลาแก้ไฟล์
 * (journal ของโปรเจกต์นี้ถูก gitignore → บางเครื่องไม่มี entry ของไฟล์ใหม่)
 */
export function resolveWhen(filePath: string, journalPath: string): number {
  if (existsSync(journalPath)) {
    try {
      const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
        entries?: Array<{ tag: string; when: number }>;
      };
      const tag = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.sql$/, '');
      const entry = journal.entries?.find((item) => item.tag === tag);
      if (entry && Number.isFinite(entry.when)) return entry.when;
    } catch {
      // journal อ่านไม่ได้ → ใช้เวลาแก้ไฟล์แทน
    }
  }
  return statSync(filePath).mtimeMs;
}
