/**
 * API ผู้ทดสอบ AI Tutor — 401/403 + bulk grant/revoke
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rateLimit: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rateLimit }));
vi.mock('@/db', () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    insert: mocks.insert,
    transaction: mocks.transaction,
  },
}));

import { GET, POST } from './route';

const TESTER_ROWS = [
  { id: 'u1', email: 'learner@example.com', name: 'ผู้เรียน', access: true, updatedAt: new Date() },
  { id: 'u2', email: 'second@example.com', name: null, access: true, updatedAt: new Date() },
];

/** กำหนดผลลัพธ์ของ select (ผู้ใช้ที่ค้นเจอ) */
let selectedUsers: Array<{ id: string; email: string; name: string | null; access: boolean; updatedAt: Date }> = TESTER_ROWS;

/** จำนวน "การเปลี่ยนแปลง" ที่ commit สำเร็จ (mock transaction: ถ้า callback โยน error → ไม่นับ) */
let committedUpdates = 0;

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
}
function forbidden() {
  return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
}

/** chain ที่รองรับ select().from().where().orderBy().limit().offset() และ await ได้ */
function chain(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'limit', 'offset']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  selectedUsers = TESTER_ROWS;
  committedUpdates = 0;
  mocks.requireAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.rateLimit.mockResolvedValue(null);
  mocks.select.mockImplementation((selection: Record<string, unknown>) => (
    'total' in selection ? chain([{ total: TESTER_ROWS.length }]) : chain(selectedUsers)
  ));
  const updateChain: Record<string, unknown> = {};
  updateChain.set = vi.fn(() => updateChain);
  updateChain.where = vi.fn(() => updateChain);
  mocks.update.mockReturnValue(updateChain);
  const insertChain: Record<string, unknown> = {};
  insertChain.values = vi.fn((values: Record<string, unknown>) => {
    // เก็บค่าที่จะ insert ไว้ให้เทสอ่าน (mock ไม่ต่อ DB)
    (insertChain as { __values?: Record<string, unknown> }).__values = values;
    return insertChain;
  });
  mocks.insert.mockReturnValue(insertChain);

  // transaction จำลองพฤติกรรมของ DB: ถ้า callback โยน error → ไม่มีอะไร commit
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const stagedUpdates: unknown[] = [];
    const tx = {
      update: (...args: unknown[]) => {
        stagedUpdates.push(args);
        return mocks.update(...args);
      },
      insert: (...args: unknown[]) => {
        stagedUpdates.push(args);
        return mocks.insert(...args);
      },
    };
    const result = await fn(tx);
    committedUpdates += stagedUpdates.length;
    return result;
  });
});

function post(body: unknown) {
  return POST(new Request('http://localhost/api/admin/ai-tutor/testers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('ผู้ทดสอบ — สิทธิ์', () => {
  it('ไม่ล็อกอิน → 401 (ทั้ง GET และ POST)', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: unauthorized(), session: null });
    const getRes = await GET(new Request('http://localhost/api/admin/ai-tutor/testers'));
    const postRes = await post({ action: 'grant', emails: ['a@b.com'] });
    expect(getRes.status).toBe(401);
    expect(postRes.status).toBe(401);
  });

  it('ไม่ใช่แอดมิน → 403 (ทั้ง GET และ POST)', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: forbidden(), session: null });
    const getRes = await GET(new Request('http://localhost/api/admin/ai-tutor/testers'));
    const postRes = await post({ action: 'grant', emails: ['a@b.com'] });
    expect(getRes.status).toBe(403);
    expect(postRes.status).toBe(403);
  });
});

