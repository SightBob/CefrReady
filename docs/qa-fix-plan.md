# แผนแก้ข้อสอบจาก `qa-report.md` — ขั้นที่ 1 (อ่านอย่างเดียว)

> **สถานะ: ยังไม่มีการแก้ไขใด ๆ** — รอบนี้ใช้ `SELECT` เท่านั้น ไม่มีการเขียน DB และไม่เรียก `PUT /api/admin/questions/[id]`
> อัปเดตล่าสุด: 2 พ.ย. 2026 — เขียน DB แล้ว **2 แถว (id 1679, 2153)** ตามที่อนุมัติ (รอบ 2: เติม option_d ของ 1679 + เขียน 2153 ใหม่)

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

สรุป: ✅ **แก้แล้ว 28 ข้อ** · ❌ **ไม่มีใน DB 3 ข้อ (1085/1181/1151 — ไม่เคยถูก import)** · ข้อที่ 32 = ระบุไม่ได้ · คู่ซ้ำเดิม 1679↔1717 และ 2148↔2153 = **แก้แล้วทั้งคู่**

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
| 863 | **1679 ↔ 1717** | ✅ แก้แล้ว | 1679 เขียนใหม่ (เรื่องเพื่อนไม่มาตามนัด, เฉลย A, option_d เป็นตัวเลือกจริง) · 1717 คงเดิม → ไม่ซ้ำกันแล้ว |
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
| 1043 | 2148 | ✅ | "how far is ___ **from the train station**?" เฉลย A it — คงไว้เป็นข้อสอบระยะทาง |
| 1111 | 2153 | ✅ แก้แล้ว (รอบ 2) | เขียนใหม่เป็นประธานสมมติเรื่องอากาศ: "Is ___ usually this cold in April?" เฉลย A it · 43 คำตอบ/ถูก 38 |
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
| `option_d` | ~~—~~ → **"The friend lost her phone on the way."** (เติมในรอบ 2) |
| `correct_answer` | A |
| `explanation` | ผู้ชายบอกว่าเพื่อนก็มาสายงานเลี้ยงวันเกิดของเขาเหมือนกัน จึงหมายความว่าเพื่อนคนนี้เป็นคนมาสายเป็นนิสัย ไม่ใช่เพราะเธอไม่อยากเจอ |
| `cefr_level` / `difficulty` | B1 / medium (คงเดิม) |

## 5. วลีที่ใช้ค้นแล้วไม่เจอ (ตรวจซ้ำได้)

| ID | วลีที่ลอง (normalized: ตัดเครื่องหมาย/ช่องว่าง, lower) |
|---|---|
| 1085 | `atoytrachocolate` · `toytrachocolate` · `toytr` · `chocolate` · `a toy train` → ไม่พบ; ใกล้สุด 1586/2198 เป็นคนละข้อ |
| 1181 | `excitingthatway` · `s more exciting` · `moreexciting` · `exciting` → ไม่พบ (คำว่า exciting มีแค่ 1281 listening / 1688 focus-meaning) |
| 1151 | `soundslikeyoumightbe` · `mightbeacold` · `gettingacold` · `acold` · `could` → ไม่พบ (คำว่า cold มีแค่บทความ 1979 "bad cold" คนละบริบท) |

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
5. ข้อที่ 32 ของรายงาน — **ปิดเป็น "ตรวจไม่ได้" (2 พ.ย. 2026)**: ไม่มี `questions (2).csv` ต้นฉบับในโปรเจกต์ จึงยืนยันไม่ได้ว่าข้อนี้คือข้อใด (ไม่เดา)

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

## 9. ร่างใหม่ id 2153 — **อนุมัติและเขียนแล้ว (รอบ 2)**

ทดสอบ dummy `it` เป็นประธานสมมติ (อากาศ) คนละบริบทกับ 2148 (ระยะทาง) — เขียนลง DB แล้วตามร่างนี้:

