import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), isAdmin: vi.fn() }));

vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: mocks.getUser }));
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: mocks.isAdmin }));

const ATTEMPT = {
  id: 5,
  userId: 'owner-id',
  status: 'completed',
  score: '50',
  totalQuestions: 1,
  correctAnswers: 0,
  startedAt: null,
  completedAt: null,
  currentLevels: {},
  adaptivePath: [],
};

/** db.select() chain — query แรกคืน attempt, ที่เหลือคืน [] */
vi.mock('@/db', () => {
  const makeChain = () => {
    let result: unknown[] = [];
    const chain = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      then: (resolve: (rows: unknown[]) => unknown) => resolve(result),
      __set: (rows: unknown[]) => { result = rows; },
    };
    return chain;
  };
  let calls = 0;
  return {
    db: {
      select: () => {
        const chain = makeChain();
        chain.__set(calls === 0 ? [ATTEMPT] : []);
        calls += 1;
        return chain;
      },
      __reset: () => { calls = 0; },
    },
  };
});

import { db } from '@/db';
import { GET } from './route';

const request = () => new NextRequest('http://localhost:3000/api/tests/attempts/5');
const props = { params: Promise.resolve({ attemptId: '5' }) };

beforeEach(() => {
  vi.clearAllMocks();
  (db as unknown as { __reset: () => void }).__reset();
});

describe('GET /api/tests/attempts/[attemptId] — ктоดูได้', () => {
  it('ยังไม่ล็อกอิน = 401', async () => {
    mocks.getUser.mockResolvedValue(null);
    expect((await GET(request(), props)).status).toBe(401);
  });

  it('ผู้ใช้อื่นที่ไม่ใช่แอดมิน = 404 (ไม่บอกว่า attempt มีจริง)', async () => {
    mocks.getUser.mockResolvedValue({ id: 'someone-else' });
    mocks.isAdmin.mockResolvedValue(false);
    expect((await GET(request(), props)).status).toBe(404);
  });

  it('แอดมินเปิดผลของผู้ใช้คนอื่นได้', async () => {
    mocks.getUser.mockResolvedValue({ id: 'admin-id' });
    mocks.isAdmin.mockResolvedValue(true);
    const res = await GET(request(), props);
    expect(res.status).toBe(200);
    expect((await res.json()).data.attempt.id).toBe(5);
  });
});
