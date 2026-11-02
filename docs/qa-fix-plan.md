# แผนแก้ข้อสอบจาก `qa-report.md` — ขั้นที่ 1 (อ่านอย่างเดียว)

> **สถานะ: ยังไม่มีการแก้ไขใด ๆ** — รอบนี้ใช้ `SELECT` เท่านั้น ไม่มีการเขียน DB และไม่เรียก `PUT /api/admin/questions/[id]`
> อัปเดตล่าสุด: 2 พ.ย. 2026 — เขียน DB แล้ว **1 แถว (id 1679)** ตามที่อนุมัติ · id 2153 รออนุมัติร่าง

## 0. การเข้าถึง DB

| รอบ | ผล |
|---|---|
| รอบแรก (1 พ.ย.) | ❌ Neon MCP `ENOTFOUND mcp.neon.tech` · `pg` `EAI_AGAIN` |
| รอบนี้ (2 พ.ย.) | ✅ ต่อผ่าน `pg` + `DATABASE_URL` ได้ — `SELECT` เท่านั้น |

ขนาดจริง: `questions` **411** (focus-meaning 196 · focus-form 158 · listening 36 · form-meaning 21) · `test_explains` 25
ส่วนขยาย: **ไม่มี `pg_trgm` / `unaccent`** (ไม่สร้างเพิ่มตามกติกา) → ค้นด้วย normalized `ILIKE` แทน

โครงสร้างที่เกี่ยวกับ cloze (สำคัญ): โจทย์ Form-Meaning เก็บบทความเป็น `questions.article` = `{text, title, blanks:[{id, correctAnswer}]}` — **คำตอบอยู่ใน `blanks`** ไม่ได้อยู่ใน `test_explains`
`test_explains` เป็นบทอธิบายไวยากรณ์ของชุดข้อสอบ (มี `sections`, `test_set_ids`) ไม่ผูกกับ question_id
`articles` / `article_questions` เป็นระบบบทความเรียนคนละเรื่อง (`article_questions` = 0 แถว)

## 1. ID ในรายงานไม่ใช่ ID ใน DB

ID ใน `qa-report.md` มาจาก CSV `questions (2).csv` (ไม่มีในรีโป) ส่ง 31 ID เข้า DB ตรง ๆ พบจริงแค่ **3 ID** (1256, 1259, 1288 = Listening ทั้งหมด) → ต้อง map ด้วยข้อความ

## 2. Reconcile ตัวเลข

| รายการ | รายงานไว้ | นับจากไฟล์ | หลังแก้หัวไฟล์ |
|---|---:|---:|---:|
| ข้อมีปัญหา | 32 | **31** | 31 |
| บล็อก `**ข้อที่:**` | — | 30 (บล็อก `1043 และ 1111` รวม 2 ID) | — |
| สูง / กลาง / ต่ำ | 22 / 7 / 3 | **20 / 9 / 2** | 20 / 9 / 2 |
| ข้อปกติ | 285 | 286 | 286 |

- ข้อที่ 32 ระบุไม่ได้ (ไม่มีบล็อกในไฟล์ + ไม่มี CSV ต้นฉบับ) · หัว `qa-report.md` แก้เป็น 31 (20/9/2) แล้ว

## 3. สถานะรายข้อ ครบ 31 ข้อ (จาก DB จริง)

สรุป: ✅ **แก้แล้ว 26** · ⚠️ **ยังซ้ำ 1 คู่ (2148 ↔ 2153, 2153 รออนุมัติ)** · ❌ **ไม่มีใน DB 3 (1085/1181/1151 — ไม่เคยถูก import)**

> **1679 เขียนใหม่แล้ว** 2 พ.ย. 2026 04:11 UTC (transaction เดียว, rowCount = 1) · backup: `docs/qa-backup-2026-11-02.json` · rollback: `docs/qa-rollback-2026-11-02.mjs`

### 3.1 Focus-Meaning (18)

