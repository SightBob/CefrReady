import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    // In CefrReady, we assume only admins or authorized users can upload.
    // For now, checking if session exists is a minimal guard.
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use original file name properly sanitized, or you can generate a UUID
    const id = Date.now().toString();
    const originalName = file.name || 'audio.mp3';
    // Clean up filename: replace spaces with hyphens, remove non-alphanumeric (except dots/hyphens)
    const sanitizedName = originalName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-]/g, '');
    const fileName = `${id}-${sanitizedName}`;

    // Upload directly to Cloudflare R2!
    const r2Url = await uploadToR2(buffer, fileName, file.type);

    return NextResponse.json({ success: true, url: r2Url });
  } catch (error) {
    console.error('[Upload-Audio] error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
