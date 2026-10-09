import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  inserted: [] as unknown[],
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mocks.select(...args),
    insert: (...args: unknown[]) => mocks.insert(...args),
    update: (...args: unknown[]) => mocks.update(...args),
  },
}));

/** โซ่ Drizzle จำลอง: ทุก method คืนตัวเอง แล้ว await ได้ค่าที่ตั้งไว้ */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'limit']) {
    b[method] = vi.fn(() => b);
  }
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return b;
}

import { GET, POST } from './route';

/** payload ของ explain ที่มีเนื้อหาอยู่ใน Type Breakdown การ์ดเดียว (ไม่มี heading/body) */
const typeBreakdownExplain = {
  grammarTopic: 'ZZTest Conditional',
  title: 'Conditional Sentences',
  status: 'published',
  sections: [
    {
      type: 'typeBreakdown',
      typeBreakdown: {
        cases: [
          {
            label: 'Type 1 :',
            color: '#8ACB66',
            description: 'มีโอกาสเกิดขึ้นจริงในอนาคต',
            structure: 'If + V.1 , will + V.1',
            example: 'If I ==study== , I ==will pass.==',
            note: 'ปัจจุบันคู่กับอนาคต (V.1 คู่ will)',
          },
        ],
      },
    },
  ],
};

/** payload ของ explain ที่มีเนื้อหาอยู่ใน Core Formula breakdown การ์ดเดียว */
const formulaExplain = {
  grammarTopic: 'ZZTest Formula',
  title: 'Question tags',
  status: 'draft',
  sections: [
    {
      type: 'formulaBreakdown',
      formula: {
        cases: [
          { label: 'เคส Is', example: "It isn't cold, is it?", left: { sentence: "It ==isn't==", note: '' }, right: { sentence: '==is== it?', note: '' } },
        ],
      },
    },
  ],
};

const importRequest = (body: unknown) =>
  new Request('http://localhost/api/admin/test-explains/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mocks.inserted.length = 0;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null, session: null });
  // ไม่มี explain เดิมที่ใช้หัวข้อนี้ → เส้นทาง insert
  mocks.select.mockReset().mockReturnValue(builder([]));
  mocks.insert.mockReset().mockImplementation(() => ({
    values: vi.fn((values: unknown) => {
      mocks.inserted.push(values);
      return Promise.resolve();
    }),
  }));
  mocks.update.mockReset().mockImplementation(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) }));
});

describe('POST /api/admin/test-explains/export — นำเข้า', () => {
  it('ปฏิเสธเมื่อไม่ได้เป็นแอดมิน', async () => {
    const error = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await POST(importRequest({ explains: [typeBreakdownExplain] }))).toBe(error);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('นำเข้า explain ที่มีแต่เคสของ Type Breakdown (ไม่มี heading) สำเร็จ', async () => {
    const response = await POST(importRequest({ explains: [typeBreakdownExplain] }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.created).toBe(1);
    expect(mocks.inserted).toHaveLength(1);
    const sections = (mocks.inserted[0] as { sections: Array<Record<string, unknown>> }).sections;
    expect(sections[0].type).toBe('typeBreakdown');
    expect((sections[0].typeBreakdown as { cases: unknown[] }).cases).toHaveLength(1);
  });

  it('นำเข้า explain ที่มีแต่เคสของ Core Formula breakdown (ไม่มี heading) สำเร็จ', async () => {
    const response = await POST(importRequest({ explains: [formulaExplain] }));
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.created).toBe(1);
    expect(mocks.inserted).toHaveLength(1);
  });

  it('ยังปฏิเสธ section ที่ไม่มีเนื้อหาจริง', async () => {
    const response = await POST(importRequest({
      explains: [{ grammarTopic: 'ZZTest Empty', title: 'ว่าง', sections: [{ type: 'importantNote', heading: '   ' }] }],
    }));
    const payload = await response.json();

    expect(payload.success).toBe(false);
    expect(payload.results[0].message).toContain('ต้องมีเนื้อหา explain อย่างน้อย 1 ส่วน');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('คืนคำเตือนเมื่อเคสของ Type Breakdown ยังไม่มีโครงสร้างหรือตัวอย่าง', async () => {
    const response = await POST(importRequest({
      explains: [{
        ...typeBreakdownExplain,
        sections: [{ type: 'typeBreakdown', heading: 'หัวการ์ด', typeBreakdown: { cases: [{ label: 'Type 1 :', description: 'คำอธิบาย', structure: '', example: '', note: '' }] } }],
      }],
    }));
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.results[0].warnings.join(' ')).toContain('typeBreakdown.cases[0]');
  });
});

describe('GET /api/admin/test-explains/export — ส่งออกแล้วนำเข้ากลับได้ (round-trip)', () => {
  it('ไฟล์ที่ส่งออกเก็บ sections ของ Type Breakdown ไว้ครบทุกฟิลด์', async () => {
    const stored = {
      id: 7,
      grammarTopic: 'ZZTest Conditional',
      grammarTopics: ['ZZTest Conditional'],
      title: 'Conditional Sentences',
      intro: null,
      tip: null,
      status: 'published',
      sections: typeBreakdownExplain.sections,
      testSetIds: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    mocks.select.mockReturnValue(builder([stored]));

    const response = await GET(new NextRequest('http://localhost/api/admin/test-explains/export?id=7'));
    const payload = await response.json();

    expect(payload.format).toBe('cefr-ready/test-explains@1');
    expect(payload.explains[0].sections).toEqual(stored.sections);

    // นำเข้าไฟล์เดิมกลับเข้าระบบ → ต้องผ่านโดยไม่สูญเสียข้อมูล
    const roundTrip = await POST(importRequest({ explains: payload.explains, mode: 'upsert' }));
    const roundTripPayload = await roundTrip.json();
    expect(roundTripPayload.success).toBe(true);
    expect(roundTripPayload.updated).toBe(1);
  });
});
