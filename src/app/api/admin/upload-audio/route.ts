import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import { requireAdmin } from '@/lib/admin-auth';

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const startsWith = (b: Uint8Array, offset: number, sig: number[]) =>
  b.length >= offset + sig.length && sig.every((byte, i) => b[offset + i] === byte);

const ascii = (b: Uint8Array, offset: number, text: string) =>
  startsWith(b, offset, [...text].map((c) => c.charCodeAt(0)));

/**
 * อ่านชนิดไฟล์จาก magic bytes ของเนื้อไฟล์จริง
 *
 * `file.type` มาจาก Content-Type ที่ browser ส่ง ปลอมได้ง่ายมาก การเช็ค
 * เนื้อไฟล์จริงเป็นชั้นป้องกันที่ต้องมี ครอบคลุมเฉพาะชนิดที่อยู่ใน
 * ALLOWED_AUDIO_TYPES เท่านั้น — ไม่เพิ่มชนิดใหม่
 */
export function detectAudioKind(b: Uint8Array): string | null {
  if (b.length < 4) return null;

  // MP3 (ID3 tag หรือ MPEG frame sync FF Ex)
  if (ascii(b, 0, 'ID3')) return 'mp3-id3';
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) {
    // ADTS/AAC ใช้ sync เหมือนกันแต่บิต layer เป็น 00
    return (b[1] & 0x06) === 0x00 ? 'aac' : 'mp3';
  }
  // WAV = RIFF....WAVE
  if (ascii(b, 0, 'RIFF') && ascii(b, 8, 'WAVE')) return 'wav';
  // Ogg
  if (ascii(b, 0, 'OggS')) return 'ogg';
  // WebM / Matroska (EBML header)
  if (startsWith(b, 0, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm';
  // MP4 / M4A (ftyp box)
  if (ascii(b, 4, 'ftyp')) return 'mp4';

  return null;
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // file.type ปลอมได้ — ยืนยันกับเนื้อไฟล์จริงอีกชั้น
    const kind = detectAudioKind(new Uint8Array(buffer));
    if (!kind) {
      return NextResponse.json(
        { success: false, error: 'File content is not a recognised audio format' },
        { status: 400 }
      );
    }

    const id = Date.now().toString();
    const originalName = file.name || 'audio.mp3';
    const sanitizedName = originalName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-]/g, '');
    const fileName = `${id}-${sanitizedName}`;

    const r2Url = await uploadToR2(buffer, fileName, file.type);

    return NextResponse.json({ success: true, url: r2Url });
  } catch (error) {
    console.error('[Upload-Audio] error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
