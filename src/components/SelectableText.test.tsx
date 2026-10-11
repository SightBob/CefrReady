import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import SelectableText from './SelectableText';

// เมื่อก่อนทุกอินสแตนซ์ฉีด <style> ชุดเดียวกันเอง (13 คำบนหน้า = 13 กฎซ้ำในเอกสารเดียว)
// กฎย้ายไป src/app/globals.css แล้ว เทสต์นี้กันไม่ให้กลับมาแบบเดิมอีก
describe('SelectableText selection highlight', () => {
  it('renders no per-instance style block', () => {
    const html = renderToStaticMarkup(<SelectableText text="She goes to school." />);
    expect(html).not.toContain('<style');
    expect(html).toContain('selectable-text');
  });

  it('keeps the selection colour in the global stylesheet', () => {
    const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toContain('.selectable-text ::selection');
    expect(css).toContain('.selectable-text ::-moz-selection');
    expect(css).toContain('#fbbf24');
  });
});
