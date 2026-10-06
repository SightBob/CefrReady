import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock requireAdmin — ผ่านทั้งหมด (สิทธิ์ไม่ใช่สิ่งที่เราทดสอบในไฟล์นี้)
vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: vi.fn(async () => ({ error: null, session: { user: { id: 'admin' } } })),
}));

// Mock lib — ทดสอบว่า route เรียก lib ถูกต้องและจัดการ error
vi.mock('@/lib/test-section-maintenance', () => ({
  getSectionMaintenanceMap: vi.fn(),
  setSectionMaintenance: vi.fn(),
  isTestSectionId: (v: string) =>
    ['focus-form', 'focus-meaning', 'form-meaning', 'listening', 'full'].includes(v),
}));

import { GET, POST } from './route';
import { getSectionMaintenanceMap, setSectionMaintenance } from '@/lib/test-section-maintenance';
import { NextRequest } from 'next/server';

const mockedGet = vi.mocked(getSectionMaintenanceMap);
const mockedSet = vi.mocked(setSectionMaintenance);

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/test-sections-maintenance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/test-sections-maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('คืนแผนที่สถานะต่อพาร์ท', async () => {
    mockedGet.mockResolvedValue({
      'focus-form': true,
      'focus-meaning': false,
      'form-meaning': false,
      listening: false,
      full: false,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sections['focus-form']).toBe(true);
  });

  it('lib error → 500', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/admin/test-sections-maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('สลับพาร์ทเดียวแล้วคืนแผนที่ล่าสุด', async () => {
    mockedSet.mockResolvedValue({
      'focus-form': true,
      'focus-meaning': false,
      'form-meaning': false,
      listening: false,
      full: false,
    });
    const res = await POST(postRequest({ sectionId: 'focus-form', enabled: true }));
    expect(res.status).toBe(200);
    expect(mockedSet).toHaveBeenCalledWith('focus-form', true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sections['focus-form']).toBe(true);
  });

  it('sectionId ไม่รู้จัก → 400 และไม่เขียน Redis', async () => {
    const res = await POST(postRequest({ sectionId: 'hacker', enabled: true }));
    expect(res.status).toBe(400);
    expect(mockedSet).not.toHaveBeenCalled();
  });

  it('body ไม่ครบ → 400', async () => {
    const res = await POST(postRequest({ sectionId: 'full' }));
    expect(res.status).toBe(400);
  });

  it('lib error → 500', async () => {
    mockedSet.mockRejectedValue(new Error('redis down'));
    const res = await POST(postRequest({ sectionId: 'full', enabled: true }));
    expect(res.status).toBe(500);
  });
});
