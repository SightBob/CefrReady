/**
 * ตัวช่วยแปลงผลจากพจนานุกรมสำรอง (Wiktionary REST) ให้เป็นรูปแบบเดียวกับ
 * พจนานุกรมหลัก (dictionaryapi.dev) ที่หน้าเว็บใช้อยู่
 *
 * ทำไมต้องมี: บน production พจนานุกรมหลักตอบไม่สำเร็จทุกคำ (ตรวจเมื่อ 2026-10-26:
 * /api/dictionary?word=bread คืน notFound ทั้งที่ฝั่งเครื่องเราเรียก upstream ได้ 200)
 * ผู้เรียนจึงเห็นแค่คำแปลไทยกับข้อความ "ไม่พบในพจนานุกรม" — เพิ่มแหล่งสำรองเพื่อให้
 * ยังได้คำอธิบายภาษาอังกฤษ ไม่ใช่ปล่อยให้ทั้งคำหาย
 */

export type DictionaryDefinition = {
  definition: string;
  example: string | null;
};

export type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

/** ตัดแท็ก HTML + แปลง entity พื้นฐานที่ Wiktionary ส่งมาในคำอธิบาย */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
      if (code.startsWith('#x') || code.startsWith('#X')) {
        const codePoint = Number.parseInt(code.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      if (code.startsWith('#')) {
        const codePoint = Number.parseInt(code.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    // ตัดช่องว่างที่ค้างหน้าประกอบ (มาจากการแทนแท็กด้วยช่องว่าง): "wallaby , Setonix"
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

type RawDefinition = {
  definition?: unknown;
  examples?: unknown;
  parsedExamples?: unknown;
};

type RawGroup = {
  partOfSpeech?: unknown;
  definitions?: unknown;
};

function firstExample(raw: RawDefinition): string | null {
  const parsed = Array.isArray(raw.parsedExamples) ? raw.parsedExamples : [];
  const parsedFirst = parsed[0] as { example?: unknown } | undefined;
  if (typeof parsedFirst?.example === 'string' && parsedFirst.example.trim()) {
    return stripHtml(parsedFirst.example);
  }
  const examples = Array.isArray(raw.examples) ? raw.examples : [];
  const first = examples[0];
  if (typeof first === 'string' && first.trim()) return stripHtml(first);
  return null;
}

/**
 * แปลง payload ของ Wiktionary (`/api/rest_v1/page/definition/<word>`) เป็นรูปแบบเดียวกับ
 * dictionaryapi.dev — เอาเฉพาะภาษาอังกฤษ 2 กลุ่มความหมายแรก กลุ่มละไม่เกิน 2 คำอธิบาย
 */
export function mapWiktionaryEntries(payload: unknown): DictionaryMeaning[] {
  if (!payload || typeof payload !== 'object') return [];
  const groups = (payload as { en?: unknown }).en;
  if (!Array.isArray(groups)) return [];

  return (groups as RawGroup[])
    .slice(0, 2)
    .map((group) => {
      const definitions = (Array.isArray(group?.definitions) ? (group.definitions as RawDefinition[]) : [])
        .slice(0, 2)
        .map((raw) => ({
          definition: typeof raw?.definition === 'string' ? stripHtml(raw.definition) : '',
          example: firstExample(raw ?? {}),
        }))
        .filter((entry) => entry.definition.length > 0);
      return {
        partOfSpeech: typeof group?.partOfSpeech === 'string' ? group.partOfSpeech : '',
        definitions,
      };
    })
    .filter((meaning) => meaning.definitions.length > 0);
}
