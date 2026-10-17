/**
 * Query-count regression tests for the import route.
 *
 * The bug: the test-set assignment loop issued one `testSets` lookup and one
 * `testSetQuestions` lookup per CSV row, so a 30-row import cost 60+ queries.
 * These tests pin the query count so it cannot scale with row count again.
 *
 * The db mock counts one query per awaited (thenable) chain, which is exactly
 * how many round trips drizzle would make.
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
    insertedQuestionIds: [] as number[],
    assignments: [] as Record<string, unknown>[],
    pendingBatch: [] as Record<string, unknown>[],
    existingMaxOrder: null as number | null,
  };

  function resolve(ops: string[], tbl: string | null): unknown {
    if (ops[0] === 'insert' && tbl === 'questions') {
      return ops.includes('returning') ? state.insertedQuestionIds.map((id) => ({ id })) : [];
    }
    if (ops[0] === 'insert' && tbl === 'testSetQuestions') {
      state.assignments.push(...state.pendingBatch);
      return [];
    }
    if (tbl === 'testSets') return [{ id: 1 }];
    if (tbl === 'testSetQuestions') {
      return ops.includes('groupBy') ? [{ testSetId: 1, maxOrder: state.existingMaxOrder }] : [];
    }
    if (tbl === 'questions') return [];
    return [];
  }

  function mk(ops: string[], tbl: string | null): unknown {
    const sig = `${tbl ?? '?'}#${ops.join('.')}`;
    const handler = {
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
            state.pendingBatch = ((args[0] ?? []) as Record<string, unknown>[]);
          }
          return mk([...ops, String(prop)], nextTbl);
        };
      },
    };
    return new Proxy({}, handler);
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
}));
vi.mock('@/db', () => ({ get db() { return h.db; } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => ({ error: null, session: null }) }));
vi.mock('@/lib/full-test/question-pool', () => ({ revalidateQuestionPool: () => {} }));

import { POST } from './route';

const CSV_HEADER =
  'testTypeId,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,cefrLevel,difficulty,testSetId';

function makeCsv(rowCount: number): string {
  const lines = [CSV_HEADER];
  for (let i = 0; i < rowCount; i++) {
    lines.push(`focus-form,Question number ${i} is unique text?,alpha,beta,gamma,delta,A,Because ${i},B1,easy,1`);
  }
  return lines.join('\n');
}

async function runImport(rowCount: number, existingMaxOrder: number | null = null) {
  h.state.existingMaxOrder = existingMaxOrder;
  h.state.queries = [];
  h.state.assignments = [];
  h.state.insertedQuestionIds = Array.from({ length: rowCount }, (_, i) => i + 1);
  const req = { json: async () => ({ csvData: makeCsv(rowCount), dryRun: false }) };
  const res = await POST(req as never);
  return { body: await res.json(), queries: [...h.state.queries], assignments: [...h.state.assignments] };
}

describe('import — จำนวน query ไม่โตตามจำนวนแถว', () => {
  beforeEach(() => {
    h.state.queries = [];
    h.state.assignments = [];
  });

  it('3 แถวกับ 30 แถว ใช้ query เท่ากัน', async () => {
    const small = await runImport(3);
    const large = await runImport(30);

    expect(small.body.success).toBe(true);
    expect(large.body.success).toBe(true);
    expect(small.queries.length).toBeGreaterThan(0);
    expect(large.queries).toEqual(small.queries);
  });

  it('30 แถวเข้าชุดเดียวกัน ได้ orderIndex 0..29 ครบ ไม่ซ้ำ', async () => {
    const { body, assignments } = await runImport(30);
    expect(body.success).toBe(true);
    expect(body.assignedCount).toBe(30);
    const orders = assignments.map((a) => a.orderIndex as number).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 30 }, (_, i) => i));
  });

  it('import รอบสองต่อจาก max เดิมของชุด', async () => {
    const { body, assignments } = await runImport(5, 100);
    expect(body.success).toBe(true);
    expect(assignments.map((a) => a.orderIndex)).toEqual([101, 102, 103, 104, 105]);
  });

  it('batch insert ถูกแบ่งก้อนไม่เกิน 200 แถว', async () => {
    const { body, queries } = await runImport(250);
    expect(body.success).toBe(true);
    expect(body.assignedCount).toBe(250);
    const tsqInserts = queries.filter((q) => q.startsWith('testSetQuestions#insert'));
    expect(tsqInserts).toHaveLength(2);
  });
});