| ฟิลด์ | ค่าเสนอ |
|---|---|
| question_text | Woman: Is ___ usually this cold in April? Man: No, it's unusually cold this week. |
| option_a / b / c / d | it / that / this / there |
| correct_answer | A |
| explanation | จากโจทย์: Is **it** usually this cold in April? ให้สังเกตว่า ประโยคถามเรื่องอากาศใช้ประธานสมมติ จึงต้องใช้ it — that/this/there ไม่ได้ในโครงสร้างนี้ |
| cefr_level / difficulty | A2 / medium (คงเดิม) |

## 10. รอบ 2 (2 พ.ย. 2026) — 2153 เขียนใหม่ + 1679 เติม option_d

Backup ก่อนเขียนรอบนี้: `docs/qa-backup-2026-11-02-round2.json` (ไฟล์ใหม่ ไม่ทับของรอบแรก)

### 10.1 id 2153 before / after

| ฟิลด์ | ก่อน | หลัง |
|---|---|---|
| question_text | Woman: How far is ___ from my hotel to the museum? Man: About fifteen minutes on foot. | Woman: Is ___ usually this cold in April? Man: No, it is unusually cold this week. |
| option_a | it | it |
| option_b | that | that |
| option_c | **there** | **this** |
| option_d | **this** | **there** |
| correct_answer | A | A (ไม่เปลี่ยน) |
| explanation | อธิบาย how far + it | อธิบายประธานสมมติ (อากาศ) + it |

⚠️ **ผลจากการสลับ C/D**: `user_answers` เดิมของ 2153 มี C = 2 แถว, D = 1 แถว (ทั้งสาม `is_correct = false`) → ค่าความถูกต้องไม่เปลี่ยน แต่ "คำตอบที่เคยเก็บว่า C/D" ตอนนี้ชี้ไปคนละตัวเลือก อ่านย้อนหลังต้องตีความตามเวอร์ชันโจทย์

### 10.2 id 1679 — เติม option_d

| ฟิลด์ | ก่อน | หลัง |
|---|---|---|
| option_d | "—" | "The friend lost her phone on the way." |
| correct_answer | A | A (ไม่เปลี่ยน) |

เหตุผล: เพื่อนร่วมชุด 1669–1677 ใช้ตัวเลือกจริงครบ 4 ข้อ (1678/1680 ยังเป็น "—" อยู่นอกขอบเขตที่อนุมัติ) และความยาว 39 ตัวอักษรใกล้เคียง A–C (40/45/42)

### 10.3 ผลต่อสถิติเดิม (รายงาน ไม่แก้)

| id | user_answers | ถูก (snapshot เดิม) | สถานะหลังแก้ |
|---|---:|---:|---|
| 1679 | 34 (A=16, B=3, C=14, D=1) | 14 | `is_correct` ยังเป็น snapshot ของโจทย์เก่า → 14 แถวที่ตอบ C ถูกนับว่า "ถูก" แม้เฉลยใหม่เป็น A และ 16 แถวที่ตอบ A ถูกนับว่า "ผิด" |
| 2153 | 43 (A=38, B=2, C=2, D=1) | 38 | เฉลยยัง A จึงไม่มีอะไรเปลี่ยน |

`/admin/reports` คำนวณ `correctAnswers / totalQuestions` จาก `user_answers.is_correct` ที่บันทึกไว้ตอนตอบ (ไม่ได้คำนวณสดจากเฉลยปัจจุบัน) → ตัวเลขของ 1679 จะยังแสดง 14/34 จนกว่าจะมีคำตอบใหม่ **ไม่ได้แก้ตามสั่ง**

### 10.4 ตรวจซ้ำรอบ 2
- SELECT เทียบร่าง: 1679 (A/B/C/D + ans A) และ 2153 (it/that/this/there + ans A) ตรงทุกฟิลด์
- `2148` ไม่ถูกแตะ (ข้อความ/เฉลยเดิม) · `questions` = **411 แถวเท่าเดิม** (ไม่มีการลบ)
- ข้อความ 2153 ใหม่ไม่ซ้ำกับข้อใดใน DB
- หน้า explain ของ Set 10 / Set 17 และหน้าสอบ: เปิดได้ 200 ไม่มี error
- ไม่ได้กดทำข้อสอบเพื่อไปให้ถึงข้อ 1679 (ลำดับที่ 11 ของ Set 10) หรือ 2153 (ลำดับที่ 6 ของ Set 17) เพราะการตอบในหน้าเว็บจะ**เขียน `test_attempts`/`user_answers` แถวใหม่** ซึ่งอยู่นอกขอบเขตที่อนุมัติ → สิ่งที่ยืนยันได้คือ "DB ตรงร่าง + หน้าโหลดได้" ไม่ใช่ "เห็นข้อเรนเดอร์บนจอ"
- `npx vitest run src/app/api/admin/test-explains src/app/api/test-sets src/app/tests` = 12 ไฟล์ / **72 passed** · `typecheck` exit 0 · `eslint` 0 error / 16 warning

