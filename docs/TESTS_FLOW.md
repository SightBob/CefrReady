# Flow การทำข้อสอบ /tests/ (ฉบับละเอียด)

> อัปเดตจากโค้ดจริง ณ 8 ต.ค. 2026 — อ้างไฟล์ทุกจุด ใช้เป็นแผนที่ไว้ไล่โค้ดและทดสอบ

## ภาพรวมเส้นทาง

```
/tests (หน้ารวมทุกหมวด)
  │  ไม่ล็อกอิน → TestsLoginPrompt (src/app/tests/TestsLoginPrompt.tsx)
  │  มีปุ่มแยก /tests/full (ข้อสอบเต็ม 4 พาร์ท — flow แยกต่างหาก)
  ▼
/tests/[sectionId] (เลือกชุดในหมวด)
  │  SectionTestSetCard → ลิงก์ไป /tests/[sectionId]/[setId]/intro เสมอ
  │  (src/components/SectionTestSetCard.tsx:22)
  │  พาร์ทนี้ถูกแอดมินปิดปรับปรุง → redirect /tests/[sectionId]/maintenance
  ▼
/tests/[sectionId]/[setId]/intro  ← หน้าแนะนำชุด (Server Component)
  │  การ์ดชื่อชุด + คำอธิบาย + บับเบิล "มีทั้งหมด X ข้อ" / "จับเวลา Y นาที"
  │  otter-exam + ป้ายเหลือง, ปุ่ม × กลับ /tests/[sectionId]
  │  ปุ่ม "ต่อไป" → มีเนื้อหา explain ระดับชุด ? /explain : หน้าสอบตรง
  │  (src/app/tests/[sectionId]/[setId]/intro/page.tsx · usesSetLevelExplain)
  ▼
/tests/[sectionId]/[setId]/explain  ← หน้าเนื้อหาอธิบาย (มีเฉพาะชุดที่ผูกเนื้อหาไว้)
  │  TestSetExplainView (LessonLayout + ReviewContent) — UI เดียวกับ "โหมดทบทวน"
  │  ปุ่ม × กลับ /intro · ปุ่มไปหน้าสอบ
  │  ชุดที่รวมหลายเรื่อง / ฉบับร่าง / ไม่มีเนื้อหา → redirect เข้าสอบเลย
  │  (src/app/tests/[sectionId]/[setId]/explain/page.tsx)
  ▼
/tests/[sectionId]/[setId]  ← หน้าสอบจริง (Client Component)
  │  TestLayout (แถบบน: dropdown "set - n" · progress · ปุ่ม × = exit confirm
  │  "ออกจากข้อสอบ?" → ทำต่อ/ออกจากข้อสอบ)
  │  กด × / เวลาหมด / ปุ่มสุดท้าย "ตรวจคำตอบ" → มีข้อว่าง ? ConfirmModal
  │  "ยังทำข้อสอบไม่ครบ" (ส่งคำตอบ/ทำต่อ) : ส่งเลย
  ▼
หน้า result — TestResults ตัวจริง (Figma 75:70682)
  แถบ progress "ตอบแล้ว n/m" · การ์ดคะแนน + ระดับ CEFR · การ์ดให้คะแนน 1-5
  → ช่องความคิดเห็น → แถบขอบคุณ (แสดงเมื่อมี attemptId)
  · การ์ด "เฉลยและทบทวนข้อสอบ" (reviewItems ราย slot)
  · ปุ่ม "ทำอีกครั้ง" (reset state ทำชุดเดิม) / "จบการสอบ" → /tests
```

## การแสดง Intro และ Explain ระหว่างทำข้อสอบ (ระดับ "เรื่อง")

ชุดที่รวมหลายเรื่องไว้ด้วยกัน (เช่น focus-form ที่รวม 5-6 เรื่อง) จะไม่มีหน้า
/explain ระดับชุด แต่เด้ง **intro + explain ของแต่ละเรื่อง** ตอนผู้เรียนขึ้นเรื่องใหม่
โครงการทำงานใน `src/app/tests/[sectionId]/[setId]/page.tsx`:

| ชิ้นส่วน | ที่อยู่ | หน้าที่ |
|---|---|---|
| `topicRuns` | บรรทัด ~202 | ช่วงเรื่องตามลำดับข้อสอบ (buildTopicRuns) — จุดที่จะเด้ง intro |
| `topicExplains` + `explainsLoaded` | บรรทัด ~183-186 | เนื้อหา explain รายเรื่อง โหลดคู่กับตัวชุด (fetchSet) |
| `pendingTopic` | บรรทัด ~187 | สถานะเปิด overlay เรื่องปัจจุบัน |
| `seenTopics` (ref Set) | บรรทัด ~194 | เรื่องที่เด้งแล้ว — เด้งครั้งเดียวต่อเรื่องต่อการทำชุด 1 ครั้ง |
| useEffect เด้งเรื่อง | บรรทัด ~262-278 | slot ปัจจุบันขึ้นเรื่องใหม่ + มี explain + ยังไม่เคยเห็น → setPendingTopic |
| `topicGate` | บรรทัด ~749-758 | render `<TopicIntroOverlay>` ทับหน้าสอบ (ทุก branch เรนเดอร์) |

