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

---

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

**Notes:**
- `word` unique constraint ไม่จำเป็น — คำเดียวกันมีหลาย meaning ได้ (เช่น bank = ธนาคาร/ตลิ่ง)
- Admin UI ควรแสดง **warning แบบ non-blocking** ถ้าพบ word ซ้ำในขณะ create/edit เพื่อป้องกัน duplicate โดยไม่ตั้งใจ (ดูรายละเอียดใน Admin Pages)
- `$onUpdate(() => new Date())` เป็น Drizzle-specific feature — ต้องใช้ **drizzle-orm >= 0.30.0** หรือถ้าต้องการ DB-level trigger แทน ให้ใช้ `timestamp('updated_at').defaultNow()` แล้ว trigger ใน migration SQL แทน
- ตามด้วย `DbVocabulary` and `NewVocabulary` type exports

---

## 2. Admin API Routes

### `src/app/api/admin/vocabularies/route.ts`

- **GET** — list ทั้งหมด, รองรับ filter: `?cefrLevel=A1&topic=Family&search=xxx`
  - รองรับ **pagination**: `?page=1&limit=50` (default limit: 50)
  - Response: `{ data: DbVocabulary[], total: number, page: number, totalPages: number }`
- **POST** — สร้าง vocabulary item ใหม่
  - Validate: `word`, `thaiMeaning`, `cefrLevel` required
  - ก่อน INSERT: query หา word ซ้ำในระดับ cefrLevel เดียวกัน แล้วส่ง `duplicates` กลับใน response (HTTP 201 แต่มี `warnings` field) เพื่อให้ UI แสดง warning
- `requireAdmin()` guard ทุก handler

### `src/app/api/admin/vocabularies/[id]/route.ts`

- **GET** — ดึง item เดี่ยว
- **PUT** — update item
  - เหมือน POST: ส่ง `warnings.duplicates` กลับถ้าพบ word ซ้ำ (ยกเว้น id ตัวเอง)
- **DELETE** — **soft delete** โดย set `isPublished = false` แทนการลบจริง (ดูหมายเหตุด้านล่าง)
- **DELETE** (hard) — เพิ่ม query param `?hard=true` สำหรับลบจริง ต้องมี confirmation จาก UI
- `requireAdmin()` guard ทุก handler

**หมายเหตุ Soft vs Hard Delete:**
- Soft delete (`isPublished = false`) — ซ่อนจาก public page แต่ยังอยู่ใน DB, กู้คืนได้
- Hard delete (`?hard=true`) — ลบถาวร ใช้เฉพาะเมื่อ confirm แล้วใน UI
- เนื่องจากมี `isPublished` flag อยู่แล้ว ให้ถือว่า soft delete = toggle unpublish และ hard delete เป็น action แยก

---

## 3. Admin Pages

### `/admin/vocabularies/page.tsx` — List

- ตาม pattern ของ `/admin/articles/page.tsx`
- Search bar + filter by CEFR level + filter by topic
- **Pagination**: แสดง 50 items/page มี prev/next controls
- List items แสดง: word, phonetic, partOfSpeech, cefrLevel, topic, publish status
- Actions:
  - **Edit** → ไป `/admin/vocabularies/[id]`
  - **Toggle publish** → soft delete / restore (PATCH `isPublished`)
  - **Delete** → hard delete พร้อม confirmation dialog ("ลบถาวร ไม่สามารถกู้คืนได้")
- Link to `/admin/vocabularies/new`

### `/admin/vocabularies/new/page.tsx` — Create

- ใช้ `VocabularyEditor` component (ใหม่)
- Fields: word, phonetic, partOfSpeech, definition, example, thaiMeaning, cefrLevel, topic
- หลัง submit สำเร็จ: ถ้า response มี `warnings.duplicates` ให้แสดง inline warning banner: "พบคำว่า '{word}' ที่ระดับ {cefrLevel} แล้ว {n} รายการ — ต้องการดูไหม?" พร้อม link ไป list ที่ filter คำนั้น

### `/admin/vocabularies/[id]/page.tsx` — Edit

- ใช้ `VocabularyEditor` component mode="edit"
- โหลด initial data จาก API
- Warning duplicate เหมือน Create page

### `src/components/VocabularyEditor.tsx` — Shared Editor

- ตาม pattern `GrammarArticleEditor`
- mode: "new" | "edit"
- Form fields ทั้งหมดของ vocabulary
- POST หรือ PUT ไป API
- แสดง duplicate warning banner ถ้า response มี `warnings.duplicates`