## 11. สถิติรายข้อหลังแก้โจทย์ — migration 0051 apply แล้ว (2 พ.ย. 2026)

### 11.1 สิ่งที่ apply

| ขั้น | คำสั่ง | ผล |
|---|---|---|
| dry-run | `npx tsx scripts/apply-migration.ts drizzle/0051_question_stats_cutoff.sql` | เป้าหมาย `ep-lingering-dust-a1ibr0x7-pooler.ap-southeast-1.aws.neon.tech` · รอรัน 1 ไฟล์ (`d4893595ab77`) |
| apply | เดิม + `--apply --confirm-host <host>` | ✅ 1 statement: `ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "stats_cutoff_at" timestamp` |
| ตรวจ | `information_schema` + `count(*)` | คอลัมน์มีจริง · `questions` = **411 แถวเท่าเดิม** · cutoff NULL 411 แถวก่อนตั้งค่า |

### 11.2 ค่า cutoff ที่ตั้ง (ค่าคงที่ ไม่ผูกกับ updated_at)

| id | `stats_cutoff_at` | ที่มา |
|---|---|---|
| 1679 | `2026-11-02 11:19:14.023908` | เวลาแก้ครั้งสุดท้าย (รอบ 2: เติม option_d) — ตรงกับ `updated_at` |
| 2153 | `2026-11-02 11:19:13.868681` | เวลาเขียนใหม่ (รอบ 2) — ตรงกับ `updated_at` |

ยืนยันว่าเป็นเวลาจริง ไม่ได้เดา: DB timezone = **GMT** · `docs/qa-backup-2026-11-02-round2.json` มี `createdAt = 2026-11-02T11:19:13.058Z` (snapshot ก่อนเขียนรอบเดียวกัน) · commit `6945cc8` = `2026-11-02T18:21:15+07:00` (= 11:21 GMT) → ลำดับ snapshot → เขียน → commit ตรงกัน

### 11.3 ผลหลังตั้งค่า (SQL เดียวกับที่ route ใช้)

| id | คำตอบทั้งหมด | นับในสถิติ (`created_at >= coalesce(cutoff, '-infinity')`) | ถูก |
|---|---:|---:|---:|
| 1679 | 34 | **0** | 0 |
| 2153 | 44 | **1** (ตอบ D เมื่อ 11:51:08, `is_correct = false`) | 0 |

→ 1679 หายจาก "ข้อยากสุด/อัตราถูก" จนกว่าจะมีคนตอบเวอร์ชันใหม่ · 2153 นับเฉพาะคำตอบหลังแก้ 1 แถว
· ยังไม่ได้ตรวจหน้า `/admin/reports` และ `/admin` บนเบราว์เซอร์: ไม่มี dev server และไม่มี admin session (ห้ามสร้าง session/user) — ตรวจได้แค่ SQL ที่ route ใช้

### 11.4 วิธี rollback (ยังไม่รัน)

`docs/qa-rollback-stats-cutoff-2026-11-02.mjs`

1. `node --env-file=.env docs/qa-rollback-stats-cutoff-2026-11-02.mjs` → dry-run แสดงค่าปัจจุบัน
2. `... --apply` → `SET stats_cutoff_at = NULL` เฉพาะ 1679/2153 (transaction, `rowCount = 1` ต่อแถว, ต้องเหลือค่าไม่ใช่ NULL = 0)
3. `... --apply --drop-column --confirm-drop 0051` → `DROP COLUMN IF EXISTS` (ได้เฉพาะเมื่อไม่มีค่า cutoff ค้าง) + ต้อง rollback โค้ด commit `e30e8a6` ด้วย

