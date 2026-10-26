import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { checkIpThrottle } from '@/lib/api-security';
import { mapWiktionaryEntries, type DictionaryMeaning } from '@/lib/dictionary-fallback';

/**
 * ผลการค้นคำหนึ่งคำ — รูปแบบเดียวกับที่หน้าเว็บใช้ (ต้องคงรูปเดิมไว้)
 * `notFound` = ไม่มีทั้งคำอธิบายและคำแปล
 */
type DictionaryEntry = {
  word: string;
  phonetic: string | null;
  translation_th: string | null;
  meanings: DictionaryMeaning[];
  notFound?: true;
};

type PrimaryEntry = {
  meanings: DictionaryMeaning[];
  phonetic: string | null;
  word: string;
};

// ─── แหล่งข้อมูล (แยกกันพังทีละแหล่ง) ─────────────────────────────────────

/** แหล่งหลัก: dictionaryapi.dev */
async function fetchPrimaryEntry(word: string): Promise<PrimaryEntry> {
  const empty: PrimaryEntry = { meanings: [], phonetic: null, word };
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5_000) } // cache 1 วัน
    );
    if (!res.ok) return empty;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    const meanings = (entry?.meanings ?? []).slice(0, 2).map((m: {
      partOfSpeech: string;
      definitions: { definition: string; example?: string }[];
    }) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: (m.definitions ?? []).slice(0, 2).map((d: { definition: string; example?: string }) => ({
        definition: d.definition,
        example: d.example || null,
      })),
    }));
    const phonetic = entry?.phonetics?.find((p: { text?: string }) => p.text)?.text || null;
    const resolved = typeof entry?.word === 'string' && entry.word.trim() ? entry.word : word;
    return { meanings, phonetic, word: resolved };
  } catch (error) {
    console.warn('[dictionary] Primary dictionary fetch failed:', error);
    return empty;
  }
}

/** แหล่งสำรอง: Wiktionary — ใช้เมื่อแหล่งหลักไม่ได้คำอธิบายมาเลย */
async function fetchFallbackMeanings(word: string): Promise<DictionaryMeaning[]> {
  try {
    const res = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return [];
    return mapWiktionaryEntries(await res.json());
  } catch (error) {
    console.warn('[dictionary] Fallback dictionary fetch failed:', error);
    return [];
  }
}

/** คำแปลไทยผ่าน Google Translate (ฟรี) */
async function fetchThaiTranslation(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=${encodeURIComponent(word)}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.[0]?.[0] || null;
  } catch (error) {
    console.warn('[dictionary] Translation fetch failed:', error);
    return null;
  }
}

/**
 * ค้นคำ (แคช 24 ชม. ที่ Next data cache — ต่อคำ ไม่ผูกกับผู้ใช้)
 *
 * ทำไมต้องแคช: เดิมทุกการคลิกคำต้องยิง upstream ใหม่ (วัดบน production 2026-10-26:
 * 0.65–0.90 วิทุกครั้ง คำเดิมก็ไม่เร็วขึ้น) ทั้งที่ผลลัพธ์เป็นข้อมูลคงที่
 * — คำที่เคยค้นแล้วจึงเหลือแค่การอ่าน cache
 *
 * ทำไมต้องยิงทั้งสามแหล่งพร้อมกัน: เดิมต่อคิวกันเป็นทอด (พจนานุกรมหลัก → สำรอง →
 * คำแปล) ทำให้คำที่ยังไม่เคยค้นใช้เวลาเป็นผลรวมของทุกทอด (วัดบน production
 * 2026-10-26: 0.65–1.0 วิ) ทั้งที่ทั้งสามไม่ต้องใช้ผลของกันและกัน — ตอนนี้เวลา
 * เท่ากับทอดที่ช้าที่สุดทอดเดียว และเลือกผลจากแหล่งหลักก่อนถ้ามี
 */
const lookupWord = unstable_cache(
  async (word: string): Promise<DictionaryEntry> => {
    const [primary, fallbackMeanings, translation_th] = await Promise.all([
      fetchPrimaryEntry(word),
      fetchFallbackMeanings(word),
      fetchThaiTranslation(word),
    ]);

    // แหล่งหลักมาก่อนเสมอ (มี phonetic + partOfSpeech มาตรฐาน) — ไม่มีค่อยใช้สำรอง
    const dictionary = primary.meanings.length > 0
      ? primary
      : { ...primary, meanings: fallbackMeanings };

    // notFound = ไม่มีอะไรจะแสดงเลยจริง ๆ (ทั้งคำอธิบายและคำแปล)
    // — เดิมตั้ง notFound ทุกครั้งที่แหล่งหลักล่ม ทำให้หน้าเว็บขึ้น "ไม่พบในพจนานุกรม"
    //   คู่กับ "แปลว่า: ขนมปัง" ทั้งที่หาคำเจอ
    const notFound = dictionary.meanings.length === 0 && !translation_th;

    return {
      word: dictionary.word,
      phonetic: dictionary.phonetic,
      translation_th,
      meanings: dictionary.meanings,
      ...(notFound ? { notFound: true as const } : {}),
    };
  },
  ['dictionary-entry'],
  { revalidate: 86400, tags: ['dictionary'] }
);

// GET /api/dictionary?word=xxx
export async function GET(req: NextRequest) {
  // SECURITY: rate-limit per IP before any upstream call. Each request fans out
  // to dictionaryapi.dev + translate.googleapis.com, so an unauthenticated
  // flood can exhaust Vercel function seconds, damage our IP reputation with
  // Google Translate, and be used as an arbitrary-URL lookup oracle.
  // 60/นาที/IP: endpoint นี้ถูกยิงทุกครั้งที่ผู้เรียนคลิกคำในบทความและไม่มีแคช
  // ฝั่ง client ต่อคำ — เดิม 15/นาทีทำให้คนอ่าน passage คลิกคำไม่กี่คำก็โดนบล็อก
  // (ผลลัพธ์แคชที่ Next 24 ชม. อยู่แล้ว จึงไม่กระทือ upstream)
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
    const entry = await lookupWord(word);
    return NextResponse.json(entry, {
      headers: {
        // ผลค้นเป็นข้อมูลสาธารณะ (ไม่ผูกกับผู้ใช้) — ให้ CDN แชร์ต่อได้
        // คำที่คนอื่นเคยค้นจึงตอบจาก edge ทันที ไม่ต้องเข้าถึงฟังก์ชันด้วยซ้ำ
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dictionary' }, { status: 500 });
  }
}
