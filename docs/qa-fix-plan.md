# แผนแก้ข้อสอบจาก `qa-report.md` — ขั้นที่ 1 (อ่านอย่างเดียว)

> **สถานะ: ยังไม่มีการแก้ไขใด ๆ** — รอบนี้อ่าน DB ด้วย `SELECT` เท่านั้น ไม่มีการเขียน DB
> และไม่มีการเรียก `PUT /api/admin/questions/[id]`
> อัปเดตล่าสุด: 2 พ.ย. 2026 (DB ต่อได้แล้ว)

## 0. การเข้าถึง DB

| รอบ | ผล |
|---|---|
| รอบแรก (1 พ.ย.) | ❌ Neon MCP `ENOTFOUND mcp.neon.tech` · `pg` `EAI_AGAIN` |
| รอบนี้ (2 พ.ย.) | ✅ ต่อผ่าน `pg` + `DATABASE_URL` ได้ (Neon `ap-southeast-1`) — ใช้ `SELECT` เท่านั้น |

ขนาดข้อมูลจริง: `questions` = **411 แถว** (focus-meaning 196 · focus-form 158 · listening 36 · form-meaning 21) · `test_explains` = 25 แถว

## 1. ปัญหาใหญ่ที่เจอ: ID ในรายงานไม่ใช่ ID ใน DB

ID ใน `qa-report.md` มาจากไฟล์ CSV (`questions (2).csv` ซึ่ง**ไม่มีอยู่ในรีโป**) ไม่ใช่ primary key ของตาราง `questions`
หลักฐาน: ส่ง 31 ID จากรายงานเข้า DB ตรง ๆ พบเพียง **3 ID** ที่มีจริง (1256, 1259, 1288 — กลุ่ม Listening ทั้งหมด) อีก 28 ID ไม่มีในตาราง
→ การแก้ข้อต้อง **map ด้วยข้อความโจทย์/บทสนทนา** ไม่ใช่ด้วย ID

## 2. Reconcile ตัวเลขในรายงาน

| รายการ | รายงานไว้ | นับจากเนื้อไฟล์ | หลังแก้หัวไฟล์ |
|---|---:|---:|---:|
| ข้อมีปัญหา | 32 | **31** | 31 |
| บล็อก `**ข้อที่:**` | — | 30 (บล็อก `1043 และ 1111` รวม 2 ID) | — |
| สูง / กลาง / ต่ำ | 22 / 7 / 3 | **20 / 9 / 2** | 20 / 9 / 2 |
| ข้อปกติ | 285 | 286 | 286 |

- ไม่มี ID ซ้ำ, ไม่มีบล็อกไหนขาด ID, ทั้ง 31 ID อยู่ในตาราง Top 30
- **ข้อที่ 32 ระบุไม่ได้** — ไม่มีบล็อกในไฟล์ และ CSV ต้นฉบับไม่มีในรีโป (ใน `csv_data/` เป็นไฟล์ชุดอื่น: formatted-questions 120 แถว, formatted-listening 37 แถว ฯลฯ)
- ตัวเลขหัว `qa-report.md` ถูกแก้ให้ตรงกับเนื้อไฟล์แล้ว (31 = 20/9/2)

## 3. ผลตรวจกับ DB จริง (SELECT เท่านั้น)

สรุป: **แก้ไปแล้ว 20 ข้อ · ยังไม่แก้ 1 ข้อ · หาไม่เจอใน DB 10 ข้อ**

### 3.1 กลุ่ม A — Focus-Meaning (แก้แล้ว 17 / ค้าง 1)

