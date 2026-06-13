# Must-Know Page Redesign — Design Spec

## Goal

ปรับหน้า Must-Know ให้ minimal อ่านง่าย (reading-focused) และเพิ่ม CRUD สำหรับคำศัพท์ผ่าน Admin UI — ย้าย vocabulary จาก hardcoded data เข้า database

## Scope

1. สร้าง `vocabularies` table ใน DB schema
2. สร้าง API routes สำหรับ vocabulary CRUD (admin only)
3. สร้าง Admin pages สำหรับจัดการ vocabulary (list / create / edit)
4. ปรับ Public Must-Know page UI ให้ minimal, reading-friendly
5. Seed script ย้าย vocabulary data จาก static file เข้า DB
6. ลบ hardcoded vocabulary file หลัง migration

## 1. Database Schema

### New table: `vocabularies`

```ts
export const vocabularies = pgTable('vocabularies', {
  id: serial('id').primaryKey(),
  word: varchar('word', { length: 100 }).notNull(),
  phonetic: varchar('phonetic', { length: 100 }),
  partOfSpeech: varchar('part_of_speech', { length: 30 }),
  definition: text('definition').notNull(),
  example: text('example'),
  thaiMeaning: varchar('thai_meaning', { length: 200 }).notNull(),
  cefrLevel: varchar('cefr_level', { length: 5 }).notNull(), // A1-C2
  topic: varchar('topic', { length: 100 }),
  isPublished: boolean('is_published').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  wordIdx: index('vocabularies_word_idx').on(table.word),
  levelIdx: index('vocabularies_level_idx').on(table.cefrLevel),
  topicIdx: index('vocabularies_topic_idx').on(table.topic),
}));
```

- `word` unique constraint ไม่จำเป็น (มีคำเดียวกันหลาย meaning ได้ เช่น bank = ธนาคาร/ตลิ่ง)
- ตามด้วย `DbVocabulary` and `NewVocabulary` type exports

## 2. Admin API Routes

### `src/app/api/admin/vocabularies/route.ts`

- **GET** — list ทั้งหมด, รองรับ filter: `?cefrLevel=A1&topic=Family&search=xxx`
- **POST** — สร้าง vocabulary item ใหม่, validate: `word`, `thaiMeaning`, `cefrLevel` required
- `requireAdmin()` guard ทุก handler

### `src/app/api/admin/vocabularies/[id]/route.ts`

- **GET** — ดึง item เดี่ยว
- **PUT** — update item
- **DELETE** — ลบ item
- `requireAdmin()` guard ทุก handler

## 3. Admin Pages

### `/admin/vocabularies/page.tsx` — List

- ตาม pattern ของ `/admin/articles/page.tsx`
- Search bar + filter by CEFR level + filter by topic
- List items แสดง: word, phonetic, partOfSpeech, cefrLevel, topic, publish status
- Actions: edit, toggle publish, delete
- Link to `/admin/vocabularies/new`

### `/admin/vocabularies/new/page.tsx` — Create

- ใช้ `VocabularyEditor` component (ใหม่)
- Fields: word, phonetic, partOfSpeech, definition, example, thaiMeaning, cefrLevel, topic

### `/admin/vocabularies/[id]/page.tsx` — Edit

- ใช้ `VocabularyEditor` component mode="edit"
- โหลด initial data จาก API

### `src/components/VocabularyEditor.tsx` — Shared Editor

- ตาม pattern `GrammarArticleEditor`
- mode: "new" | "edit"
- Form fields ทั้งหมดของ vocabulary
- POST หรือ PUT ไป API

## 4. Public Must-Know Page Redesign

### Layout Direction

จากเดิม (3 tabs + card-based + colorful badges) เปลี่ยนเป็น minimal reading layout ตาม article detail page style.

### Visual Style

- Background: `bg-[#fafaf9]`
- Headers: font-serif (Pridi), stone-900
- ไม่มี rounded-xl cards หรือ shadow — ใช้ divider lines (`border-b border-stone-200/60`)
- CEFR badge: `bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded-full` (เหมือน article page)
- Max width: `max-w-3xl` เหมือน article page
- Sticky header: backdrop-blur กลมกลืน

