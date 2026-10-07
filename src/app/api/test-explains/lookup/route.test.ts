import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rate: vi.fn(), select: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rate }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));

import { GET } from './route';

const topicExplain = { id: 11, grammarTopic: 'Present Perfect', title: 'Present Perfect', intro: null, sections: [], tip: null };
const pinnedExplain = { id: 22, grammarTopic: 'Present Simple', title: 'Present Simple', intro: null, sections: [], tip: null };

/** drizzle chain ที่ route ใช้: db.select().from().where().limit() (+ orderBy บนเส้นทาง pinned) */
function query(result: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const key of ['from', 'where', 'orderBy']) builder[key] = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue(result);
  return builder;
}

const request = (queryString = 'topic=Present%20Perfect&setId=7') =>
  new NextRequest(`http://localhost:3000/api/test-explains/lookup?${queryString}`);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'learner' } });
  mocks.rate.mockResolvedValue(null);
});

describe('GET test-explains/lookup', () => {
  it('requires authentication', async () => {
    mocks.auth.mockResolvedValue(null);

    expect((await GET(request())).status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('rejects a missing topic before touching the database', async () => {
    expect((await GET(request('setId=7'))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('answers 429 before reading the database when the learner is rate limited', async () => {
    mocks.rate.mockResolvedValue(new Response(null, { status: 429 }));

    expect((await GET(request())).status).toBe(429);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  // regression: ปุ่ม “โหมดทบทวน” เคยเปิดเนื้อหาที่ผูกกับชุดตัวแรกให้ทุกข้อ จึงเห็นเนื้อหา
  // ผิดเรื่องเมื่อชุดหนึ่งรวมหลายเรื่องไว้ — ต้องยึด grammarTopic ของข้อนั้นก่อนเสมอ
  it("prefers the explain of the question's own topic over the one pinned to the set", async () => {
    mocks.select.mockReturnValueOnce(query([topicExplain]));

    const response = await GET(request());
    const payload = await response.json();

    expect(payload.data).toEqual(topicExplain);
    expect(payload.auto).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it('falls back to the explain pinned to the set when the topic has no content', async () => {
    mocks.select.mockReturnValueOnce(query([])).mockReturnValueOnce(query([pinnedExplain]));

    const payload = await (await GET(request())).json();

    expect(payload.data).toEqual(pinnedExplain);
    expect(payload.auto).toBe(true);
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });

  it('returns null when neither the topic nor the set has published content', async () => {
    mocks.select.mockReturnValueOnce(query([])).mockReturnValueOnce(query([]));

    expect(await (await GET(request())).json()).toEqual({ success: true, data: null });
  });

  it('skips the pinned lookup when no setId is supplied', async () => {
    mocks.select.mockReturnValueOnce(query([]));

    const payload = await (await GET(request('topic=Present%20Perfect'))).json();

    expect(payload.data).toBeNull();
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });
});
