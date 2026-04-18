# Report Question Feature — Design Spec
**Date:** 2026-04-18  
**Status:** Approved

## Overview

เพิ่มระบบ "แจ้งปัญหาข้อสอบ" ให้ผู้ใช้สามารถกดรายงานปัญหาที่พบขณะทำข้อสอบได้ทันที โดยเลือกประเภทปัญหาและพิมพ์ Comment เพิ่มเติมได้ ฝั่ง Admin มีหน้าจัดการ Report พร้อมอัพเดตสถานะและ Quick-link ไปแก้ข้อสอบที่มีปัญหา

---

## 1. Database Schema — `question_reports` (new table)

```ts
export const questionReports = pgTable('question_reports', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // nullable — anonymous allowed
  issueType: varchar('issue_type', { length: 50 }).notNull(),
  // values: 'wrong_answer' | 'missing_option' | 'unclear_language' | 'audio_problem' | 'other'
  comment: text('comment'),           // optional free-text from user
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // values: 'pending' | 'in_progress' | 'resolved'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => sql`NOW()`).notNull(),
}, (table) => ({
  questionIdx: index('qr_question_idx').on(table.questionId),
  statusIdx: index('qr_status_idx').on(table.status),
}));
```

Preset issue types (แสดงเป็นภาษาไทยใน UI):
| Value | Label ภาษาไทย |
|---|---|
| `wrong_answer` | คำตอบที่ถูกต้องไม่ถูกต้อง |
| `missing_option` | ตัวเลือกไม่ครบหรือผิดพลาด |
| `unclear_language` | ภาษาสับสนหรืออ่านไม่เข้าใจ |
| `audio_problem` | เสียงมีปัญหา (เฉพาะ Listening) |
| `other` | อื่นๆ |

---

## 2. Migration

ต้องรัน Drizzle migration เพื่อสร้างตาราง `question_reports` ใหม่

---

## 3. API Routes

### `POST /api/questions/[id]/report`
- **Auth:** ไม่จำเป็น (anonymous ได้)
- **Body:** `{ issueType: string, comment?: string }`
- **Validation:** issueType ต้องอยู่ใน enum ที่กำหนด
- **Response:** `201` + `{ id, questionId, issueType, status }`
- **Error:** `400` ถ้า issueType ไม่ถูกต้อง, `404` ถ้า questionId ไม่มีในระบบ

### `GET /api/admin/reports`
- **Auth:** Admin only
- **Query params:** `?status=pending|in_progress|resolved|all` (default: `all`)
- **Response:** รายการ report พร้อม join ข้อมูล question (questionText preview 60 chars), testTypeId, userId, createdAt
- **Sort:** createdAt DESC (ใหม่สุดก่อน)

### `PATCH /api/admin/reports/[id]`
- **Auth:** Admin only
- **Body:** `{ status: 'pending' | 'in_progress' | 'resolved' }`
- **Response:** `200` + updated report object

---

## 4. User-facing UI

### ปุ่มใน TestLayout
- ปุ่ม `AlertTriangle` icon (มีอยู่แล้วใน Lucide imports) วางข้าง Flag button ใน toolbar
- ป้ายกำกับ: "แจ้งปัญหา"
- สี: slate/neutral (ไม่ดึงความสนใจมากเกินไป) — hover เปลี่ยนเป็น orange
- ซ่อนไม่ให้กดซ้ำ: หลังส่ง Report สำเร็จแล้ว ปุ่มเปลี่ยนเป็น checkmark สีเขียวและ disable สำหรับข้อนั้น

### Report Modal (`ReportModal.tsx` — new component)
```
┌─────────────────────────────────────┐
│  🚩 แจ้งปัญหา — ข้อที่ {n}         │
├─────────────────────────────────────┤
│  เลือกประเภทปัญหา *                │
│  ┌──────────────────┐ ┌───────────┐ │
│  │ คำตอบไม่ถูกต้อง  │ │ ตัวเลือก  │ │
│  └──────────────────┘ └───────────┘ │
│  ┌──────────────────┐ ┌───────────┐ │
│  │ ภาษาสับสน        │ │ เสียง     │ │
│  └──────────────────┘ └───────────┘ │
│  ┌──────────────────┐               │
│  │ อื่นๆ            │               │
│  └──────────────────┘               │
│                                     │
│  อธิบายเพิ่มเติม (ไม่บังคับ)       │
│  ┌─────────────────────────────────┐│
│  │ textarea                        ││
│  └─────────────────────────────────┘│
│                                     │
│  [ยกเลิก]          [ส่งรายงาน →]   │
└─────────────────────────────────────┘
```
- Chip/badge selector สำหรับ issueType (เลือกได้ 1 อัน)
- Textarea max 500 chars
- Submit button disabled จนกว่าจะเลือก issueType
- Loading state ขณะส่ง
- หลังส่งสำเร็จ: ปิด Modal อัตโนมัติ + Toast "ขอบคุณ! รับรายงานแล้ว"

---

## 5. Admin UI — `/admin/reports` (new page)

### Layout
- เพิ่ม link "รายงานปัญหา" ในเมนู Admin sidebar
- แสดง badge count จำนวน `pending` reports ที่ยังไม่ได้ดำเนินการ

### ตาราง Report
| คอลัมน์ | รายละเอียด |
|---|---|
| ข้อที่ | Question ID + Preview 60 chars |
| ประเภท | issueType label ภาษาไทย |
| Comment | truncate 80 chars + expand |
| ผู้แจ้ง | User email หรือ "ไม่ระบุ" |
| วันที่ | relative time (เช่น "2 ชั่วโมงก่อน") |
| สถานะ | Dropdown: pending / in_progress / resolved |
| Actions | ปุ่ม "ดูข้อสอบ" → link ไปที่ `/admin/questions?id={questionId}` |

### Filters
- Tabs: ทั้งหมด / รอดำเนินการ / กำลังแก้ไข / แก้ไขแล้ว
- Status badge colors: pending=orange, in_progress=blue, resolved=green

---

## 6. Files ที่ต้องสร้าง/แก้ไข

### New files
- `src/db/schema.ts` — เพิ่ม `questionReports` table + types
- `src/app/api/questions/[id]/report/route.ts` — POST endpoint
- `src/app/api/admin/reports/route.ts` — GET endpoint
- `src/app/api/admin/reports/[id]/route.ts` — PATCH endpoint
- `src/components/ReportModal.tsx` — Modal component
- `src/app/admin/reports/page.tsx` — Admin reports page

### Modified files
- `src/components/TestLayout.tsx` — เพิ่มปุ่ม + state จัดการ Modal
- `src/app/admin/layout.tsx` หรือ Admin sidebar — เพิ่ม link และ badge count

---

## 7. Error Handling

- ถ้าส่ง Report ไม่สำเร็จ (network error ฯลฯ): Toast แจ้ง error, ให้ลองใหม่ได้
- Rate limiting: ไม่ implement ในระยะนี้ (YAGNI) — ถ้า spam report มากค่อยเพิ่มทีหลัง

---

## 8. Out of Scope (ไม่ทำในรอบนี้)

- Email notification
- Rate limiting / spam protection
- ระบบ Merge duplicate reports
- Analytics dashboard สำหรับ report trends