| ID รายงาน | DB id | สถานะ | ค่าปัจจุบันใน DB (ย่อ) |
|---|---|---|---|
| 765 | 1705 | ✅ แก้แล้ว | Q "What does the man mean by his FIRST comment?" — บทสนทนามี speaker ชื่อ **Man** แล้ว (เดิม Girl/Woman) |
| 771 | 1607 | ✅ แก้แล้ว | Q เปลี่ยนเป็น "What does **Person B** mean?" |
| 776 | 1612 | ✅ แก้แล้ว | speaker ในบทสนทนาเป็น **Brother** จริง (Q ยังถาม brother ได้) |
| 790 | 1631 | ✅ แก้แล้ว | speaker เป็น **Son** (อีกข้อ 1648 ก็เป็น Son เช่นกัน) |
| 818 | 1663 | ✅ แก้แล้ว | เฉลย B = "**He** needs a dentist to check **his** tooth" (เดิม She/her) |
| 833 | 1682 | ✅ แก้แล้ว | เฉลย D = "Traffic is usually lighter on Mondays" (เดิม "man's fault") |
| 835 | 1684 | ✅ แก้แล้ว | Q ถาม woman และเฉลย C = "**She** works on Saturday and Sunday" ตรงกับบทสนทนา |
| 837 | 1686 | ✅ แก้แล้ว | Q เปลี่ยนเป็น "What does the **man** mean?" |
| 848 | 1700 | ✅ แก้แล้ว | Q เปลี่ยนเป็น "What does the **man** mean?" (ยังมีอีกข้อ 1652 ที่เป็นเวอร์ชันเก่า Q = "Meaning?" — ควรพิจารณารวม) |
| 849 | 1701 | ✅ แก้แล้ว | เฉลย A = "**He** likes many types of art" |
| 855 | 1704 | ✅ แก้แล้ว | speaker ที่สองถูกเปลี่ยนเป็น **Man** แล้ว (เดิม Daughter) — Q ถาม woman (Mother) และเฉลย C อ้าง "the man" ได้ |
| 863 | 1679 | ❌ **ยังไม่แก้** | ยังมีสองข้อบทสนทนาเดียวกัน: 1679 และ 1717 ("…she up and left with her bag…") — ซ้ำกันจริง |
| 868 | 1722 | ✅ แก้แล้ว | Q เปลี่ยนเป็น "What does the **man** mean?" |
| 871 | 1725 | ✅ แก้แล้ว | เฉลย A = "**She** knows the town well" |
| 873 | 1726 | ✅ แก้แล้ว | speaker สลับแล้ว (Woman เป็นคนถาม "When would you like to fly?") เฉลย A ตรง |
| 874 | 1727 | ✅ แก้แล้ว | Q ถาม woman และเฉลย C = "**She** cannot eat any more chicken" ตรงกับบทสนทนา |
| 825 | 1674 | ✅ แก้แล้ว | speaker เปลี่ยนเป็น Student/**Teacher** และเฉลย C = "The teacher cannot make that decision" |
| 775 | 1611 | ✅ แก้แล้ว | speaker B เปลี่ยนเป็น **Friend** |

### 3.2 กลุ่ม B — Focus-Form (หาไม่เจอทั้งกลุ่ม, 7 ข้อ)

| ID รายงาน | สถานะ | หมายเหตุ |
|---|---|---|
| 1085 | ⚠️ หาไม่เจอ | ไม่มีข้อความ "A toy train … chocolate" ใน DB (0 match) |
| 1178 | ⚠️ หาไม่เจอ | ไม่มี "can't help but … artistic" (ข้อ 2081 ที่ match "help but" เป็นโจทย์อื่น) |
| 1043 / 1111 | ⚠️ หาไม่เจอ | ไม่มี "How far is … to the bus stop?" (0 match) |
| 1127 | ⚠️ หาไม่เจอ | ไม่มี "can't get … how focused her students are" |
| 1181 | ⚠️ หาไม่เจอ | ไม่มี "… exciting that way." |
| 1151 | ⚠️ หาไม่เจอ | ไม่มี "… might be ___ a cold." |

แปลว่าไม่ใช่ "แก้แล้ว" — ข้อเหล่านี้อาจยังไม่ถูก import เข้า DB, ถูกลบไปแล้ว หรือถูกเขียนใหม่จนข้อความเปลี่ยน ต้องเทียบกับ CSV ต้นฉบับก่อนสรุป

### 3.3 กลุ่ม C — Form-Meaning / Cloze (หาไม่เจอ, 3 ข้อ)

`test_explains` มี 25 แถว (คอลัมน์ `sections` เป็น JSON) แต่ค้นข้อความ "break eggs", "nobody knows exactly", "bake a cake" **ไม่พบเลย** → 1213/1215/1217 ยังไม่ยืนยันได้ว่าอยู่ในระบบ

### 3.4 กลุ่ม D — Listening (แก้แล้ว 3)

| ID รายงาน | DB id | สถานะ | ค่าปัจจุบันใน DB |
|---|---|---|---|
| 1256 | 1256 | ✅ แก้แล้ว | Q = "What does the **woman** say she's unsure about?" เฉลย A "who she will vote for" |
| 1259 | 1259 | ✅ แก้แล้ว | ตัวเลือกเป็น noisy/cheap/difficult/**expensive** เฉลย D (เดิม B "boring") |
| 1288 | 1288 | ✅ แก้แล้ว | คำอธิบายใช้ "**พูดคุย**" แล้ว (typo "พูดคุม" หายไป) |

## 4. ข้อซ้ำ — ข้อเสนอ (อิงข้อมูลจริง)

| คู่ | สถานะใน DB | ข้อเสนอ |
|---|---|---|
| 1043 / 1111 | ไม่มีใน DB (0 match) | ไม่ต้องทำอะไรจนกว่าจะ import ข้อความชุดนั้นเข้ามา |
| 863 ↔ 830 | มีจริงเป็น **1679 ↔ 1717** (บทสนทนาเดียวกัน) | เขียน 1679 ใหม่หรือรวมเป็นข้อเดียว — **ห้ามลบก่อนเช็ค** (ดู SQL 5.2) |

**Reference ของข้อที่แตะได้จริง** (จาก `test_set_questions` + `user_answers`):

| question_id | ชุดข้อสอบอ้างถึง | คำตอบของผู้เรียน |
|---|---:|---:|
| 1256 | 1 | 1,166 |
| 1259 | 1 | 1,160 |
| 1288 | 1 | 166 |

→ ทั้งสามข้อ **ลบไม่ได้** (มีประวัติผู้เรียนจำนวนมาก) แต่ทั้งสามข้อถูกแก้จนถูกต้องแล้ว จึงไม่ต้องทำอะไร

## 5. SQL อ่านอย่างเดียวที่ใช้ตรวจ (รันซ้ำได้)

```sql
-- 5.1 ดูข้อตาม id ใน DB
SELECT id, test_type_id, question_text, option_a, option_b, option_c, option_d,
       correct_answer, explanation, conversation
FROM questions WHERE id = ANY($1::int[]) ORDER BY id;

-- 5.2 เช็คก่อนลบข้อซ้ำ (1679/1717)
SELECT 'test_set_questions' t, question_id, count(*) FROM test_set_questions
  WHERE question_id IN (1679,1717) GROUP BY 2
UNION ALL
SELECT 'user_answers', question_id, count(*) FROM user_answers
  WHERE question_id IN (1679,1717) GROUP BY 2;

-- 5.3 หาข้อด้วยข้อความ (เพราะ ID ในรายงานเป็นเลข CSV)
SELECT id, left(question_text,80), correct_answer FROM questions
WHERE question_text ILIKE '%<ข้อความโจทย์>%' OR conversation::text ILIKE '%<บทสนทนา>%';
```

## 6. ค้าง / ต้องขออนุมัติ

1. **ข้อที่ 32** — ต้องได้ไฟล์ CSV ต้นฉบับ (`questions (2).csv`) มาหา ID ที่หาย
2. **กลุ่ม B (6 ข้อ) และ C (3 ข้อ)** — ต้องยืนยันว่าอยู่ในระบบหรือไม่ ก่อนแก้
3. **1679/1717** — อนุมัติให้เขียนใหม่/รวมข้อ (ยังไม่แตะ)
4. **ยังไม่มีการเขียน DB** และไม่มีการเรียก admin API ใด ๆ ในทุกรอบ
