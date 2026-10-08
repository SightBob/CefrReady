import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  select: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: { select: (...args: unknown[]) => mocks.select(...args) },
}));

/** โซ่ Drizzle จำลอง: ทุก method คืนตัวเอง แล้ว await ได้ค่าที่ตั้งไว้ */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'limit']) {
    b[method] = vi.fn(() => b);
  }
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { GET } from './route';

const request = () => new NextRequest('http://localhost/api/admin/test-explains/topics/Quantifiers/questions');
const params = (topic: string) => ({ params: Promise.resolve({ topic }) });

const sampleRows = [
  { id: 2083, questionText: 'There are ___ apples left.', correctAnswer: 'B', subTopicGrammar: null },
  { id: 2084, questionText: 'How ___ milk do you need?', correctAnswer: 'A', subTopicGrammar: 'Countable vs uncountable' },
];

beforeEach(() => {
  mocks.dbError = null;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null, session: null });
  mocks.select.mockReset().mockReturnValue(builder(sampleRows));
});

describe('GET /api/admin/test-explains/topics/[topic]/questions', () => {
  it('returns the requireAdmin error without querying', async () => {
    const error = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await GET(request(), params('Quantifiers'))).toBe(error);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns the questions with their sub-topic for the requested topic', async () => {
    const response = await GET(request(), params('Quantifiers'));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.topic).toBe('Quantifiers');
    expect(payload.data.questions).toEqual(sampleRows);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('trims the topic and filters by it (exact match like the quiz page)', async () => {
    await GET(request(), params('  Quantifiers  '));
    const chain = mocks.select.mock.results[0].value as { where: ReturnType<typeof vi.fn> };
    expect(chain.where).toHaveBeenCalledTimes(1);
    expect(chain.where.mock.calls[0][0]).toBeDefined();
  });

  it('rejects an empty/oversized topic without touching the database', async () => {
    for (const topic of ['', '   ', 'x'.repeat(201)]) {
      const response = await GET(request(), params(topic));
      expect(response.status).toBe(400);
    }
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns 500 without leaking database errors', async () => {
    mocks.dbError = new Error('password authentication failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await GET(request(), params('Quantifiers'));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: 'Failed to fetch topic questions' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
