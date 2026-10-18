/**
 * GET /api/admin/upload-audio — ตรวจ magic bytes ของไฟล์จริง
 *
 * เดิมเช็คแค่ file.type ที่ browser ส่งมา ซึ่งปลอมได้ง่ายมาก (แก้ Content-Type
 * ใน DevTools หรือส่ง request เอง) ไฟล์ HTML/SVG ที่ตั้ง type เป็น audio/mpeg
 * จะผ่านและถูกเก็บบน R2
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ withAdmin: vi.fn(), upload: vi.fn() }));
vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/lib/r2', () => ({ uploadToR2: mocks.upload }));

vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: async () => null }));
import { POST, detectAudioKind } from './route';

/** ไฟล์เสียงจริงแบบเล็กที่สุดที่แต่ละชนิดยอมรับได้ */
const REAL: Record<string, { bytes: number[]; type: string }> = {
  mp3: { bytes: [0xff, 0xfb, 0x90, 0x00, 0x00, 0x00], type: 'audio/mpeg' },
  'mp3-id3': { bytes: [0x49, 0x44, 0x33, 0x03, 0x00, 0x00], type: 'audio/mpeg' },
  wav: { bytes: [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45], type: 'audio/wav' },
  ogg: { bytes: [0x4f, 0x67, 0x67, 0x53, 0x00, 0x02], type: 'audio/ogg' },
  webm: { bytes: [0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00], type: 'audio/webm' },
  mp4: { bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41], type: 'audio/mp4' },
  aac: { bytes: [0xff, 0xf1, 0x50, 0x80, 0x00, 0x1f, 0xfc], type: 'audio/aac' },
};

/** เนื้อไฟล์ที่ไม่ใช่เสียงแต่ปลอม type เป็น audio ได้ */
const FAKE: Record<string, number[]> = {
  html: [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74],
  svg: [0x3c, 0x73, 0x76, 0x67, 0x20, 0x78, 0x6d, 0x6c],
  js: [0x63, 0x6f, 0x6e, 0x73, 0x74, 0x20, 0x61, 0x6c, 0x65, 0x72, 0x74],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  zip: [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00],
  empty: [],
};

function reqWith(file: File) {
  const formData = new FormData();
  formData.set('file', file);
  return { formData: async () => formData } as never;
}

function fileOf(bytes: number[], type: string, name = 'audio.mp3') {
  return new File([new Uint8Array(bytes)], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.upload.mockResolvedValue('https://cdn.example/audio.mp3');
});

describe('detectAudioKind — อ่าน magic bytes จากเนื้อไฟล์จริง', () => {
  it.each(Object.entries(REAL))('ชนิด %s ตรวจเจอ', (kind, fixture) => {
    expect(detectAudioKind(new Uint8Array(fixture.bytes))).toBe(kind);
  });

  it.each(Object.entries(FAKE))('ไฟล์ %s ไม่ผ่าน', (_label, bytes) => {
    expect(detectAudioKind(new Uint8Array(bytes))).toBeNull();
  });

  it('ไฟล์สั้นเกินไปให้ null ไม่ throw', () => {
    expect(detectAudioKind(new Uint8Array([0xff]))).toBeNull();
    expect(detectAudioKind(new Uint8Array([]))).toBeNull();
  });
});

describe('POST /api/admin/upload-audio', () => {
  it('ปฏิเสธไฟล์ที่ปลอม type เป็นเสียง แต่เนื้อจริงเป็น HTML', async () => {
    const res = await POST(reqWith(fileOf(FAKE.html, 'audio/mpeg')));
    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it.each(['svg', 'js', 'png', 'zip'])('ปฏิเสธเนื้อ %s แม้ประกาศ type ถูกต้องตามรายการ', async (label) => {
    const fakeType = Object.values(REAL)[0].type;
    const res = await POST(reqWith(fileOf(FAKE[label], fakeType)));
    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('ไฟล์เสียงจริงยังผ่านเหมือนเดิม', async () => {
    const res = await POST(reqWith(fileOf(REAL.mp3.bytes, 'audio/mpeg')));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, url: 'https://cdn.example/audio.mp3' });
    expect(mocks.upload).toHaveBeenCalledOnce();
  });

  it('wav จริงผ่านและส่งไฟล์ขึ้น R2', async () => {
    const res = await POST(reqWith(fileOf(REAL.wav.bytes, 'audio/wav')));
    expect(res.status).toBe(200);
    expect(mocks.upload).toHaveBeenCalledOnce();
  });

  it('ยังปฏิเสธ type ที่ไม่อยู่ในรายการตามเดิม', async () => {
    const res = await POST(reqWith(fileOf(REAL.mp3.bytes, 'application/pdf', 'a.pdf')));
    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('ยังคงจำกัดขนาด 10MB ตามเดิม', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(REAL.mp3.bytes, 0);
    const res = await POST(reqWith(fileOf([...big], 'audio/mpeg')));
    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('ไม่มีไฟล์ได้ 400', async () => {
    const formData = new FormData();
    const res = await POST({ formData: async () => formData } as never);
    expect(res.status).toBe(400);
  });
});

describe('admin write-heavy route (withAdmin)', () => {
  it('ขอโควตา 5 ครั้ง / 5 นาที', async () => {
    await POST(reqWith(fileOf(REAL.mp3.bytes, 'audio/mpeg')));
    expect(mocks.withAdmin).toHaveBeenCalledWith({
      keySuffix: 'admin:upload-audio',
      maxRequests: 5,
      windowMs: 300_000,
    });
  });

  it('เกินโควตาได้ 429 พร้อม Retry-After และไม่ขึ้น R2', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
        status: 429,
        headers: { 'Retry-After': '90' },
      }),
      session: null,
    });
    const res = await POST(reqWith(fileOf(REAL.mp3.bytes, 'audio/mpeg')));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('90');
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('ยังได้ 403 เมื่อไม่ใช่แอดมินเหมือนเดิม', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response('Forbidden - Admin access required', { status: 403 }),
      session: null,
    });
    expect((await POST(reqWith(fileOf(REAL.mp3.bytes, 'audio/mpeg')))).status).toBe(403);
  });
});