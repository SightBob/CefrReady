/**
 * Regression test: PUT /api/admin/test-sets/[id]/questions/reorder
 *
 * บั๊ก: loop อัปเดต orderIndex ทีละแถวเป็น 0,1,2,... เมื่อมี unique index
 * (test_set_id, order_index) แถวแรกจะชนกับแถวที่ยังถือค่าเดิมอยู่
 * → Postgres ตรวจ unique ต่อ statement ไม่ใช่ต่อ transaction
 * ต้องเลื่อนทั้งชุดออกจากช่วง 0..N-1 ก่อน แล้วค่อยเขียนค่าจริง
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
    /** ทุก update ที่วิ่งผ่าน: set เป็น object หรือ SQL expression */
    updates: [] as { tbl: string | null; set: unknown }[],
    setIds: [] as number[],
    existingAssignmentIds: [] as number[],
    /** จำนวน transaction ที่เปิด และจำนวน update ที่หลุดออกมานอก transaction */
    transactions: 0,
    updatesOutsideTransaction: 0,
    depth: 0,
  };

  function resolve(ops: string[], tbl: string | null): unknown {
    if (ops[0] === 'update') {
      return [];
    }
    if (ops[0] === 'select' && tbl === 'testSets') return [{ id: 1 }];
    if (ops[0] === 'select' && tbl === 'testSetQuestions') {
      return state.existingAssignmentIds.map((id) => ({ id }));
    }
    return [];
  }

  function mk(ops: string[], tbl: string | null, setValues?: Record<string, unknown> | string): unknown {
    const sig = `${tbl ?? '?'}#${ops.join('.')}`;
    return new Proxy({}, {
      get(_t: unknown, prop: string | symbol) {
        if (prop === 'then') {
          return (res: (v: unknown) => void) => {
            if (ops[0] === 'update') {
              state.updates.push({ tbl, set: setValues as Record<string, unknown> });
              if (state.depth === 0) state.updatesOutsideTransaction++;
            }
            res(resolve(ops, tbl));
          };
        }
        if (prop === 'toString') return () => sig;
        if (typeof prop === 'symbol') return undefined;
        return (...args: unknown[]) => {
          let nextTbl = tbl;
          let nextSet = setValues;
          if (prop === 'from' || prop === 'insert' || prop === 'update') {
            nextTbl = (args[0] as { __name?: string } | undefined)?.__name ?? null;
          }
          if (prop === 'set') nextSet = args[0] as Record<string, unknown>;
          return mk([...ops, String(prop)], nextTbl, nextSet);
        };
      },
    });
  }

  const db: unknown = new Proxy({}, {
    get(_t, prop: string | symbol) {
      if (prop === 'then') return undefined;
      if (prop === 'transaction') {
        return async (fn: (t: unknown) => Promise<unknown>) => {
          state.transactions++;
          state.depth++;
          try {
            return await fn(db);
          } finally {
            state.depth--;
          }
        };
      }
      return (...args: unknown[]) =>
        mk([String(prop)], ['from', 'insert', 'update'].includes(String(prop))
          ? (args[0] as { __name?: string } | undefined)?.__name ?? null
          : null);
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

import { PUT } from './route';

/** orderIndex ที่ถูกเขียน — undefined เมื่อค่าเป็น SQL expression ไม่ใช่ตัวเลข */
function orderIndexOf(set: unknown): number | undefined {
  if (typeof set !== 'object' || set === null) return undefined;
  const v = (set as Record<string, unknown>).orderIndex;
  return typeof v === 'number' ? v : undefined;
}

async function run(assignmentIds: number[], existingIds: number[]) {
  h.state.updates = [];
  h.state.existingAssignmentIds = existingIds;
  const req = {
    json: async () => ({ assignmentIds }),
    params: Promise.resolve({ id: '1' }),
  };
  const res = await PUT(req as never, { params: Promise.resolve({ id: '1' }) });
  return { body: await res.json(), updates: [...h.state.updates] };
}

describe('PUT /api/admin/test-sets/[id]/questions/reorder', () => {
  beforeEach(() => {
    h.state.updates = [];
  });

  it('ต้องเลื่อนทั้งชุดออกจากช่วง 0..N-1 ก่อนเขียนค่าจริง', async () => {
    const { updates } = await run([30, 10, 20], [10, 20, 30]);
    expect(updates.length).toBeGreaterThan(1);

    // การอัปเดตแรกต้องเป็นการเลื่อนทั้งชุด (ไม่ใช่การเขียน orderIndex เป็นตัวเลข)
    expect(orderIndexOf(updates[0].set)).toBeUndefined();

    // หลังจากนั้นค่อยเขียน 0,1,2... ตามลำดับใหม่
    const finals = updates.slice(1).map((u) => orderIndexOf(u.set));
    expect(finals).toEqual([0, 1, 2]);
  });

  it('ค่าเลื่อนที่ใช้ต้องเป็น SQL expression ติดลบ ไม่ใช่ตัวเลขในช่วง 0..N-1', async () => {
    const { updates } = await run([10, 20], [10, 20]);
    expect(typeof updates[0].set).toBe('object');
  });

  it('order ไม่ครบทุกแถวของชุดถูกปฏิเสธ', async () => {
    const { body } = await run([10], [10, 20]);
    expect(body.success).toBe(false);
    expect(h.state.updates).toHaveLength(0);
  });

  it('ทั้งสองขั้นอยู่ใน transaction เดียวกัน', async () => {
    h.state.transactions = 0;
    h.state.updatesOutsideTransaction = 0;
    await run([10, 20, 30], [10, 20, 30]);
    // เลื่อนเป็น -id และเขียนค่าจริง ต้องอยู่ใน transaction เดียวกัน
    // ถ้าหลุดออกมาข้างนอก ขั้นที่สองจะชน unique index ของขั้นที่หนึ่ง
    expect(h.state.transactions).toBe(1);
    expect(h.state.updatesOutsideTransaction).toBe(0);
  });
});