**ลำดับที่ผู้เรียนเห็น (TopicIntroOverlay — src/components/TopicIntroOverlay.tsx):**

1. **จังหวะ intro** — การ์ดโครงเดียวกับหน้า /intro ระดับชุด (.intro-fluid จาก
   globals.css · Figma 200:7664 mobile / 75:68796 desktop): ชื่อเรื่อง + บทนำ +
   บับเบิล "เรื่องที่ N จาก M" (โชว์เมื่อมี >1 เรื่อง) + "มี X ข้อ" +
   ปุ่ม × (ข้ามไปทำข้อสอบ) · ปุ่ม "อ่านเนื้อหา"
2. **จังหวะ explain** — `<TestExplainOverlay>` เต็มจอ ตัวเดียวกับปุ่ม "โหมดทบทวน"
   (LessonLayout + ReviewContent) · ปิด = เข้าข้อสอบของเรื่องนั้นต่อทันที

ข้อสังเกต:
- เนื้อหาของเรื่องที่อยู่ข้อปัจจุบันยังเปิดซ้ำได้ทุกเมื่อผ่านปุ่ม **"โหมดทบทวน"**
  บนแถบล่าง (reviewAction — โชว์เมื่อเรื่องนั้นมี explain)
- แอดมินพรีวิว: `?topic=…` กระโดดไปข้อแรกของเรื่องที่ขอ (previewJumped, บรรทัด ~208-217)
- เปลี่ยนชุด (dropdown) หรือกด "ทำอีกครั้ง" = clear seenTopics → เรื่องจะเด้ง intro ใหม่ครบ (บรรทัด ~302-306, ~647)

## กติกาการตัดสินใจของปุ่มในหน้าสอบ (TestLayout บรรทัด ~931-1005)

| สถานะ | ปุ่มขวาสุดของแถบล่าง |
|---|---|
| ยังไม่ใช่ข้อสุดท้าย | "ข้อต่อไป" (หรือ primaryAction แทน — เช่น tap: "ตรวจคำตอบ", form-meaning หลังส่ง: "ดูผลการสอบ") |
| ข้อสุดท้าย (ยังไม่ส่ง) | "ตรวจคำตอบ" → onSubmit |
| ส่งแล้ว (isSubmitted, form-meaning) | "ดูผลการสอบ" ผ่าน primaryAction (ปุ่ม "ทำชุด n" ถูกลบไปแล้ว) |

tap & select พิเศษ: เลือก A/B → กด "ตรวจคำตอบ" → AI ตรวจเหตุผล (POST
/api/tests/tap-reason) → ข้อสุดท้ายเปลี่ยนปุ่มเป็น "ส่งคำตอบ"

## ไฟล์ประกอบทั้งหมด

| ไฟล์ | บทบาท |
|---|---|
| `src/app/tests/page.tsx` + `TestsPageClient.tsx` | หน้ารวม + ปุ่ม /tests/full |
| `src/app/tests/[sectionId]/page.tsx` | รายการชุดในหมวด (+ maintenance redirect) |
| `src/components/SectionTestSetCard.tsx` | การ์ดชุด → ลิงก์ /intro |
| `src/app/tests/[sectionId]/[setId]/intro/page.tsx` | หน้าแนะนำชุด (RSC, revalidate 300) |
| `src/app/tests/[sectionId]/[setId]/explain/page.tsx` | เนื้อหาอธิบายระดับชุด (RSC) |
| `src/components/TestSetExplainView.tsx` | ตัวเรนเดอร์ explain ระดับชุด |
| `src/app/tests/[sectionId]/[setId]/page.tsx` | หน้าสอบหลัก + topic gate + modals |
| `src/components/TestLayout.tsx` | โครงหน้าสอบ + แถบล่าง + exit confirm |
| `src/components/TopicIntroOverlay.tsx` | intro+explain รายเรื่อง (portal) |
| `src/components/TestExplainOverlay.tsx` | overlay เนื้อหาอธิบาย (ใช้ร่วม) |
| `src/components/FormMeaningQuiz.tsx` | renderer พิเศษ form-meaning (บทความเติมคำ) |
| `src/components/TestResults.tsx` | หน้าผล + เฉลยทบทวน (ReviewItem ราย slot) |
| `src/components/ChromeShell.tsx` | EXAM_PATH ซ่อน header/footer หน้าสอบ+intro |
| `src/lib/test-set-slots.ts` | expandTestSetSlots — ขยายข้อเป็น slot (MC/tap item/blank) |
| `src/lib/test-set-topics.ts` | usesSetLevelExplain / buildTopicRuns helpers |
