/**
 * Regression tests for POST /api/admin/test-sets/[id]/questions.
 *
 * The bug: the handler inserted one row per questionId inside a loop, so
 * adding N questions cost N writes. It now uses a single batched INSERT.
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
    /** question ids ที่ถือว่าชน unique constraint (จำลอง onConflictDoNothing) */
    conflicting: [] as number[],
  };

  function resolve(ops: string[], tbl: string | null): unknown {
    if (ops[0] === 'insert' && tbl === 'testSetQuestions') {
      return state.pendingValues.filter((v) => !state.conflicting.includes(v.questionId as number));
    }
    if (tbl === 'testSets') return [{ id: 1 }];
    if (tbl === 'testSetQuestions') return [{ maxOrder: state.maxOrder }];
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
}));
vi.mock('@/db', () => ({ get db() { return h.db; } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => ({ error: null, session: null }) }));

import { POST } from './route';

function makeReq(questionIds: number[]) {
  return {
    json: async () => ({ questionIds }),
    params: Promise.resolve({ id: '1' }),
  };
}

async function run(questionIds: number[], maxOrder: number | null = null) {
  h.state.queries = [];
  h.state.pendingValues = [];
  h.state.maxOrder = maxOrder;
  const res = await POST(makeReq(questionIds) as never, { params: Promise.resolve({ id: '1' }) });
  return { body: await res.json(), queries: [...h.state.queries], values: [...h.state.pendingValues] };
}

describe('POST /api/admin/test-sets/[id]/questions', () => {
  beforeEach(() => {
    h.state.queries = [];
    h.state.pendingValues = [];
    h.state.conflicting = [];
  });

  it('จำนวน query ไม่โตตามจำนวนข้อ', async () => {
    const small = await run([1, 2]);
    const large = await run([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(small.queries).toEqual(large.queries);
    expect(large.queries.filter((q) => q.startsWith('testSetQuestions#insert'))).toHaveLength(1);
  });

  it('insert ครั้งเดียวด้วย orderIndex ต่อเนื่อง', async () => {
    const { values } = await run([7, 8, 9], 41);
    expect(values.map((v) => v.orderIndex)).toEqual([42, 43, 44]);
    expect(values.every((v) => v.testSetId === 1)).toBe(true);
  });

  it('ชุดว่างเริ่มที่ orderIndex 0', async () => {
    const { values } = await run([5, 6]);
    expect(values.map((v) => v.orderIndex)).toEqual([0, 1]);
  });

  it('ข้อที่ชน unique ถูกนับเป็น skipped', async () => {
    h.state.conflicting = [2];
    const { body } = await run([1, 2, 3]);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ inserted: 2, skipped: 1 });
  });
});