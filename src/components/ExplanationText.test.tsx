import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ExplanationText from './ExplanationText';

/**
 * เฉลยจาก CSV/DB เก็บ inline markup ไว้ (**bold** / ==highlight==) — ต้องเรนเดอร์ให้
 * ไม่ใช่โชว์เครื่องหมายดิบให้ผู้เรียนเห็น (เช่น "**yesterday**")
 */
describe('ExplanationText', () => {
  it('renders **bold** markers as strong text', () => {
    const html = renderToStaticMarkup(
      <ExplanationText text={'จากโจทย์: Oh, I ___ so ill **yesterday** that I stayed in bed.'} />,
    );
    expect(html).toContain('<strong class="font-extrabold">yesterday</strong>');
    expect(html).not.toContain('**');
  });

  it('renders ==highlight== markers as mark', () => {
    const html = renderToStaticMarkup(<ExplanationText text={'ใช้ ==never== เมื่อไม่ทำเลย'} />);
    expect(html).toContain('<mark');
    expect(html).toContain('never');
    expect(html).not.toContain('==');
  });

  it('splits run-on sentences into one line each', () => {
    const html = renderToStaticMarkup(
      <ExplanationText text={'บรรทัดแรก. บรรทัดที่สอง.'} />,
    );
    expect(html.match(/<p /g)?.length).toBe(2);
  });

  it('keeps abbreviations and lowercase continuations on one line', () => {
    const html = renderToStaticMarkup(
      <ExplanationText text={'ใช้กับคำย่อ e.g. yesterday และ i.e. today.'} />,
    );
    expect(html.match(/<p /g)?.length).toBe(1);
  });

  it('renders an empty line as spacing instead of dropping it', () => {
    const html = renderToStaticMarkup(<ExplanationText text={'บรรทัดแรก.\n\nบรรทัดที่สอง.'} />);
    expect(html.match(/<p /g)?.length).toBe(3);
  });

  it('keeps plain text plain', () => {
    const html = renderToStaticMarkup(<ExplanationText text={'ไม่มีมาร์กอัป'} />);
    expect(html).toContain('ไม่มีมาร์กอัป');
    expect(html).not.toContain('<strong');
  });
});