## 12. รีวิวของ attempt เก่า (legacy) — ซ่อนข้อที่ถูกแก้หลังทำข้อสอบ (2 พ.ย. 2026)

**ปัญหา**: attempt ที่ทำก่อนมี `__review` (1679: 27/34, 2153: 13/44) ไม่มีสำเนาข้อความโจทย์ในตัว attempt → `/api/tests/attempts/[id]` จึงดึงโจทย์ปัจจุบันมาแสดงคู่กับ `user_answers.is_correct` ของเดิม ทำให้เห็น "ตอบ A + ✗ Incorrect + Correct: A" ในข้อเดียวกัน

**ที่แก้ (ไม่แตะ DB / `user_answers` / หน้าสอบ)**

| ไฟล์ | สิ่งที่ทำ |
|---|---|
| `src/lib/review-legacy.ts` (ใหม่) | `isQuestionChangedSinceAttempt(questionUpdatedAt, attemptCompletedAt)` — คืน true เมื่อ `questions.updated_at` ใหม่กว่าเวลาที่ผู้เรียนส่งคำตอบ |
| `src/lib/review-legacy.test.ts` (ใหม่) | 6 เคส: แก้ทีหลัง / แก้ก่อน / เวลาเท่ากัน / ค่า null / parse ไม่ได้ / Date object |
| `src/app/api/tests/attempts/[attemptId]/route.ts` | legacy item เพิ่มฟิลด์ `questionChanged` (attempt ที่มี `__review` เป็น false เสมอ) |
| `src/app/review/[attemptId]/page.tsx` | ถ้า `questionChanged` → การ์ดแจ้ง "ข้อนี้ถูกปรับปรุงหลังคุณทำข้อสอบ" + ผลที่บันทึกไว้ แทนการ์ดโจทย์ (ไม่แสดงตัวเลือก/เฉลยใหม่) |

**ผล**: attempt ใหม่ (มี `__review`) ไม่เปลี่ยนจุดใดเลย · attempt เก่าที่ข้อไม่ถูกแก้ยังแสดงรีวิวเต็มรูปแบบเหมือนเดิม · เฉพาะข้อที่ถูกแก้หลังทำข้อสอบเท่านั้นที่เห็นการ์ดแจ้ง โดยผลถูก/ผิดยังตรงกับที่บันทึกไว้ตอนนั้น

**ลบ dead code**: `src/components/HomeProgressClient.tsx` (untracked, ไม่ถูก import ที่ไหนใน repo — อ้างถึงเฉพาะใน `docs/superpowers/plans/2026-07-06-web-performance.md`) ถูกลบตามการตัดสินใจ; ไม่กระทบหน้าใดเพราะไม่เคยถูกใช้งาน

**ตรวจ**: typecheck exit 0 · eslint 0 error / 16 warning (เท่าเดิม) · vitest 1504 passed / 38 skipped (เพิ่ม 6 จาก `review-legacy.test.ts`) · build exit 0 — ยังไม่ได้ตรวจด้วยเบราว์เซอร์เพราะไม่มี dev server และไม่มี session ผู้ใช้/admin ให้ทดสอบ

## 15. เติม option_d ให้ focus-meaning ที่ยังว่าง 23 ข้อ (2 พ.ย. 2026)

**ที่มา**: หลังเขียนรอบ "—" 25 ข้อ พบว่ายังมี focus-meaning อีก **23 ข้อ** ที่ `option_d` เป็น NULL/ว่าง (การ์ดจึงแสดงแค่ 3 ตัวเลือก) — ทั้งหมด `active = true` และมีคำตอบสะสม 26–336 แถวต่อข้อ

id: 1452, 1577, 1615, 1616, 1617, 1618, 1641, 1642, 1643, 1665, 1666, 1667, 1689, 1690, 1711, 1712, 1731, 1732, 1997, 1998, 1999, 2000, 2001

**เครื่องมือ**: `docs/qa-apply-option-d-null-2026-11-02.mjs` (dry-run เป็นค่าเริ่มต้น)

