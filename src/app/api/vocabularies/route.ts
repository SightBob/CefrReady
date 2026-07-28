import { db } from '@/db';
import { vocabularies } from '@/db/schema';
import { eq, asc, ilike, or, and, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { checkIpThrottle } from '@/lib/api-security';

export async function GET(req: NextRequest) {
  // SECURITY: uncached ilike search hits the DB directly — throttle to keep
  // the endpoint from being a cheap DoS vector (report M3).
  const ipThrottleError = await checkIpThrottle(req, {
    keySuffix: 'vocabularies',
    maxRequests: 30,
  });
  if (ipThrottleError) return ipThrottleError;

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  const search = searchParams.get('search')?.trim() || '';
  const cefrRange = searchParams.get('cefrRange') || 'all';

  const conditions = [eq(vocabularies.isPublished, true)];

  if (search) {
    conditions.push(
      or(
        ilike(vocabularies.word, `%${search}%`),
        ilike(vocabularies.thaiMeaning, `%${search}%`),
        ilike(vocabularies.definition, `%${search}%`),
      )!,
    );
  }

  if (cefrRange === 'A1-A2') {
    conditions.push(or(eq(vocabularies.cefrLevel, 'A1'), eq(vocabularies.cefrLevel, 'A2'))!);
  } else if (cefrRange === 'B1-B2') {
    conditions.push(or(eq(vocabularies.cefrLevel, 'B1'), eq(vocabularies.cefrLevel, 'B2'))!);
  } else if (cefrRange === 'C1-C2') {
    conditions.push(or(eq(vocabularies.cefrLevel, 'C1'), eq(vocabularies.cefrLevel, 'C2'))!);
  }

  const where = and(...conditions);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: vocabularies.id,
        word: vocabularies.word,
        phonetic: vocabularies.phonetic,
        partOfSpeech: vocabularies.partOfSpeech,
        definition: vocabularies.definition,
        example: vocabularies.example,
        thaiMeaning: vocabularies.thaiMeaning,
        cefrLevel: vocabularies.cefrLevel,
        topic: vocabularies.topic,
      })
      .from(vocabularies)
      .where(where)
      .orderBy(asc(vocabularies.word))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(vocabularies)
      .where(where),
  ]);

  return NextResponse.json({
    data: rows,
    total: totalResult[0].count,
    page,
    limit,
  });
}