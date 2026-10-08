import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rate: vi.fn(),
  select: vi.fn(),
  admin: vi.fn(),
  /** บันทึกการเรียก eq() เพื่อยืนยันว่ามี/ไม่มีตัวกรองสถานะ published */
  eqCalls: [] as Array<[unknown, unknown]>,
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rate }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: mocks.admin }));
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => {
      mocks.eqCalls.push([column, value]);
      return actual.eq(
        column as Parameters<typeof actual.eq>[0],
        value as Parameters<typeof actual.eq>[1],
      );
    },
  };
});

import { GET } from './route';

const section = (heading: string, visibility?: 'draft') => ({ type: 'rule', heading, ...(visibility ? { visibility } : {}) });
const topicExplain = { id: 11, grammarTopic: 'Present Perfect', title: 'Present Perfect', intro: null, sections: [section('หลักการใช้')], tip: null, status: 'published' };
const pinnedExplain = { id: 22, grammarTopic: 'Present Simple', title: 'Present Simple', intro: null, sections: [section('หลักการใช้')], tip: null, status: 'published' };

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
  mocks.admin.mockResolvedValue(true);
  mocks.eqCalls.length = 0;
});

/** จำนวนครั้งที่ query กรองด้วย status = 'published' */
const publishedFilterCalls = () =>
  mocks.eqCalls.filter(
    ([column, value]) => (column as { name?: string })?.name === 'status' && value === 'published'
  ).length;

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

  // เนื้อหาที่ไม่ใช่ published ผู้เรียนต้องไม่ได้รับ — แอดมินดูของที่ยังไม่เสร็จได้จากหน้าแอดมิน
  it.each(['draft', 'review', 'hidden'] as const)('withholds %s content from learners', async (status) => {
    // ยังต้องลองเส้นทาง pinned ต่อ เพราะเรื่องนี้ยังไม่พร้อม
    mocks.select.mockReturnValueOnce(query([{ ...topicExplain, status }])).mockReturnValueOnce(query([]));

    expect(await (await GET(request())).json()).toEqual({ success: true, data: null });
  });

  it('drops draft parts and returns null when every part is still a draft', async () => {
    mocks.select.mockReturnValueOnce(query([{ ...topicExplain, sections: [section('A'), section('B', 'draft')] }]));
    const payload = await (await GET(request())).json();
    expect(payload.data.sections.map((item: { heading: string }) => item.heading)).toEqual(['A']);

    mocks.select.mockReturnValueOnce(query([{ ...topicExplain, sections: [section('A', 'draft')] }])).mockReturnValueOnce(query([]));
    expect(await (await GET(request())).json()).toEqual({ success: true, data: null });
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

  it('filters by published status for ordinary learners', async () => {
    mocks.select.mockReturnValueOnce(query([topicExplain]));

    await GET(request());

    expect(publishedFilterCalls()).toBeGreaterThan(0);
  });

  // โหมดพรีวิว: แอดมินต้องเห็นเนื้อหา รอตรวจสอบ ของตัวเองในหน้าสอบ — แต่ผู้เรียนยังไม่เห็น
  describe('?preview=1', () => {
    const reviewTopic = { ...topicExplain, status: 'review' };

    it('lets an admin read content that is still in review, without the published filter', async () => {
      mocks.select.mockReturnValueOnce(query([reviewTopic]));

      const payload = await (await GET(request('topic=Present%20Perfect&setId=7&preview=1'))).json();

      expect(payload.data).toEqual(reviewTopic);
      expect(payload.preview).toBe(true);
      expect(publishedFilterCalls()).toBe(0);
    });

    it('still trims draft parts out of the preview', async () => {
      mocks.select.mockReturnValueOnce(
        query([{ ...reviewTopic, sections: [section('A'), section('B', 'draft')] }])
      );

      const payload = await (await GET(request('topic=Present%20Perfect&setId=7&preview=1'))).json();

      expect(payload.data.sections.map((item: { heading: string }) => item.heading)).toEqual(['A']);
    });

    it('falls back to a set-pinned review explain and flags the preview', async () => {
      mocks.select
        .mockReturnValueOnce(query([]))
        .mockReturnValueOnce(query([{ ...pinnedExplain, status: 'review' }]));

      const payload = await (await GET(request('topic=Present%20Perfect&setId=7&preview=1'))).json();

      expect(payload.auto).toBe(true);
      expect(payload.preview).toBe(true);
      expect(publishedFilterCalls()).toBe(0);
    });

    it('refuses the preview for a non-admin account without reading content', async () => {
      mocks.admin.mockResolvedValue(false);

      const response = await GET(request('topic=Present%20Perfect&setId=7&preview=1'));

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ success: false, error: 'โหมดพรีวิวใช้ได้เฉพาะบัญชีผู้ดูแล' });
      expect(mocks.select).not.toHaveBeenCalled();
    });
  });
});
