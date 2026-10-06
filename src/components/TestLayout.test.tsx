import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import TestLayout from './TestLayout';

describe('TestLayout primary teaching action', () => {
  it('preserves ordinary next and final-check buttons without an override', () => {
    const next = renderToStaticMarkup(<TestLayout totalQuestions={2} currentQuestion={0} answers={['A', null]}><p>Question</p></TestLayout>);
    const last = renderToStaticMarkup(<TestLayout totalQuestions={2} currentQuestion={1} answers={['A', 'B']}><p>Question</p></TestLayout>);
    expect(next).toContain('>ข้อต่อไป</span>');
    expect(last).toContain('>ตรวจคำตอบ</span>');
  });
  it('shows the teaching check before final submission, with disabled state', () => {
    const html = renderToStaticMarkup(<TestLayout totalQuestions={1} currentQuestion={0} answers={['A']} primaryAction={{ label: 'กำลังตรวจ…', onClick: () => undefined, disabled: true }}><p>Question</p></TestLayout>);
    expect(html).toContain('>กำลังตรวจ…</span>'); expect(html).not.toContain('>ตรวจคำตอบ</span>');
    expect(html).toContain('disabled=""');
  });
  it('can label submission separately after the final Tap feedback', () => {
    const html = renderToStaticMarkup(<TestLayout totalQuestions={1} currentQuestion={0} answers={['A']} primaryAction={{ label: 'ส่งคำตอบ', onClick: () => undefined }}><p>Question</p></TestLayout>);
    expect(html).toContain('>ส่งคำตอบ</span>');
  });
});
