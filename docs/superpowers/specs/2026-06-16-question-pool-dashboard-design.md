# Admin Question Pool Dashboard — Design Spec

## Overview

เพิ่มหน้า dashboard สำหรับ admin เพื่อดูภาพรวม question pool ว่าแต่ละ test type × CEFR level มีข้อสอบเพียงพอหรือไม่ พร้อมติดตาม fallback/reuse rate ในการใช้งานจริง และระดับ CEFR ที่ user ไปถึงจริงต่อ type

## Goals

1. เห็นช่องว่างของข้อสอบแบบ type × level ได้ทันที
2. รู้ว่าในการสอบจริง ต้อง fallback หรือ reuse บ่อยแค่ไหน
3. รู้ว่าควรเติม content ระดับไหนก่อน โดยอิงจากระดับที่ user ไปถึงจริง

## Decision: ทางเลือก B

สร้างหน้าใหม่ `/admin/question-pool` แยกจาก `/admin/reports` เพื่อให้โฟกัสเฉพาะปัญหา pool coverage/fallback/reuse โดยเฉพาะ และเพิ่ม tile ลิงก์จากหน้า `/admin`

## Pages & Routes

- `GET /admin/question-pool` — หน้า dashboard
- `GET /api/admin/question-pool` — API คืนข้อมูล dashboard

## Database Changes

### New table: `question_selection_logs`

```ts
export const questionSelectionLogs = pgTable('question_selection_logs', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').notNull().references(() => testAttempts.id, { onDelete: 'cascade' }),
  testTypeId: varchar('test_type_id', { length: 50 }).notNull(),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  targetLevel: varchar('target_level', { length: 10 }).notNull(),
  selectedLevel: varchar('selected_level', { length: 10 }).notNull(),
  mode: varchar('mode', { length: 20 }).notNull(), // 'exact' | 'fallback' | 'reuse'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  attemptIdx: index('qsl_attempt_idx').on(table.attemptId),
  typeIdx: index('qsl_type_idx').on(table.testTypeId),
  modeIdx: index('qsl_mode_idx').on(table.mode),
  createdAtIdx: index('qsl_created_at_idx').on(table.createdAt),
}));

export type DbQuestionSelectionLog = typeof questionSelectionLogs.$inferSelect;
export type NewQuestionSelectionLog = typeof questionSelectionLogs.$inferInsert;
```

## Logging Selection Outcomes

แก้ไข routes ที่เรียก `selectQuestion()`:

- `src/app/api/tests/full/start/route.ts`
- `src/app/api/tests/full/resume/route.ts`
- `src/app/api/tests/full/next/route.ts`

หลังจากได้ `selection` แล้ว ให้คำนวณ `mode`:

```ts
let mode: 'exact' | 'fallback' | 'reuse';
if (selection.reused) {
  mode = 'reuse';
} else if (selection.question.cefrLevel === targetLevel) {
  mode = 'exact';
} else {
  mode = 'fallback';
}
```

แล้ว insert log ด้วย helper (เช่น `logQuestionSelection`) โดย try/catch ไม่ให้กระทบ user flow

## API Response: `/api/admin/question-pool`

```ts
{
  success: true,
  data: {
    testTypes: Array<{ id: string; name: string; color: string | null; icon: string | null }>;
    coverageMatrix: Array<{
      testTypeId: string;
      testTypeName: string;
      counts: Record<CefrLevel, number>;
      total: number;
      levelsAtRisk: CefrLevel[];
    }>;
    selectionStats: {
      last30Days: Array<{
        testTypeId: string;
        exact: number;
        fallback: number;
        reuse: number;
        total: number;
      }>;
      allTime: Array<{
        testTypeId: string;
        exact: number;
        fallback: number;
        reuse: number;
        total: number;
      }>;
    };
    reachedLevelDistribution: Array<{
      testTypeId: string;
      testTypeName: string;
      counts: Record<CefrLevel, number>;
      total: number;
    }>;
  }
}
```

### Coverage Matrix Query

Group active questions by `testTypeId` and `cefrLevel`:

```ts
await db
  .select({
    testTypeId: questions.testTypeId,
    cefrLevel: questions.cefrLevel,
    count: count(),
  })
  .from(questions)
  .where(eq(questions.active, 'true'))
  .groupBy(questions.testTypeId, questions.cefrLevel);
```

### Selection Stats Query

```ts
await db
  .select({
    testTypeId: questionSelectionLogs.testTypeId,
    mode: questionSelectionLogs.mode,
    count: count(),
  })
  .from(questionSelectionLogs)
  .where(sql`${questionSelectionLogs.createdAt} >= NOW() - INTERVAL '30 days'`)
  .groupBy(questionSelectionLogs.testTypeId, questionSelectionLogs.mode);
```

### Reached Level Distribution Query

จาก `testAttempts` ที่ `status = 'completed'` และ `testTypeId = 'full-test'` ให้ parse `currentLevels` JSON แล้ว aggregate จำนวน attempt ต่อ testType × level

## Frontend Components

1. `QuestionPoolCoverageMatrix` — ตาราง type × level แสดงจำนวนข้อ + สีตามระดับความเสี่ยง
2. `SelectionModeChart` — stacked bar chart แสดง exact/fallback/reuse ต่อ test type
3. `ReachedLevelChart` — grouped bar chart แสดงระดับ CEFR ที่ user ไปถึงจริงต่อ type

## Coverage Thresholds (Default)

| Test Type | Low (red) | Medium (yellow) | Good (green) |
|---|---|---|---|
| focus-form | < 5 | 5–9 | ≥ 10 |
| focus-meaning | < 5 | 5–9 | ≥ 10 |
| form-meaning | < 2 | 2–3 | ≥ 4 |
| listening | < 5 | 5–9 | ≥ 10 |

## Admin Dashboard Tile

เพิ่ม tile ใน `src/app/admin/page.tsx`:

- Title: `ภาพรวม Question Pool`
- Description: `ดูการกระจายข้อสอบ ระดับ CEFR และ fallback/reuse`
- Icon: `Database` หรือ `Layers`
- href: `/admin/question-pool`

## Caching

ใช้ `unstable_cache` ใน `/api/admin/question-pool`:

- tag: `question-pool`
- revalidate: 60 วินาที

## Security

- เรียก `requireAdmin()` ที่ API
- หน้า `/admin/question-pool` อยู่ภายใต้ `src/app/admin/layout.tsx` ซึ่งเช็ค `isAdmin` อยู่แล้ว

## Migration & Verification

1. รัน `npm run db:generate` หลังเพิ่ม schema
2. รัน `npm run build` เพื่อตรวจ TypeScript + lint
3. (Production) รัน `npm run db:migrate`

## Out of Scope

- ไม่แก้ไข algorithm `selectQuestion` เอง นอกจาก logging
- ไม่เปลี่ยน UI ของ `/admin/reports`
- ไม่ backfill log เก่า
