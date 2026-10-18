import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { BOTTOM_BAR_SELECTOR } from '@/lib/scroll-into-view';

/**
 * การเลื่อนไปคำอธิบายเป็น opt-in — เปิดเฉพาะหน้าทำข้อสอบ (ผู้ใช้กำหนด 2026-10-18)
 * หน้าที่เฉลยมาพร้อมหน้าเลย (review / explain) ต้องไม่ให้หน้ากระโดด
 *
 * เทสต์นี้จับการเปิด/ปิดที่ระดับซอร์ส เพราะโปรเจกต์ไม่มี jsdom/happy-dom
 * (environment: node) รัน useEffect/ref callback จริงไม่ได้
 */
const CARDS = [
  'src/components/FocusFormQuestionCard.tsx',
  'src/components/ListeningAudioPlayer.tsx',
] as const;

describe('explanation reveal scroll is opt-in', () => {
  it.each(CARDS)('%s defaults the flag to off', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    expect(source).toContain('scrollToExplanationOnReveal = false');
    // ปิดไว้เป็นค่าเริ่มต้น = ไม่ส่ง ref = React ไม่มีอะไรให้เรียก = ไม่เลื่อน
    expect(source).toContain(
      'const explanationBoxRef = scrollToExplanationOnReveal ? explanationRef : undefined;',
    );
    expect(source).toContain('ref={explanationBoxRef}');
  });

  // เงื่อนไข render ยังต้องอยู่ ไม่ว่าจะเลื่อนหรือไม่ — hook อาศัยการ mount
  // ของกล่องนี้เป็นสัญญาณว่าเฉลยเพิ่งโผล่
  it.each(CARDS)('%s renders the explanation box only once it is revealed', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    expect(source).toMatch(
      /\{showExplanation\s*&&\s*(?:explanation\s*&&\s*)?\(?\s*<div ref=\{explanationBoxRef\}/,
    );
  });
});

describe('which pages scroll to the explanation', () => {
  const EXAM_PAGES = [
    'src/app/tests/[sectionId]/[setId]/page.tsx',
    'src/app/tests/full/exam/page.tsx',
    'src/app/demo/exam/page.tsx',
  ] as const;

  // หน้าทำข้อสอบ — เฉลยโผล่หลังกดตรวจคำตอบ ต้องพาผู้เรียนไปเจอ
  it.each(EXAM_PAGES)('%s opts in on every question card', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    const cards = source.match(/<(FocusFormQuestionCard|ListeningAudioPlayer)\b/g) ?? [];
    expect(cards.length).toBeGreaterThan(0);
    expect(source.match(/scrollToExplanationOnReveal\b/g) ?? []).toHaveLength(cards.length);
  });

  // หน้าที่เฉลยมาพร้อมหน้าเลย หรือไม่ใช่หน้าทำข้อสอบ — ต้องไม่เลื่อน
  const NO_SCROLL_PAGES = [
    'src/app/review/[attemptId]/page.tsx',
    'src/app/demo/focus-form/page.tsx',
    'src/app/demo/listening/page.tsx',
    'src/app/demo/focus-meaning/page.tsx',
  ] as const;

  it.each(NO_SCROLL_PAGES)('%s never opts in', (file) => {
    expect(readFileSync(resolve(file), 'utf8')).not.toContain('scrollToExplanationOnReveal');
  });

  // หน้าอธิบายไม่ได้ใช้การ์ดเหล่านี้อยู่แล้ว จึงไม่ต้องแตะและไม่ต้องกันเป็นพิเศษ
  const EXPLAIN_PAGES = [
    'src/app/tests/[sectionId]/[setId]/explain/page.tsx',
    'src/components/TestSetExplainView.tsx',
    'src/components/TestExplainOverlay.tsx',
  ] as const;

  it.each(EXPLAIN_PAGES)('%s does not use the question cards at all', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    expect(source).not.toContain('FocusFormQuestionCard');
    expect(source).not.toContain('ListeningAudioPlayer');
  });
});

describe('reveal timing must wait for paint, not a guessed delay', () => {
  const HOOK = 'src/lib/use-scroll-on-reveal.ts';
  const source = readFileSync(resolve(HOOK), 'utf8');

  // เดิมใช้ setTimeout(100) ซึ่งเป็นการเดาเวลา ไม่ใช่การรอจริง
  // ถ้า 100ms ไม่พอ (ฟอนต์/ข้อความยังไม่ลง) จะวัดตำแหน่งผิด
  // แล้วหน้าขยับตามทีหลัง ซึ่งผู้ใช้รู้สึกเป็น "กระตุก/กระโดด"
  it('no longer schedules the scroll on a magic timeout', () => {
    // เช็คเฉพาะฝั่งโค้ด — คำว่า setTimeout ยังปรากฏในคอมเมนต์ที่อธิบายว่าเคยใช้
    expect(source).not.toMatch(/window\.setTimeout\(/);
    expect(source).not.toMatch(/delayMs/);
  });

  // rAF ชั้นแรก = หลัง commit · ชั้นที่สอง = หลังเบราว์เซอร์ paint
  it('waits two animation frames so layout has settled before measuring', () => {
    expect(source).toContain('requestAnimationFrame');
    expect(source).toMatch(/requestAnimationFrame\([\s\S]*?requestAnimationFrame\(/);
  });

  // ref callback ถูกเรียกซ้ำได้ตอน re-mount — สั่งซ้ำระหว่างที่ animation
  // กำลังวิ่งจะทำให้หน้ากระตุก ต้องมีธงกัน
  it('guards against issuing the scroll twice for the same explanation', () => {
    expect(source).toContain('scrolledNodeRef');
    expect(source).toMatch(/scrolledNodeRef\.current === node/);
  });

  it('cancels pending frames on unmount', () => {
    expect(source).toContain('cancelAnimationFrame');
  });
});

describe('bottom bar must be measurable', () => {
  // ถ้า TestLayout เปลี่ยน class ของแถบล่างจนหลุดจาก selector ที่วัดไว้
  // เฉลยที่อยู่ใต้แถบจะถูกนับว่า "เห็นครบ" แล้วเลื่อนไม่ทำงานอีก
  it('the fixed bottom bar carries the attribute the measurement looks for', () => {
    const source = readFileSync(resolve('src/components/TestLayout.tsx'), 'utf8');
    expect(source).toContain(BOTTOM_BAR_SELECTOR.replace(/[[\]']/g, ''));
    expect(source).toMatch(/data-quiz-bottom-bar[^"]*"[^"]*fixed bottom-0/);
  });
});
