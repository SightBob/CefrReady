/**
 * Regression test: POST /api/admin/test-sets/[id]/questions/create
 *
 * บั๊ก: ใช้ COUNT(*) เป็น orderIndex ของข้อใหม่ ซึ่งผิดเมื่อชุดมีช่องว่าง
 * (เช่น 0,1,5 → count = 3 ซึ่งชนกับแถวเดิม) และ migration 0044 บังคับ
 * unique (test_set_id, order_index) ไว้แล้ว
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const table = (name: string) =>
    new Proxy({} as Record<string, unknown>, {
      get: (_t, p: string | symbol) => {
        if (typeof p === 'symbol') return undefined;
        if (p === '__name') return name;
        if (p === 'then') return undefined;
        if (p === 'toString') return () => name;
        return `${name}.${p}`;
      },
    });

  const state = {
    queries: [] as string[],
    pendingValues: [] as Record<string, unknown>[],
    maxOrder: null as number | null,
  };

  function resolve(ops: string[], tbl: string | null): unknown {
    if (ops[0] === 'insert' && tbl === 'testSetQuestions') {
      return [{ id: 999, ...state.pendingValues[0] }];
    }
    if (ops[0] === 'insert' && tbl === 'questions') {
      return [{ id: 501, ...(state.pendingValues[0] ?? {}) }];
    }
    if (tbl === 'testSets') return [{ id: 1 }];
    if (tbl === 'testSetQuestions') return [{ maxOrder: state.maxOrder }];
    if (tbl === 'testTypes') return [{ id: 'focus-form', name: 'Focus on Form' }];
    if (tbl === 'questions') return [];
    return [];
  }

  function mk(ops: string[], tbl: string | null): unknown {
    const sig = `${tbl ?? '?'}#${ops.join('.')}`;
    return new Proxy({}, {
      get(_t: unknown, prop: string | symbol) {
        if (prop === 'then') {
          return (res: (v: unknown) => void) => {
            state.queries.push(sig);
            res(resolve(ops, tbl));
          };
        }
        if (prop === 'toString') return () => sig;
        if (typeof prop === 'symbol') return undefined;
        return (...args: unknown[]) => {
          let nextTbl = tbl;
          if (prop === 'from' || prop === 'insert') {
            nextTbl = (args[0] as { __name?: string } | undefined)?.__name ?? null;
          }
          if (prop === 'values') {
            const v = args[0];
            state.pendingValues = (Array.isArray(v) ? v : [v]) as Record<string, unknown>[];
          }
          return mk([...ops, String(prop)], nextTbl);
        };
      },
    });
  }

  const db: unknown = new Proxy({}, {
    get(_t, prop: string | symbol) {
      if (prop === 'then') return undefined;
      if (prop === 'transaction') {
        return async (fn: (t: unknown) => Promise<unknown>) => fn(db);
      }
      return (...args: unknown[]) =>
        mk([String(prop)], String(prop) === 'insert' ? (args[0] as { __name?: string } | undefined)?.__name ?? null : null);
    },
  });

  return { table, state, db };
});

vi.mock('@/db/schema', () => ({
  questions: h.table('questions'),
  testSetQuestions: h.table('testSetQuestions'),
  testSets: h.table('testSets'),
  testTypes: h.table('testTypes'),
}));
vi.mock('@/db', () => ({ get db() { return h.db; } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => ({ error: null, session: null }) }));
vi.mock('@/lib/full-test/question-pool', () => ({ revalidateQuestionPool: () => {} }));

import { POST } from './route';

async function run(maxOrder: number | null) {
  h.state.queries = [];
  h.state.pendingValues = [];
  h.state.maxOrder = maxOrder;
  const req = {
    json: async () => ({
      testTypeId: 'focus-form',
      questionText: 'A brand new question that does not exist yet?',
      optionA: 'alpha', optionB: 'beta', optionC: 'gamma', optionD: 'delta',
      correctAnswer: 'A',
      explanation: 'because',
      cefrLevel: 'B1',
      difficulty: 'easy',
    }),
    params: Promise.resolve({ id: '1' }),
  };
  const res = await POST(req as never, { params: Promise.resolve({ id: '1' }) });
  const body = await res.json();
  return { body, queries: [...h.state.queries], values: [...h.state.pendingValues] };
}

describe('POST /api/admin/test-sets/[id]/questions/create — orderIndex ของข้อใหม่', () => {
  beforeEach(() => {
    h.state.queries = [];
    h.state.pendingValues = [];
  });

  it('ชุดว่างเริ่มที่ 0', async () => {
    const { values } = await run(null);
    const tsq = values.find((v) => v.testSetId === 1 && v.questionId === 501);
    expect(tsq?.orderIndex).toBe(0);
  });

  it('ต่อจาก max เดิม ไม่ใช่จำนวนแถว', async () => {
    // ชุดมี order_index 0,1,5 → max = 5, count = 3
    // count จะให้ 3 ซึ่งชนกับแถวเดิม
    const { values } = await run(5);
    const tsq = values.find((v) => v.testSetId === 1 && v.questionId === 501);
    expect(tsq?.orderIndex).toBe(6);
  });
});