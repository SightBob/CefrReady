import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * root layout ประกาศ title.template = '%s | CEFR Ready' (src/app/layout.tsx)
 * ทุก route ที่ซ้อนอยู่ใต้ app/ จึงรับ suffix นี้ไปแล้ว — ถ้า title ของหน้านั้น
 * ใส่ " | CEFR Ready" เองอีกที แท็บจะกลายเป็น "ชื่อหน้า | CEFR Ready | CEFR Ready"
 *
 * openGraph/twitter ไม่ผ่าน template จึงยังต้องมีชื่อเว็บเองได้
 * เทสต์นี้สแกนซอร์ส: title: ที่อยู่นอก openGraph/twitter ห้ามมีคำว่า "CEFR Ready"
 */

const APP_DIR = path.join(__dirname);

function collectSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, found);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

const TOKEN_RE = /\{|\}|[A-Za-z_$][\w$]*\s*:/g;
const BRANDED_KEYS = new Set(['openGraph', 'twitter']);

function findTitleViolations(source: string): string[] {
  const violations: string[] = [];
  const lines = source.split(/\r?\n/);
  const brandStack: boolean[] = [false];
  let pendingBrand = false;

  lines.forEach((line, index) => {
    let match: RegExpExecArray | null;
    TOKEN_RE.lastIndex = 0;

    while ((match = TOKEN_RE.exec(line)) !== null) {
      const token = match[0];
      if (token === '{') {
        brandStack.push(pendingBrand);
        pendingBrand = false;
        continue;
      }
      if (token === '}') {
        if (brandStack.length > 1) brandStack.pop();
        pendingBrand = false;
        continue;
      }

      const key = token.slice(0, -1).trim();
      if (BRANDED_KEYS.has(key)) {
        pendingBrand = true;
        continue;
      }

      if (key === 'title') {
        pendingBrand = false;
        const insideBrand = brandStack.some(Boolean);
        // value ของ title ในโปรเจกต์นี้อยู่ในบรรทัดเดียวกันเสมอ (title: '...' หรือ `${...}`)
        const value = line.slice(match.index + token.length);
        if (!insideBrand && value.includes('CEFR Ready')) {
          violations.push(`${index + 1}: ${line.trim()}`);
        }
        continue;
      }

      pendingBrand = false;
    }
  });

  return violations;
}

describe('metadata titles', () => {
  const files = collectSourceFiles(APP_DIR).filter((file) => !file.endsWith('metadata-titles.test.ts'));

  // หน้าหลักคือ route เดียวที่ title ไม่ผ่าน template ของ root layout จึงใส่ชื่อเว็บได้
  const ROOT_PAGE = 'page.tsx';

  it('never repeats the "| CEFR Ready" suffix inside a page title', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const relative = path.relative(APP_DIR, file).replace(/\\/g, '/');
      if (relative === ROOT_PAGE) continue;
      for (const violation of findTitleViolations(fs.readFileSync(file, 'utf8'))) {
        offenders.push(`${relative} → ${violation}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('covers the pages that previously duplicated the suffix', () => {
    const relative = files.map((file) => path.relative(APP_DIR, file).replace(/\\/g, '/'));
    expect(relative).toEqual(
      expect.arrayContaining([
        'layout.tsx',
        'tests/layout.tsx',
        'guide/[slug]/page.tsx',
        'review/layout.tsx',
        'demo/listening/layout.tsx',
      ]),
    );
  });
});
