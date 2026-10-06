import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = vi.hoisted(() => ({ path: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.path }));
import ChromeShell from './ChromeShell';
describe('ChromeShell server slots', () => {
  it.each([
    ['/', true, true], ['/tests', true, true], ['/tests/focus-form', false, true],
    ['/tests/focus-form/1', false, false], ['/tests/full/exam', false, false],
    ['/tests/full', true, true], ['/admin/ai-settings', false, false],
  ])('preserves header/footer on %s', (path, header, footer) => {
    mocks.path = path;
    const html = renderToStaticMarkup(<ChromeShell header={<header>Site header</header>} footer={<footer>Site footer</footer>} headerFallback={null} mainFallback={null}><p>Content</p></ChromeShell>);
    expect(html.includes('Site header')).toBe(header); expect(html.includes('Site footer')).toBe(footer);
    expect(html).toContain('Content'); expect(html.includes('pt-[64px]')).toBe(header);
  });
});
