import { NextRequest, NextResponse } from 'next/server';

// GET /api/dictionary?word=xxx
// ดึงความหมายจาก Free Dictionary API (ฟรี 100%)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word')?.trim();

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { next: { revalidate: 86400 } } // cache 1 วัน
    );

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
    } catch {
      // ปล่อยผ่านถ้าแปลไม่ได้
    }

    if (!res.ok) {
      // คำที่ไม่มีใน dictionary แต่ส่งคำแปลไทยไปเผื่อได้
      return NextResponse.json({ notFound: true, word, translation_th }, { status: 200 });
    }

    const data = await res.json();

    // สรุปข้อมูลที่ต้องการ
    const entry = data[0];
    const meanings = entry?.meanings?.slice(0, 2).map((m: {
      partOfSpeech: string;
      definitions: { definition: string; example?: string }[];
    }) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.slice(0, 2).map((d: { definition: string; example?: string }) => ({
        definition: d.definition,
        example: d.example || null,
      })),
    })) || [];

    const phonetic = entry?.phonetics?.find((p: { text?: string }) => p.text)?.text || null;

    return NextResponse.json({
      word: entry?.word || word,
      phonetic,
      translation_th,
      meanings,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dictionary' }, { status: 500 });
  }
}
