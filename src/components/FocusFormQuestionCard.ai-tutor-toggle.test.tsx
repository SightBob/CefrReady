// @vitest-environment jsdom
/**
 * Flow ใหม่ (ผู้ใช้กำหนด 2026-10-25, Figma 600:27645):
 * เฉลย → เห็นคำอธิบาย + ปุ่ม "หากยังไม่เข้าใจ ลองถาม AI เพิ่มเติมได้เลย"
 * → กดปุ่ม → กล่องเฉลยถูกแทนด้วยกรอบ AI Tutor (คำอธิบายเป็นบทสนทนาแรก)
 *
 * ใช้โหมด mock ของ AiTutorPanel (ไม่ส่ง questionId) เพื่อไม่ต้องต่อ /api/ai-tutor
 * — ตัวโหมดสดมีเทสของตัวเองแยกอยู่แล้ว
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import FocusFormQuestionCard from './FocusFormQuestionCard';

const props = {
  questionText: 'What do they usually do?',
  options: [
    { key: 'A', value: 'be' },
    { key: 'B', value: 'do' },
  ],
  selectedAnswer: 'A',
  correctAnswer: 'B',
  explanation: 'หลัง [do/does/did] ต้องตามด้วยกริยาช่อง 1 เสมอ',
  onAnswerSelect: () => undefined,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // ปิดคำเตือน "not configured to support act(...)" ของ React 19 ใน jsdom
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function findTutorButton() {
  return [...container.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('ลองถาม AI'),
  ) ?? null;
}

describe('FocusFormQuestionCard — ปุ่มชวนถาม AI ในกล่องเฉลย', () => {
  it('กดปุ่มแล้วจึงเปลี่ยนเป็นกรอบ AI Tutor', async () => {
    await act(async () => {
      root.render(<FocusFormQuestionCard {...props} aiTutor />);
    });

    // ก่อนกด: เห็นกล่องเฉลย ยังไม่มีกรอบ AI
    expect(container.textContent).toContain('แวะอ่านสักนิด ครั้งหน้าทำได้แน่');
    expect(container.textContent).toContain('กริยาช่อง 1');
    expect(container.textContent).not.toContain('โหมด AI');

    const button = findTutorButton();
    expect(button).toBeTruthy();

    await act(async () => {
      button!.click();
    });

    expect(container.textContent).toContain('โหมด AI');
    expect(findTutorButton()).toBeNull();
  });

  it('พาร์ทที่ไม่ได้เปิด AI Tutor ไม่มีปุ่มให้กด', async () => {
    await act(async () => {
      root.render(<FocusFormQuestionCard {...props} />);
    });

    expect(findTutorButton()).toBeNull();
    expect(container.textContent).toContain('แวะอ่านสักนิด ครั้งหน้าทำได้แน่');
  });
});