---

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
2. **Grammar list** — ลบ card shadow, ใช้ divider line แทน. คลิกไป `/must-know/[slug]`
3. **Vocabulary list** — expand inline ไม่มีหน้า detail. แสดงครบในแถวเดียว: word, phonetic, partOfSpeech, cefrLevel. คลิกเพื่อ expand แสดง definition + example + thaiMeaning
4. **Filters** — select dropdown ไม่มี border โดด, รวมอยู่ใน section header
5. **Data source** — vocabulary อ่านจาก DB แทน static file

### Vocabulary Pagination (Public Page)

- Public page โหลด vocabulary จาก DB ทั้งหมดใน Server Component แล้วส่งไป Client
- ถ้า vocabulary มีมากกว่า **200 items**: ให้ client-side filter + แสดง "แสดง 50 รายการแรก — โหลดเพิ่มเติม" แบบ load-more button
- ถ้าน้อยกว่า 200 items: แสดงทั้งหมดได้เลย (ไม่ต้อง paginate)
- Search/filter ทำ client-side จาก data ที่โหลดมาแล้ว (ไม่ต้อง re-fetch)

### Vocabulary เงื่อนไขการ expand

- Default: แสดง word, phonetic, partOfSpeech, cefrLevel ในแถวเดียว
- คลิก: expand แสดง definition, example, thaiMeaning เพิ่มขึ้นด้านล่าง
- ใช้ CSS transition ง่ายๆ (max-height หรือ grid rows)

### Server Component

`src/app/must-know/page.tsx` — ดึง articles + vocabularies จาก DB, pass ไป client component

`src/components/MustKnowClient.tsx` — rewrite ใหม่, minimal UI, รับ dbVocabularies เพิ่ม

---

## 5. Navigation / Sidebar

- **`src/app/admin/page.tsx`** — เพิ่ม vocabularies link (ระบุใน spec เดิม)
- ถ้ามี **shared sidebar component** แยก (เช่น `src/components/AdminSidebar.tsx` หรือ layout file) — ต้องเพิ่ม vocabularies link ที่นั่นด้วย
- ตรวจสอบว่า admin layout ใช้ sidebar pattern ไหน และ update ให้ครบก่อน deploy

---

## 6. Data Migration

### Seed script

- อ่าน data จาก `src/content/must-know/vocabulary.ts`
- INSERT ทั้งหมดเข้า `vocabularies` table
- รันครั้งเดียว ผ่าน `npm run db:seed` (เพิ่ม vocabulary seed เข้าไปใน existing seed script)

### Cleanup

- หลัง **confirm ใน staging** ว่า data ครบถ้วน: ลบ `src/content/must-know/vocabulary.ts`
- ลบ import ของ vocabulary content ออกจาก MustKnowClient
- **อย่าลบ source file ก่อน verify** ว่า row count ใน DB ตรงกับ static file

---

## 7. Files Changed

| File | Action |
|------|--------|
| `src/db/schema.ts` | Add `vocabularies` table + types |
| `drizzle/000x_vocabularies.sql` | New migration |
| `src/app/api/admin/vocabularies/route.ts` | New (GET + POST + pagination + duplicate warning) |
| `src/app/api/admin/vocabularies/[id]/route.ts` | New (GET + PUT + soft DELETE + hard DELETE) |
| `src/app/admin/vocabularies/page.tsx` | New (List + pagination) |
| `src/app/admin/vocabularies/new/page.tsx` | New |
| `src/app/admin/vocabularies/[id]/page.tsx` | New |
| `src/components/VocabularyEditor.tsx` | New (duplicate warning UI) |
| `src/app/must-know/page.tsx` | Modify — fetch vocabularies from DB |
| `src/components/MustKnowClient.tsx` | Rewrite — minimal UI + load-more |
| `src/app/admin/page.tsx` | Add vocabularies link |
| `src/components/AdminSidebar.tsx` *(หรือ layout เทียบเท่า)* | Add vocabularies link |
| `src/content/must-know/vocabulary.ts` | Delete after migration confirmed |
| `drizzle/seed.ts` (or equivalent) | Add vocabulary seed data |

---

## 8. Open Questions / Decisions Needed

| # | คำถาม | ตัวเลือก | Default |
|---|-------|----------|---------|
| 1 | `updatedAt` trigger | Drizzle `$onUpdate` vs DB-level trigger | Drizzle `$onUpdate` (ถ้าใช้ drizzle-orm ≥ 0.30.0) |
| 2 | Public page load strategy | SSR all → client filter vs Server pagination | SSR all ถ้า < 200 items, load-more ถ้ามากกว่า |
| 3 | Hard delete access | ทุก admin vs super-admin เท่านั้น | ทุก admin + confirmation dialog |
| 4 | Duplicate word policy | Warning only vs block | Warning only (non-blocking) |
