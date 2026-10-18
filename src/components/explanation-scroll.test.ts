import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
