import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { canShowToast } from './toast-routes';

/**
 * `<Toaster/>` ถูก mount เฉพาะเส้นทางใน canShowToast() เพื่อไม่ให้ sonner
 * ติดไปทุกหน้า ถ้ามีคนเพิ่ม page ที่เรียก toast นอกเส้นทางพวกนี้ toast จะหาย
 * เงียบ ๆ — เทสต์นี้สแกนซอร์สจริงเพื่อกันเคสนั้น
 */

const APP_DIR = path.join(__dirname, '..', 'app');

function collectPages(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectPages(full, found);
    } else if (entry.name === 'page.tsx') {
      found.push(full);
    }
  }
  return found;
}

/** src/app/tests/full/results/page.tsx → /tests/full/results */
function routeOf(file: string): string {
  const relative = path.relative(APP_DIR, path.dirname(file)).replace(/\\/g, '/');
  return relative === '' ? '/' : `/${relative}`;
}

describe('toast routes', () => {
  const pages = collectPages(APP_DIR);

  it('masks the toaster on for routes that fire toasts', () => {
    expect(canShowToast('/admin')).toBe(true);
    expect(canShowToast('/admin/users')).toBe(true);
    expect(canShowToast('/contact')).toBe(true);
    expect(canShowToast('/tests')).toBe(true);
    expect(canShowToast('/tests/focus-form/1')).toBe(true);
    expect(canShowToast('/tests/full/results')).toBe(true);
    expect(canShowToast('/demo/exam')).toBe(true);
  });

  it('keeps the toaster off content pages (no toast can fire there)', () => {
    expect(canShowToast('/')).toBe(false);
    expect(canShowToast('/cefr')).toBe(false);
    expect(canShowToast('/progress')).toBe(false);
    expect(canShowToast('/packages')).toBe(false);
    expect(canShowToast('/privacy')).toBe(false);
    // ต้องไม่จับ prefix ที่เพียงขึ้นต้นคล้ายกัน
    expect(canShowToast('/contact-us')).toBe(false);
    expect(canShowToast('/testimonials')).toBe(false);
    expect(canShowToast('/administrator')).toBe(false);
  });

  it('covers every app page that imports sonner', () => {
    const offenders = pages
      .filter((file) => /from 'sonner'/.test(fs.readFileSync(file, 'utf8')))
      .filter((file) => !canShowToast(routeOf(file)))
      .map((file) => `${routeOf(file)} (${path.relative(APP_DIR, file).replace(/\\/g, '/')})`);

    expect(offenders).toEqual([]);
  });
});
