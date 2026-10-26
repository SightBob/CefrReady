import { NextRequest, NextResponse } from 'next/server';
import { checkIpThrottle } from '@/lib/api-security';
import { mapWiktionaryEntries, type DictionaryMeaning } from '@/lib/dictionary-fallback';

// GET /api/dictionary?word=xxx
// ดึงความหมายจาก Free Dictionary API (ฟรี 100%)
export async function GET(req: NextRequest) {
  // SECURITY: rate-limit per IP before any upstream call. Each request fans out
  // to dictionaryapi.dev + translate.googleapis.com, so an unauthenticated
  // flood can exhaust Vercel function seconds, damage our IP reputation with
  // Google Translate, and be used as an arbitrary-URL lookup oracle.
  // 60/นาที/IP: endpoint นี้ถูกยิงทุกครั้งที่ผู้เรียนคลิกคำในบทความและไม่มีแคช
  // ฝั่ง client ต่อคำ — เดิม 15/นาทีทำให้คนอ่าน passage คลิกคำไม่กี่คำก็โดนบล็อก
  // (ผลลัพธ์แคชที่ Next 24 ชม. อยู่แล้ว จึงไม่กระเทือน upstream)
  const ipThrottleError = await checkIpThrottle(req, {
    windowMs: 60_000,
    maxRequests: 60,
    keySuffix: 'dictionary',
  });
  if (ipThrottleError) return ipThrottleError;

  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word')?.trim();

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  // Validate input: only allow letters, hyphens, apostrophes, max 100 chars
  if (word.length > 100 || !/^[a-zA-Z'\s-]+$/.test(word)) {
    return NextResponse.json({ error: 'Invalid word format' }, { status: 400 });
  }

  try {
    // ─── แหล่งหลัก: dictionaryapi.dev ──────────────────────────────
    // ต้องกันแยกทีละแหล่ง: ถ้าแหล่งหลักล่ม (เจอจริงบน production 2026-10-26 — ทุกคำตอบ
    // ไม่สำเร็จ) ต้องยังไปต่อที่แหล่งสำรองได้ ไม่ใช่จบที่ notFound
    let meanings: DictionaryMeaning[] = [];
    let phonetic: string | null = null;
    let resolvedWord: string = word;

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { next: { revalidate: 86400 } } // cache 1 วัน
      );
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? data[0] : null;
        meanings = (entry?.meanings ?? []).slice(0, 2).map((m: {
          partOfSpeech: string;
          definitions: { definition: string; example?: string }[];
        }) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: (m.definitions ?? []).slice(0, 2).map((d: { definition: string; example?: string }) => ({
            definition: d.definition,
            example: d.example || null,
          })),
        }));
        phonetic = entry?.phonetics?.find((p: { text?: string }) => p.text)?.text || null;
        if (typeof entry?.word === 'string' && entry.word.trim()) resolvedWord = entry.word;
      }
    } catch (error) {
      console.warn('[dictionary] Primary dictionary fetch failed:', error);
    }

    // ─── แหล่งสำรอง: Wiktionary (ใช้เมื่อแหล่งหลักไม่ได้คำอธิบายมาเลย) ───
    if (meanings.length === 0) {
      try {
        const res = await fetch(
          `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
          { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5_000) }
        );
        if (res.ok) {
          meanings = mapWiktionaryEntries(await res.json());
        }
      } catch (error) {
        console.warn('[dictionary] Fallback dictionary fetch failed:', error);
      }
    }

    // ดึงคำแปลภาษาไทยผ่าน Google Translate API (ฟรี)
    let translation_th = null;
    try {
      const trRes = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=${encodeURIComponent(word)}`,
        { next: { revalidate: 86400 } }
      );
      if (trRes.ok) {
        const trData = await trRes.json();
        translation_th = trData?.[0]?.[0]?.[0] || null;
      }
    } catch (error) {
      console.warn('[dictionary] Translation fetch failed:', error);
    }

    // notFound = ไม่มีอะไรจะแสดงเลยจริง ๆ (ทั้งคำอธิบายและคำแปล)
    // — เดิมตั้ง notFound ทุกครั้งที่แหล่งหลักล่ม ทำให้หน้าเว็บขึ้น "ไม่พบในพจนานุกรม"
    //   คู่กับ "แปลว่า: ขนมปัง" ทั้งที่หาคำเจอ
    const notFound = meanings.length === 0 && !translation_th;

    return NextResponse.json({
      word: resolvedWord,
      phonetic,
      translation_th,
      meanings,
      ...(notFound ? { notFound: true } : {}),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dictionary' }, { status: 500 });
  }
}