### Structure

```
Header (sticky)
├── Back button ← /tests หรือ /
├── "MUST KNOW" heading (serif)
└── Subtitle "ข้อมูลสำคัญที่ต้องรู้ก่อนสอบ"

Body (max-w-3xl)
├── Overview Section (แสดงเสมอ)
│   ├── ระดับภาษา CEFR (A1–C2 grid)
│   ├── เงื่อนไขสำคัญ (A2 minimum)
│   └── โครงสร้างข้อสอบ (4 ส่วน)
│
├── Grammar Section
│   ├── Section header: "ไวยากรณ์" + count
│   ├── Filter: CEFR level select (minimal)
│   └── List items → Link to /must-know/[slug]
│       └── Format: title (serif) ... cefrLevel badge →
│
├── Vocabulary Section
│   ├── Section header: "คำศัพท์" + count
│   ├── Filter: CEFR level select + search
│   └── List items (inline expand)
│       ├── Collapsed: word (serif) | phonetic | partOfSpeech | cefrLevel
│       └── Expanded: definition, example, thaiMeaning
│
└── Footer: minimal
```

### Key Changes from Current

1. **ย้าย "ภาพรวม" ขึ้นด้านบน** — แสดงเป็น section แรก (CEFR levels, เงื่อนไข A2, โครงสร้างข้อสอบ) ก่อน grammar/vocabulary, minimal style เหมือนที่เคยแต่ปรับให้กลมกลืนกับ design ใหม่ (stone color, serif headings, ไม่มี cards)
2. **Grammar list** — ลบ card shadow, ใช้ divider line แทน. คลิกไป `/must-know/[slug]` (หน้าเดียวกับเดิม)
3. **Vocabulary list** — expand inline ไม่มีหน้า detail. แสดงครบในแถวเดียว: word, phonetic, partOfSpeech, cefrLevel. คลิกเพื่อ expand แสดง definition + example + thaiMeaning
4. **Filters** — select dropdown ไม่มี border โดด, รวมอยู่ใน section header
5. **Data source** — vocabulary อ่านจาก DB แทน static file

### Server Component

`src/app/must-know/page.tsx` — ดึง articles + vocabularies จาก DB, pass ไป client component

`src/components/MustKnowClient.tsx` — rewrite ใหม่, minimal UI, รับ dbVocabularies เพิ่ม

### Vocabulary เงื่อนไขการ expand

- Default: แสดง word, phonetic, partOfSpeech, cefrLevel ในแถวเดียว
- คลิก: expand แสดง definition, example, thaiMeaning เพิ่มขึ้นด้านล่าง
- ใช้ CSS transition ง่ายๆ (max-height หรือ grid rows)

## 5. Data Migration

### Seed script

- อ่าน data จาก `src/content/must-know/vocabulary.ts`
- INSERT ทั้งหมดเข้า `vocabularies` table
- รันครั้งเดียว ผ่าน `npm run db:seed` (เพิ่ม vocabulary seed เข้าไปใน existing seed script)

### Cleanup

- หลัง confirm data ย้ายเสร็จ: ลบ `src/content/must-know/vocabulary.ts`
- ลบ import ของ vocabulary content ออกจาก MustKnowClient

## 6. Files Changed

| File | Action |
|------|--------|
| `src/db/schema.ts` | Add `vocabularies` table + types |
| `drizzle/000x_vocabularies.sql` | New migration |
| `src/app/api/admin/vocabularies/route.ts` | New |
| `src/app/api/admin/vocabularies/[id]/route.ts` | New |
| `src/app/admin/vocabularies/page.tsx` | New |
| `src/app/admin/vocabularies/new/page.tsx` | New |
| `src/app/admin/vocabularies/[id]/page.tsx` | New |
| `src/components/VocabularyEditor.tsx` | New |
| `src/app/must-know/page.tsx` | Modify — fetch vocabularies from DB |
| `src/components/MustKnowClient.tsx` | Rewrite — minimal UI |
| `src/app/admin/page.tsx` | Add vocabularies link |
| `src/content/must-know/vocabulary.ts` | Delete after migration |
| `drizzle/seed.ts` (or equivalent) | Add vocabulary seed data |