| ขั้น | ผล |
|---|---|
| dry-run | ผ่านทุกแถว: เป็น focus-meaning, `option_d` ว่างจริง, `correct_answer` เป็น A–D, ร่างไม่ซ้ำกับ A/B/C |
| backup | `docs/qa-backup-option-d-null-2026-11-02.json` (before/after + `applied: true`) |
| เขียน | transaction เดียว · rowCount = **1 ทุกแถว** |
| ตรวจหลังเขียน | focus-meaning ที่ `option_d` ว่างเหลือ **0** · เติมครบ **23/23** · `stats_cutoff_at` ยัง **2 แถว** · `correct_answer` ไม่ถูกแก้ |

**ไม่ตั้ง cutoff** ด้วยเหตุผลเดียวกับหัวข้อ 14: เพิ่มตัวเลือกที่ 4 โดยไม่แตะเฉลย → คำตอบเก่ายังถูกต้องตามเดิม

**rollback**: `UPDATE questions SET option_d = NULL WHERE id IN (...)` เฉพาะ 23 id (ใช้ค่าเดิมจาก backup json)
## 14. เขียน option_d 25 ข้อ (2 พ.ย. 2026) — อนุมัติและเขียนแล้ว

**ขอบเขต**: focus-meaning B1 ที่ `option_d = '—'` ทั้ง 25 ข้อ (1678, 1680, 1681, 1683, 1684, 1685, 1686, 1691, 1692, 1693, 1694, 1696, 1697, 1698, 1699, 1700, 1704, 1705, 1706, 1714, 1716, 1718, 1719, 1721, 1722)

**เครื่องมือ**: `docs/qa-apply-option-d-2026-11-02.mjs` (dry-run เป็นค่าเริ่มต้น, `--apply` จึงเขียน)

| ขั้น | ผล |
|---|---|
| dry-run | ผ่านเงื่อนไขทั้ง 25 แถว: `option_d = '—'`, `correct_answer` เป็น A/B/C, ร่างไม่ซ้ำกับ A/B/C เดิม |
| backup | `docs/qa-backup-option-d-2026-11-02.json` (before/after ครบ 25 แถว + `applied: true` + `appliedAt`) |
| เขียน | transaction เดียว · UPDATE ทีละแถวด้วย `WHERE id = $ AND option_d = '—' AND correct_answer = $` → **rowCount = 1 ทุกแถว** |
| ตรวจหลังเขียน | `option_d = '—'` เหลือ **0 แถว** · เติมครบ **25/25** · `stats_cutoff_at` ยังมี **2 แถว (1679/2153) เท่าเดิม** · `correct_answer` ไม่ถูกแก้ |

**ไม่ตั้ง `stats_cutoff_at` ให้ 25 ข้อนี้ (ตั้งใจ)**: การเพิ่มตัวเลือกที่ 4 ไม่เปลี่ยนว่าเฉลยข้อใดถูก คำตอบเก่าจึงยังมีความหมายเดิม และผู้เรียนในอดีตไม่มีทางเลือกตัวเลือกที่ยังไม่มีอยู่ → ถ้าตั้ง cutoff จะทำให้สถิติของข้อเหล่านี้หายโดยไม่จำเป็น (ต่างจากกรณีแก้เฉลย/แก้โจทย์ของ 1679/2153)

**rollback**: ใช้ backup json — `UPDATE questions SET option_d = '—' WHERE id = ...` เฉพาะ 25 id (ไม่ลบแถว, ไม่แตะ `correct_answer`)
## 13. รอบที่ 3 (2 พ.ย. 2026) — cutoff อัตโนมัติ + journal + ร่าง option_d

### 13.1 `stats_cutoff_at` ตั้งอัตโนมัติเมื่อแอดมินแก้เนื้อหาที่กระทบการตรวจ

