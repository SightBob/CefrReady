/**
 * หน้า practice ต้องใช้ apiFetch เหมือนหน้า full exam เพื่อให้ error ที่ผู้เรียน
 * เห็นตรงกันทั้งสองหน้า (401 → SESSION_EXPIRED, 429 → RATE_LIMITED)
 *
 * ยกเว้นสองจุดที่ต้องอ่านข้อความจาก body ตรง ๆ เพราะ apiFetch จะแปลง
 * 429 เป็น RATE_LIMITED:<วินาที> ทำให้ข้อความที่ผู้เรียนเห็นเปลี่ยน
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);

/** ดูว่าการเรียก URL นี้ผ่าน apiFetch หรือ fetch ตรง */
function callKindFor(url: string): 'apiFetch' | 'fetch' | 'none' {
  let idx = -1;
  while ((idx = src.indexOf(url, idx + 1)) !== -1) {
    const quote = src[idx - 1];
    if (quote !== "'" && quote !== '`') continue;
    const callee = src.slice(0, idx - 1).match(/([A-Za-z0-9_$]+)\s*\($/)?.[1] ?? '';
    if (callee === 'apiFetch') return 'apiFetch';
    if (callee === 'fetch') return 'fetch';
  }
  return 'none';
}

describe('หน้า practice ใช้ apiFetch สำหรับการอ่านข้อมูล', () => {
  const shouldUse = [
    '/api/tests-maintenance',
    '/api/test-sets?sectionId=',
    '/api/test-explains/lookup?topic=',
    '/api/test-sets/${setId}${previewMode',
    '/api/test-sets/${setId}/explains',
    '/api/progress',
  ];

  for (const url of shouldUse) {
    it(`${url} ใช้ apiFetch`, () => {
      expect(callKindFor(url), `${url} ไม่พบการเรียกเลย`).not.toBe('none');
      expect(callKindFor(url), `${url} ยังใช้ fetch ตรง`).toBe('apiFetch');
    });
  }
});

describe('ยกเว้นที่ห้ามแตะ — ต้องอ่านข้อความจาก body ตรง ๆ', () => {
  it('check-answer ยังใช้ fetch ตรง เพราะต้องโชว์ข้อความไทยตอน 429', () => {
    expect(src).toContain("fetch('/api/tests/check-answer'");
    expect(src).not.toContain("apiFetch('/api/tests/check-answer'");
  });

  it('tap-reason ยังใช้ fetch ตรง', () => {
    expect(src).toContain("fetch('/api/tests/tap-reason'");
    expect(src).not.toContain("apiFetch('/api/tests/tap-reason'");
  });

  it('submit ใช้ apiFetch อยู่แล้ว', () => {
    expect(src).toContain("apiFetch('/api/tests/submit'");
  });
});