| ID รายงาน | DB id | สถานะ | ค่าปัจจุบันใน DB |
|---|---|---|---|
| 765 | 1705 | ✅ | Q "What does the man mean by his FIRST comment?" · speaker เป็น **Man** แล้ว |
| 771 | 1607 | ✅ | Q "What does **Person B** mean?" · เฉลย C "I don't have very long to talk to you." |
| 776 | 1612 | ✅ | speaker **Brother** จริง · เฉลย B "You don't understand." |
| 790 | 1631 | ✅ | speaker **Son** · เฉลย A "I'll be nervous on stage tonight." (อีกข้อ 1648 ก็ถาม son — เสี่ยงซ้ำ ต้องจับตา) |
| 818 | 1663 | ✅ | เฉลย B "**He** needs a dentist to check **his** tooth" (เดิม She/her) |
| 833 | 1682 | ✅ | เฉลย D "Traffic is usually lighter on Mondays" (เดิม man's fault) |
| 835 | 1684 | ✅ | เฉลย C "**She** works on Saturday and Sunday" ตรงบทสนทนา |
| 837 | 1686 | ✅ | Q "What does the **man** mean?" · เฉลย C "I can give it to you." |
| 848 | 1700 | ✅ | Q "What does the **man** mean?" (ยังมี 1652 เวอร์ชันเก่า Q="Meaning?" — เสี่ยงซ้ำ) |
| 849 | 1701 | ✅ | เฉลย A "**He** likes many types of art" |
| 855 | 1704 | ✅ | speaker ที่สองเป็น **Man** (เดิม Daughter) · เฉลย C อ้าง "the man" ได้ |
| 863 | **1679 ↔ 1717** | ✅ แก้แล้ว (1679) | 1679 เขียนใหม่เป็นเรื่อง "เพื่อนไม่มาตามนัด" เฉลย A · 1717 คงเดิม (36 คำตอบ) → ไม่ซ้ำกันแล้ว |
| 868 | 1722 | ✅ | Q "What does the **man** mean?" · เฉลย A |
| 871 | 1725 | ✅ | เฉลย A "**She** knows the town well" |
| 873 | 1726 | ✅ | speaker สลับแล้ว (Woman ถาม "When would you like to fly?") · เฉลย A |
| 874 | 1727 | ✅ | Q ถาม woman · เฉลย C "**She** cannot eat any more chicken" |
| 825 | 1674 | ✅ | speaker Student/**Teacher** · เฉลย C "The teacher cannot make that decision." |
| 775 | 1611 | ✅ | speaker B = **Friend** · เฉลย B "I don't mind what I read." |

### 3.2 Focus-Form (7)

| ID รายงาน | DB id | สถานะ | ค่าปัจจุบันใน DB |
|---|---|---|---|
| 1085 | — | ❌ **ไม่มีใน DB** | ไม่เคยถูก import (ยืนยันจาก git log ของ csv_data/seed/migration) — **ไม่ต้องแก้** |
| 1178 | 2081 | ✅ | "she **can't help but** ___ creative." เฉลย A **be** (เดิม artistic→creative แต่สำนวน/เฉลยถูกแล้ว) |
| 1043 | 2148 | ⚠️ ยังซ้ำ (รอ 2153) | "how far is ___ **from the train station**?" เฉลย A it — จะแยกคู่เมื่อ 2153 ถูกเขียนใหม่ |
| 1111 | 2153 | ⏳ รออนุมัติร่าง | "How far is ___ **from my hotel to the museum**?" เฉลย A it · 43 คำตอบ/ถูก 38 |
| 1127 | 2106 | ✅ | "I **can't get** ___ how well she sings!" เฉลย C **over** |
| 1181 | — | ❌ **ไม่มีใน DB** | ไม่เคยถูก import — **ไม่ต้องแก้** |
| 1151 | — | ❌ **ไม่มีใน DB** | ไม่เคยถูก import — **ไม่ต้องแก้** |

### 3.3 Form-Meaning / Cloze (3) — เฉลยอยู่ใน `article.blanks`

| ID รายงาน | DB id | สถานะ | ค่าปัจจุบันใน DB |
|---|---|---|---|
| 1213 | 1982 "Cooking with Children" | ✅ | ข้อความ "break **{{8}}** egg into a bowl" (แก้ "eggs an" แล้ว) · blank 8 = **an** |
| 1215 | 1991 "Keeping Flies Away" | ✅ | "nobody knows exactly **{{6}}** this works" · blank 6 = **why** (ถูกไวยากรณ์) |
| 1217 | 1979 "A Lunch Invitation" | ✅ | "she will bake a cake **{{3}}** him" · blank 3 = **for** (ชื่อ Tim ถูกเอาออกแล้ว) |

> ข้อสังเกตข้อมูล (ไม่ใช่ข้อผิดในรายงาน): 1982 มีเลข blank `1,2,3,5,7,8,9,10` → **ขาด 4 และ 6** (2153/2148 ยังเป็นคู่ซ้ำ)

### 3.4 Listening (3)

| ID รายงาน | DB id | สถานะ | ค่าปัจจุบันใน DB |
|---|---|---|---|
| 1256 | 1256 | ✅ | Q ถาม **woman** · เฉลย A "who she will vote for" |
| 1259 | 1259 | ✅ | ตัวเลือก noisy/cheap/difficult/**expensive** · เฉลย D (เดิม B boring) |
| 1288 | 1288 | ✅ | คำอธิบายใช้ "**พูดคุย**" (typo "พูดคุม" หายแล้ว) |

## 4. ข้อซ้ำ 1679 ↔ 1717 — reference และร่างแก้

**Reference จริง**

| ตาราง | 1679 | 1717 |
|---|---:|---:|
| `test_set_questions` | 1 | 1 |
| `user_answers` | 34 | 36 |
| `test_explains` | 0 (ไม่มีบทความอ้าง) | 0 |

> `question_attempts` **ไม่มีใน DB นี้** (มี `test_attempts` แต่ไม่มีคอลัมน์ `question_id`) → นับคำตอบรายข้อจาก `user_answers` เท่านั้น

**เลือกเขียนใหม่ 1679** (reference น้อยกว่า: 34 < 36) หัวข้อเดิม B1 "เดาความหมายจากบทสนทนา" แต่ตัดบริบท "เพื่อนหายไป" ออกเพื่อไม่ทับ 1717
เฉลย/คำอธิบายของ 1679 ต้องแก้ตาม (คอลัมน์ `explanation` ในตาราง `questions` ไม่เกี่ยวกับ `test_explains` จึงไม่มีอะไรเพี้ยนตาม)

**ร่างใหม่ (ยังไม่เขียน DB):**

| ฟิลด์ | ค่าเสนอ |
|---|---|
| `conversation` | `[{"name":"Woman","text":"My friend said she'd meet me at the café, but she never turned up.","speaker":"A"},{"name":"Man","text":"She's probably just lost track of time — she was late for my birthday dinner too.","speaker":"B"}]` |
| `question_text` | What does the man mean? |
| `option_a` | The friend has a habit of being late. |
| `option_b` | The friend no longer wants to meet her. |
| `option_c` | He forgot about his own birthday dinner. |
| `option_d` | **—** (คงรูปแบบเดิมของกลุ่ม; ถ้าจะใช้ตัวเลือกจริงต้องอนุมัติเพราะเพื่อนข้ออื่นก็ใช้ "—") |
| `correct_answer` | A |
| `explanation` | ผู้ชายบอกว่าเพื่อนก็มาสายงานเลี้ยงวันเกิดของเขาเหมือนกัน จึงหมายความว่าเพื่อนคนนี้เป็นคนมาสายเป็นนิสัย ไม่ใช่เพราะเธอไม่อยากเจอ |
| `cefr_level` / `difficulty` | B1 / medium (คงเดิม) |

## 5. วลีที่ใช้ค้นแล้วไม่เจอ (ตรวจซ้ำได้)

| ID | วลีที่ลอง (normalized: ตัดเครื่องหมาย/ช่องว่าง, lower) |
|---|---|
| 1085 | — | ❌ **ไม่มีใน DB** | ไม่เคยถูก import (ยืนยันจาก git log ของ csv_data/seed/migration) — **ไม่ต้องแก้** |
| 1181 | — | ❌ **ไม่มีใน DB** | ไม่เคยถูก import — **ไม่ต้องแก้** |
| 1151 | — | ❌ **ไม่มีใน DB** | ไม่เคยถูก import — **ไม่ต้องแก้** |

ค้นทั้งตาราง `questions` ในทุกคอลัมน์ข้อความ (`question_text, option_a..d, explanation, conversation, transcript, article, tap_exercise, sub_topic_grammar`) + `test_explains(intro, sections, tip)`

## 6. ประวัติไฟล์ (เช็คว่าเป็นข้อที่ถูกลบ/เปลี่ยน id หรือไม่)

```
git log -- csv_data      → 4b1d5e9, 1963b9e, 056b165, 0663471
git ls-files | seed/mig  → scripts/seed-full-test-type.ts, seed-test-types.ts, seed-vocabularies.ts,
                           scripts/migrate-focus-form-conversation.ts, migrate-test-sets*.ts, apply-migration.ts
```
ไม่มี commit ใดลบข้อตาม ID ของรายงาน (ID พวกนี้ไม่เคยเป็น PK ใน DB) และไม่มีไฟล์ migration ที่ลบ `questions` ตาม id → **สรุปว่าข้อ 1085/1181/1151 ไม่เคยถูก import เข้า DB** (หรือถูกลบไปแล้วก่อนมี history ของ repo นี้)

## 7. ค้าง / ต้องอนุมัติ

1. เขียน 1679 ใหม่ตามร่างข้อ 4 (และตัดสินใจเรื่อง `option_d` = "—")
2. คู่ซ้ำ 2148 ↔ 2153 (อดีต 1043/1111) — เขียนใหม่ข้อหนึ่งหรือรวม
3. 1085 / 1181 / 1151 — ยืนยันกับ CSV ต้นฉบับว่าควรมีในระบบหรือไม่
4. เลข blank ของ 1982 ขาด 4 และ 6 — ตรวจกับต้นฉบับก่อนแก้
5. ข้อที่ 32 ของรายงาน — ยังไม่มีหลักฐาน

## 8. ผลการเขียน DB รอบนี้ (id 1679) — before / after

| ฟิลด์ | ก่อน | หลัง |
|---|---|---|
| question_text | What does the woman mean? | What does the man mean? |
| conversation | Woman: "...she up and left with her bag." / Man: "Don't worry..." | Woman: "My friend said she'd meet me at the café, but she never turned up." / Man: "She's probably just lost track of time — she was late for my birthday dinner too." |
| option_a | She doesn't know what to do with her friend's bag. | The friend has a habit of being late. |
| option_b | She won't go out with her friend anymore. | The friend no longer wants to meet her. |
| option_c | She can't explain her friend's behavior. | He forgot about his own birthday dinner. |
| option_d | — | — (คงเดิมตามที่อนุมัติ) |
| correct_answer | **C** | **A** |
| explanation | อธิบาย "I'm not sure what to make of it" | อธิบายว่าเพื่อนมาสายเป็นนิสัย |

**ผลต่อสถิติเดิม**: 1679 มี `user_answers` 34 แถว (ถูก 14) ซึ่งตอบตามโจทย์/เฉลยชุดเดิม — **ไม่ได้แก้ `user_answers`** ตามที่สั่ง ตัวเลขเหล่านั้นจึงยังนับเป็นการตอบของโจทย์เวอร์ชันเก่า
**ข้อสังเกต**: ใน Set 10 เพื่อนร่วมชุด (1669–1676) ใช้ `option_d` เป็นตัวเลือกจริงทุกข้อ ไม่ใช่ "—" → 1679 จึงยังไม่ตรง convention ของชุด ควรพิจารณาเติมตัวเลือกที่ 4 (รออนุมัติ)

### ตรวจซ้ำ (เฉพาะข้อที่แก้)
- `/tests/focus-meaning/10/explain` → **redirect ไปหน้าสอบ** เพราะ Set 10 ไม่มีเนื้อหา explain (`usesSetLevelExplain` = false) → หน้านี้ไม่แสดง question เลย
- `/tests/focus-meaning/10` → 200, render ได้ ไม่มี console error (หน้าแสดงข้อ 1 ของชุด)
- shape ของแถวที่แก้: `conversation` = array 2 เทิร์น, key = `name,speaker,text` (เหมือนเพื่อนร่วมชุด 1669/1670/1674/1675), ไม่มีคอลัมน์ว่างผิดรูป, ข้อความใหม่ไม่ซ้ำกับข้อใดใน DB
- `npx vitest run src/app/api/admin/test-explains src/app/api/test-sets src/app/tests` = 12 ไฟล์ / **72 passed**

## 9. ร่างใหม่ id 2153 (รออนุมัติ — ยังไม่เขียน)

ทดสอบ dummy `it` เป็นประธานสมมติ (อากาศ) คนละบริบทกับ 2148 (ระยะทาง):

| ฟิลด์ | ค่าเสนอ |
|---|---|
| question_text | Woman: Is ___ usually this cold in April? Man: No, it's unusually cold this week. |
| option_a / b / c / d | it / that / this / there |
| correct_answer | A |
| explanation | จากโจทย์: Is **it** usually this cold in April? ให้สังเกตว่า ประโยคถามเรื่องอากาศใช้ประธานสมมติ จึงต้องใช้ it — that/this/there ไม่ได้ในโครงสร้างนี้ |
| cefr_level / difficulty | A2 / medium (คงเดิม) |