| ไฟล์ | สิ่งที่ทำ |
|---|---|
| `src/lib/question-stats.ts` | เพิ่ม `GRADING_CONTENT_FIELDS` + `hasGradingContentChanged(before, patch)` — เทียบ JSON แบบเรียงคีย์, ไม่นับการเปลี่ยนแค่ `status` ของ tapExercise |
| `src/app/api/admin/questions/[id]/route.ts` | อ่านแถวเดิมก่อนอัปเดต (404 ถ้าไม่พบ) แล้วถ้าเนื้อหา/เฉลยเปลี่ยนจริง → `statsCutoffAt = new Date()` |
| `src/lib/question-stats.test.ts` | เพิ่ม 6 เคสของ helper (เฉลยเปลี่ยน/ตัวเลือกเปลี่ยน/ค่าเดิม/ฟิลด์ที่ไม่กระทบ/status tapExercise/ลำดับคีย์) |
| `src/app/api/admin/questions/[id]/route.test.ts` | mock `select` + 4 เคส: เฉลยเปลี่ยน → ตั้ง cutoff, บันทึกซ้ำ → ไม่ตั้ง, แก้แค่ active → ไม่ตั้ง, ไม่พบข้อ → 404 |

ผล: ต่อจากนี้ไม่ต้องตั้ง cutoff มืออีก — แต่ **กดบันทึกซ้ำโดยไม่เปลี่ยนเนื้อหาจะไม่รีเซ็ตสถิติ** (กันตัวเลขหายโดยไม่ตั้งใจ)

### 13.2 journal ของ drizzle ถูก track แล้ว

`.gitignore` เปลี่ยนจาก `drizzle/meta/` เป็น `drizzle/meta/*` + `!drizzle/meta/_journal.json` → เครื่องอื่น/pipeline เห็น`_journal.json` และใช้ `db:migrate` ได้ตามปกติ (ยังไม่ commit snapshot ของ drizzle-kit)

### 13.3 ร่าง `option_d` 25 ข้อ — รออนุมัติ

`docs/qa-option-d-drafts.md` มีข้อเสนอตัวเลือกที่ 4 ครบทั้ง 25 ข้อ (focus-meaning B1 ที่ยังเป็น "—") พร้อมเหตุผลที่ลวงได้และเงื่อนไขก่อนเขียน DB · **ยังไม่มีการเขียน DB ในรอบนี้**

### 13.4 เรื่องที่ยังปิดไม่ได้

- **ตรวจหน้าจอ `/admin/reports`, `/admin`, `/review`**: ล็อกอินมีทางเดียวคือ Google OAuth (ทดสอบด้วย agent-browser แล้ว: `/admin/reports` → `/login?callbackUrl=...`, `/review/11557` → `/`, API คืน 401/403) และบัญชีแอดมินไม่มี attempt ของ 1679/2153 (40 แถว legacy เป็นของผู้ใช้ 14 คน) → ต้องมี session ของเจ้าของ attempt หรือเขียน component test แทน
- **C2 (performance audit)**: สถานะใน `docs/PERFORMANCE-AUDIT-2026-10-04.md` คือ "ตัดสินใจไม่ทำ" (ไม่แตะ CSP nonce) — ไม่มีอะไรต้องทำต่อ นอกจาก การคงสถานะไว้
- **P2 (performance รอบ 2: H3 Header เลิก fetch session + M4 รวม cache key)**: กระทบ поведение การแสดงสถานะล็อกอินทั้งเว็บ ไม่ใช่ขอบเขต QA รอบนี้ → ต้องอนุมัติแยก

## 16. คำถามไม่ตรงกับผู้พูด + ใบ้การนำทาง (2 พ.ย. 2026)

### 16.1 ปัญหา

ข้อ focus-meaning ที่คำถามถามถึง "the man" แต่บทสนทนาติดป้ายผู้พูดว่า `Person B` และชื่อผู้พูดสลับกับบทบาทจริง ทำให้ผู้เรียนตอบตามคำถามถูกแต่เฉลยชี้ไปอีกคน

ตรวจครบ 6 ข้อที่ตั้งธงไว้:

