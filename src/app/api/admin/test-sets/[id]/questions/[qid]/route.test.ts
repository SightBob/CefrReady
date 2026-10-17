/**
 * /api/admin/test-sets/[id]/questions/[qid]
 *
 * มีแค่ DELETE — PATCH ถูกลบออกแล้วเพราะไม่มี caller ไหนใช้
 * (grep ทั้งโปรเจกต์: ทั้ง 3 จุดที่ยิง path นี้ใช้ DELETE ทั้งหมด)
 * และมันรับ orderIndex ดิบจาก request โดยไม่ validate
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

  const state = { deletes: 0, deletedFrom: [] as (string | null)[] };

  function resolve(ops: string[], tbl: string | null): unknown {
    if (ops[0] === 'delete') state.deletes++;
    return undefined;
  }

  function mk(ops: string[], tbl: string | null): unknown {
    const sig = `${tbl ?? '?'}#${ops.join('.')}`;
    return new Proxy({}, {
      get(_t: unknown, prop: string | symbol) {
        if (prop === 'then') {
          return (res: (v: unknown) => void) => {
            if (ops[0] === 'delete') state.deletedFrom.push(tbl);
            res(resolve(ops, tbl));
          };
        }
        if (prop === 'toString') return () => sig;
        if (typeof prop === 'symbol') return undefined;
        return (...args: unknown[]) => {
          let nextTbl = tbl;
          if (prop === 'from' || prop === 'delete') {
            nextTbl = (args[0] as { __name?: string } | undefined)?.__name ?? null;
          }
          void sig;
          return mk([...ops, String(prop)], nextTbl);
        };
      },
    });
  }

  const db: unknown = new Proxy({}, {
    get(_t, prop: string | symbol) {
      if (prop === 'then') return undefined;
      return (...args: unknown[]) =>
        mk([String(prop)], String(prop) === 'delete' ? (args[0] as { __name?: string } | undefined)?.__name ?? null : null);
    },
  });

  return { table, state, db };
});

vi.mock('@/db/schema', () => ({
  testSetQuestions: h.table('testSetQuestions'),
  questions: h.table('questions'),
  testSets: h.table('testSets'),
}));
vi.mock('@/db', () => ({ get db() { return h.db; } }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => ({ error: null, session: null }) }));

import * as route from './route';

function callDelete(id: string, qid: string) {
  return route.DELETE({} as never, { params: Promise.resolve({ id, qid }) });
}

describe('DELETE /api/admin/test-sets/[id]/questions/[qid]', () => {
  beforeEach(() => {
    h.state.deletes = 0;
    h.state.deletedFrom = [];
  });

  it('ลบ assignment ออกจากชุดได้', async () => {
    const res = await callDelete('1', '42');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(h.state.deletes).toBe(1);
    expect(h.state.deletedFrom).toEqual(['testSetQuestions']);
  });

  it('ตัวเลขที่ parse ไม่ได้ต้องได้ 400 และไม่แตะ DB', async () => {
    const res = await callDelete('abc', '42');
    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
    expect(h.state.deletes).toBe(0);
  });

  it('qid ที่ parse ไม่ได้ต้องได้ 400', async () => {
    const res = await callDelete('1', 'xyz');
    expect(res.status).toBe(400);
    expect(h.state.deletes).toBe(0);
  });

  it('ส่งออกเฉพาะ DELETE — ไม่มี PATCH handler แล้ว', () => {
    expect('PATCH' in route).toBe(false);
    expect(Object.keys(route).filter((k) => k !== 'dynamic')).toEqual(['DELETE']);
  });
});