describe('GET /api/admin/ai-tutor/testers', () => {
  it('คืนรายชื่อผู้มีสิทธิ์ + จำนวนรวม + เมตาแบ่งหน้า', async () => {
    const res = await GET(new Request('http://localhost/api/admin/ai-tutor/testers?q=learn&page=1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
    expect(body.meta.perPage).toBe(20);
    // ไม่ส่งข้อมูลเกินจำเป็น
    expect(body.data[0]).not.toHaveProperty('aiTutorAccess');
  });
});

describe('POST /api/admin/ai-tutor/testers — bulk grant/revoke', () => {
  it('grant ผู้ที่ยังไม่มีสิทธิ์ → สำเร็จ', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'grant', emails: ['learner@example.com'] });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.granted).toEqual(['learner@example.com']);
    expect(mocks.update).toHaveBeenCalled();
  });

  it('grant ผู้ที่มีสิทธิ์อยู่แล้ว → แยกกลุ่ม already', async () => {
    const res = await post({ action: 'grant', emails: ['learner@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual([]);
    expect(body.data.already).toEqual(['learner@example.com']);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('revoke ผู้ที่มีสิทธิ์ → สำเร็จ', async () => {
    const res = await post({ action: 'revoke', emails: ['learner@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual(['learner@example.com']);
    expect(mocks.update).toHaveBeenCalled();
  });

  it('ไม่พบผู้ใช้ → แยกกลุ่ม notFound', async () => {
    selectedUsers = [];
    const res = await post({ action: 'grant', emails: ['ghost@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual([]);
    expect(body.data.notFound).toEqual(['ghost@example.com']);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('อีเมลซ้ำในคำขอเดียว → ทำครั้งเดียว (ไม่ซ้ำ)', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'grant', emails: ['learner@example.com', 'LEARNER@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual(['learner@example.com']);
  });

  it('เกิน 200 รายการ → 400', async () => {
    const emails = Array.from({ length: 201 }, (_, index) => `u${index}@example.com`);
    const res = await post({ action: 'grant', emails });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('200');
  });

  it('อีเมลรูปแบบผิด → แยกกลุ่ม invalid (ไม่ทั้งหมดผิด)', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'grant', emails: ['not-an-email', 'learner@example.com'] });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.invalid).toEqual(['not-an-email']);
    expect(body.data.granted).toEqual(['learner@example.com']);
  });

  it('revoke ผู้ที่ยังไม่มีสิทธิ์ → แยกกลุ่ม already', async () => {
    selectedUsers = [{ id: 'u9', email: 'none@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'revoke', emails: ['none@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual([]);
    expect(body.data.already).toEqual(['none@example.com']);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('เขียน audit ทุกครั้งที่มีการเปลี่ยน', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    await post({ action: 'grant', emails: ['learner@example.com'] });
    expect(mocks.insert).toHaveBeenCalled();
  });
});

describe('POST /api/admin/ai-tutor/testers — ความปลอดภัยของ audit + transaction', () => {
  /** ค่าที่ insert ลง audit (เก็บจาก mock) */
  function auditValues(): Record<string, unknown> {
    const chain = mocks.insert.mock.results[0]?.value as { __values?: Record<string, unknown> } | undefined;
    return chain?.__values ?? {};
  }

  it('bulk 200 อีเมลยาว → target สั้นและไม่เกิน 200 ตัวอักษร (ไม่ทำให้ insert ล้ม)', async () => {
    const emails = Array.from({ length: 200 }, (_, i) => `learner-with-a-very-long-name-${i}@subdomain.example.com`);
    selectedUsers = emails.map((email, i) => ({
      id: `uid-${i}`, email, name: null, access: false, updatedAt: new Date(),
    }));

    const res = await post({ action: 'grant', emails });
    expect(res.status).toBe(200);

    const values = auditValues();
    expect(String(values.target).length).toBeLessThanOrEqual(200);
    // สรุปสั้น ๆ แทนรายชื่อ
    expect(String(values.target)).toMatch(/grant:\s*200\s*users/);
  });

  it('audit ล้ม → สิทธิ์ไม่เปลี่ยน (ต้อง rollback ทั้งชุด)', async () => {
    selectedUsers = [
      { id: 'u3', email: 'a@example.com', name: null, access: false, updatedAt: new Date() },
      { id: 'u4', email: 'b@example.com', name: null, access: false, updatedAt: new Date() },
    ];
    mocks.insert.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.values = vi.fn(() => chain);
      chain.then = (_resolve: unknown, reject: (reason: unknown) => unknown) => {
        reject(new Error('22001 value too long for type character varying(200)'));
      };
      return chain;
    });

    const res = await post({ action: 'grant', emails: ['a@example.com', 'b@example.com'] });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    // ไม่เผยรายละเอียดของ error ภายในให้ผู้ใช้
    expect(JSON.stringify(body)).not.toContain('22001');

    // ต้องไม่มีการอัปเดตสิทธิ์ที่ "คอมมิต" เลย (ถูก rollback ทั้งชุด)
    expect(committedUpdates, 'สิทธิ์ต้องถูก rollback เมื่อ audit ล้ม').toBe(0);
  });

  it('log ตอน audit ล้มไม่มีอีเมลผู้เรียน (params ของ query ต้องไม่หลุดลง log)', async () => {
    const logged: string[] = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      logged.push(args.map((value) => String(value)).join(' '));
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logged.push(args.map((value) => String(value)).join(' '));
    });

    selectedUsers = [{ id: 'u3', email: 'leak-check@example.com', name: null, access: false, updatedAt: new Date() }];
    mocks.insert.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.values = vi.fn(() => chain);
      chain.then = (_resolve: unknown, reject: (reason: unknown) => unknown) => {
        // รูปแบบของ DrizzleQueryError: ข้อความมี params ของ query ติดมา
        reject(Object.assign(
          new Error('Failed query: insert into "ai_tutor_admin_audit" ("actor_user_id","action") values ($1, $2)\nparams: admin-1, leak-check@example.com'),
          { name: 'DrizzleQueryError', code: '23505' },
        ));
      };
      return chain;
    });

    const res = await post({ action: 'grant', emails: ['leak-check@example.com'] });
    expect(res.status).toBe(500);

    const output = logged.join('\n');
    expect(output).not.toBe('');
    expect(output).not.toContain('leak-check@example.com');
    // log ยังบอกได้ว่า error เป็นชนิดไหน + code
    expect(output).toContain('DrizzleQueryError');
    expect(output).toContain('23505');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('audit ไม่มีสตริงอีเมลผู้เรียนเลย (เก็บ user id แทน)', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    await post({ action: 'grant', emails: ['learner@example.com'] });

    const values = auditValues();
    const serialized = JSON.stringify(values);
    expect(serialized).not.toContain('learner@example.com');
    expect(serialized).not.toContain('@example.com');
    // ต้องเก็บ user id ไว้ให้ตามย้อนหลังได้
    expect(serialized).toContain('u3');
  });
});
