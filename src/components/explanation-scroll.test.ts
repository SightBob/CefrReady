import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * สัญญาของ useScrollIntoViewOnReveal — hook นี้ใช้ "การ mount ของกล่องคำอธิบาย"
 * เป็นสัญญาณว่าเฉลยเพิ่งโผล่ ถ้ากล่องนั้นถูก render ตลอดเวลา (ไม่มีเงื่อนไข)
 * hook จะยิงตอน mount หน้า ซึ่งผิด (หน้า review จะกระโดดตอนเปิด)
 *
 * เทสต์นี้จับสัญญาไว้ระดับซอร์ส เพราะโปรเจกต์ไม่มี jsdom/happy-dom
 * (environment: node) รัน useEffect จริงไม่ได้
 */
const CARDS = [
  'src/components/FocusFormQuestionCard.tsx',
  'src/components/ListeningAudioPlayer.tsx',
] as const;

describe('explanation reveal scroll contract', () => {
  it.each(CARDS)('%s binds the reveal hook, not a plain ref', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    expect(source).toContain('useScrollIntoViewOnReveal()');
    expect(source).toContain('ref={explanationRef}');
    // ref ต้องมาจาก hook — ถ้าเปลี่ยนกลับไป useRef การเลื่อนจะหายเงียบ
    expect(source).not.toMatch(/useRef<HTMLDivElement[^>]*>\(null\);\s*\n\s*const explanationRef/);
  });

  it.each(CARDS)('%s renders the explanation box only once it is revealed', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    // เงื่อนไขต้องอยู่ติดกับ div ที่ใช้ ref — นี่คือสัญญาณที่ hook อาศัย
    expect(source).toMatch(/\{showExplanation\s*&&\s*(?:explanation\s*&&\s*)?\(?\s*<div ref=\{explanationRef\}/);
  });

  it.each(CARDS)('%s no longer carries the guard that died with the old answer flow', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    // เดิมยึด "selectedAnswer เพิ่งเปลี่ยนจาก null" ซึ่งเป็นจริงตอนเลือก
    // (ตอนยังไม่มีเฉลย) และเป็นเท็จตอนเฉลยโผล่ (selectedAnswer ไม่เปลี่ยน)
    // ทำให้การเลื่อนไม่เคยทำงานเลยสักครั้งหลังเปลี่ยนมาใช้ปุ่มตรวจคำตอบ
    expect(source).not.toContain('wasUnanswered');
    expect(source).not.toMatch(/explanationRef\.current\?\.scrollIntoView/);
  });
});