| ข้อ | ผลตรวจ | การแก้ |
|---|---|---|
| 1718 | A:Man ถามเรื่องรายการที่ตัวเองไปออกรายการ แต่ประโยคเสียดาย (If I had known…) เป็นของ B | สลับชื่อ: A=Woman, B=Man |
| 1714 | คนที่ไม่มีนาฬิกาคือ B แต่คำถามถามถึง man + ตัวเลือก A–C เป็นบุคคลที่หนึ่ง | A=Woman, B=Man; ตัวเลือก A–C เปลี่ยนเป็น "He …" |
| 1719 | คนที่จ้างมืออาชีพมาปลูก (had it done professionally) คือ B | A=Woman, B=Man |
| 1705 | คำถามถามถึง man ถูกต้องแล้ว แต่ชื่อผู้พูด B เป็น `Person B` | B=Woman (แก้เฉพาะชื่อ) |
| 1704 | Mother พูดประโยคแรก ตรงกับ "the woman" | ไม่ต้องแก้ |
| 1716 | Woman ถามว่า "What was up?" ตรงกับตัวเลือก | ไม่ต้องแก้ |

### 16.2 สิ่งที่ไม่แตะ

- **ไม่แตะ `correct_answer`** ของทั้ง 4 ข้อ (1718=A, 1714=C, 1719=A, 1705=A) และไม่แตะ `user_answers`
- **ไม่ตั้ง `stats_cutoff_at`** เพราะ key ของคำตอบที่ถูกไม่เปลี่ยน — สถิติเดิมยังนับได้ (เหมือนกรณีเติม `option_d`)
- แก้เฉพาะ `conversation[].name` และถ้อยคำตัวเลือกลวงของ 1714 (A–C) ให้เป็นบุคคลที่สามเท่านั้น

### 16.3 ไฟล์

- `docs/qa-apply-speaker-fix-2026-11-02.mjs` — dry-run เป็นค่าเริ่มต้น, `--apply` เขียนจริง + backup
- `docs/qa-backup-speaker-fix-2026-11-02.json` — ค่าก่อนแก้ของ 4 ข้อ
- ผล apply: rowCount 1 ทุกข้อ (รวม 4) ตรวจซ้ำแล้วได้ `1705 A:Man B:Woman A:Man`, `1714 A:Woman B:Man`, `1718 A:Woman B:Man`, `1719 A:Woman B:Man`

### 16.4 ใบ้การนำทางในหน้าสอบ (`TestLayout`)

ปุ่มเดียวเปลี่ยนชื่อตามสถานะ (ตรวจคำตอบ → ข้อต่อไป) ทำให้ผู้เรียนใหม่คิดว่าปุ่ม "ข้อต่อไป" กดได้ทั้งที่ยังไม่ตรวจ

- เพิ่มบรรทัดใบ้ใต้ปุ่ม เฉพาะตอน `primaryAction.label === 'ตรวจคำตอบ'`: ยังไม่เลือก → "เลือกคำตอบก่อน แล้วกด “ตรวจคำตอบ”", เลือกแล้ว → "กด “ตรวจคำตอบ” เพื่อดูเฉลย แล้วไปข้อถัดไป"
- ปุ่มถูกห่อด้วย `flex-col` ความกว้างคงเดิม (`w-full` บนจอเล็ก, `w-[13.5rem]` ที่ ≥890px) — ปุ่มและตำแหน่งไม่เปลี่ยน
- test ใหม่ใน `TestLayout.test.tsx`: ตรวจทั้งสองสถานะและตรวจว่าใบ้หายหลังตรวจแล้ว (10 tests passed)

### 16.5 การทดสอบส่งข้อสอบจนจบ (Set 5, 22 ข้อ)

- attempt 12462: completed, 22/22 ข้อ, 2/22 (9.09%), ระดับ A1 — `user_answers` 22 แถว (สร้างใหม่โดยระบบ)
- `/review/12462` แสดงครบ 22 ข้อ มีตัวเลือก 4 ตัว และ **ไม่มีการ์ด "ข้อนี้ถูกปรับปรุง"** (ถูกต้องสำหรับ attempt ใหม่)
- `/progress` แสดงรายการใหม่ "Focus on Meaning 9.09% A1"
- หมายเหตุ: ปุ่มหลักอยู่ในแถบล่างนอก `<main>` — automation ต้องเลือกจาก `document` ไม่ใช่ `main button`
