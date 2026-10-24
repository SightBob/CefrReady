import { describe, expect, it } from 'vitest';

import { AI_TUTOR_EXPORT_HEADER, buildAiTutorCsv, hashUserId, type AiTutorExportRow } from './export-csv';

const row: AiTutorExportRow = {
  id: 1,
  userId: '50a71875-1f42-4ee4-80dc-2ef6ec303597',
  questionId: 2098,
  role: 'user',
  content: 'ทำไมต้องใช้ช่อง 2',
  status: 'ok',
  selectedAnswer: 'goes',
  isCorrect: true,
  category: null,
  fallbackUsed: null,
  finishReason: null,
  latencyMs: 1200,
  inputTokens: 100,
  outputTokens: 50,
  model: 'minimax/minimax-m3.1-flash:free',
  createdAt: new Date('2026-10-20T00:00:00.000Z'),
  grammarTopic: 'Past Simple',
  cefrLevel: 'A2',
  questionText: 'He ___ to school every day.',
  feedback: null,
};

describe('export CSV — ไม่มีข้อมูลระบุตัวตน', () => {
  const csv = buildAiTutorCsv([row], 'salt-123');

  it('ไม่มีคอลัมน์อีเมล/ชื่อ/รูปภาพ', () => {
    const header = csv.split('\n')[0].toLowerCase();
    expect(header).not.toContain('email');
    expect(header).not.toContain('name');
    expect(header).not.toContain('image');
    expect(header).not.toContain('picture');
    expect(AI_TUTOR_EXPORT_HEADER).not.toContain('email' as never);
  });

  it('ไม่มีค่าอีเมลของผู้ใช้ในไฟล์', () => {
    expect(csv).not.toContain('@');
    expect(csv).not.toContain('50a71875-1f42-4ee4-80dc-2ef6ec303597');
  });

  it('user_id ถูก hash ด้วย salt (คนเดิมได้ค่าเดิม, คนละคนได้ค่าต่างกัน)', () => {
    const hashed = hashUserId(row.userId, 'salt-123');
    expect(hashed).not.toBe(row.userId);
    expect(hashed).toHaveLength(16);
    expect(hashUserId(row.userId, 'salt-123')).toBe(hashed);
    expect(hashUserId(row.userId, 'other-salt')).not.toBe(hashed);
    expect(hashUserId('other-user', 'salt-123')).not.toBe(hashed);
    expect(csv).toContain(hashed);
  });

  it('เก็บฟิลด์ที่ใช้วิเคราะห์ครบ', () => {
    const header = csv.split('\n')[0];
    for (const column of [
      'selected_answer', 'is_correct', 'category', 'fallback_used', 'finish_reason',
      'input_tokens', 'output_tokens', 'model', 'feedback', 'grammar_topic',
    ]) {
      expect(header).toContain(column);
    }
  });

  it('escape เครื่องหมาย quote และ comma ในเนื้อหา', () => {
    const withComma = buildAiTutorCsv([{ ...row, content: 'ทำไม, งง' }], 'salt-123');
    expect(withComma).toContain('"ทำไม, งง"');
  });
});
