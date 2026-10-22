# Runbook: โหมด AI Tutor (AI ในหน้าทำข้อสอบ)

เอกสารนี้คือลำดับการขึ้น production ของฟีเจอร์ AI Tutor (ผู้เรียนถาม AI เกี่ยวกับข้อที่เพิ่งตอบ)
พร้อมวิธีปิดฉุกเฉินและวิธีย้อนกลับ

> ⚠️ ทุกค่าในเอกสารนี้เป็น **ค่าตัวอย่าง** — ห้ามใส่ secret จริง ห้ามใส่ชื่อ host จริง
> ค่า secret ต้องตั้งที่ Vercel Environment Variables เท่านั้น (ห้าม commit ลง git)

---

## 0. สรุปสั้น ๆ (ถ้าอ่านอย่างเดียวข้อเดียว)

1. ซ้อมบน Neon branch ใหม่ที่แตกจาก production
2. รัน migration 0045–0049 **ด้วยสคริปต์** (`scripts/apply-migration.ts`) — ห้ามพิมพ์ SQL เอง
3. สร้างคีย์ OpenRouter แยกสำหรับ AI Tutor + ตั้งเพดานเครดิต
4. merge/deploy โดย **ยังไม่ตั้ง** `AI_TUTOR_ENABLED`
5. ตั้ง env ทั้งหมดบน Production (รวม `AI_TUTOR_PROOF_SECRET` ค่าใหม่) แล้ว redeploy
6. ตั้ง `AI_TUTOR_ENABLED=true` → grant สิทธิ์เจ้าของระบบ → ทดสอบ → tester กลุ่มเล็ก → ขยาย

---

## 1. สิ่งที่ต้องทำด้วยมือ (เจ้าของระบบเท่านั้น)

| # | งาน | ที่ไหน | หมายเหตุ |
|---|---|---|---|
| 1 | สร้าง Neon branch ใหม่จาก production (ทดสอบ migration) | Neon Console → Branches | เก็บไว้เป็นจุด rollback |
| 2 | สร้างคีย์ OpenRouter **แยกสำหรับ AI Tutor** + ตั้ง **เพดานเครดิต/งบ** | openrouter.ai → Keys | แยกจากคีย์ของ Tap & Select เพื่อกันกันงบและติดตามแยก |
| 3 | รัน migration 0045–0049 บน production | สคริปต์ (ดูข้อ 2) | ห้ามพิมพ์ SQL เองใน SQL Editor |
| 4 | ตั้ง env บน Vercel Production | Vercel → Production → Environment Variables | ต้อง redeploy หลังแก้ env |
| 5 | ตั้ง `AI_TUTOR_ENABLED=true` + redeploy | Vercel | หลัง grant สิทธิ์คนแรกเท่านั้น |
| 6 | Grant สิทธิ์ผู้ใช้กลุ่มแรก | `npx tsx scripts/ai-tutor-access.ts grant <email>` | ผู้ใช้ที่มีสิทธิ์เท่านั้นที่เห็นกรอบ AI |
| 7 | ทดสอบจริง 1 บัญชี + เช็ค `/admin/ai-tutor` | เว็บ | ต้องไม่มีคำเตือนแดงว่า "AI Tutor ใช้งานไม่ได้" |

---

## 2. Migration 0045–0049 (ทำผ่านสคริปต์เท่านั้น)

### 2.1 ข้อสำคัญ

- **ห้ามพิมพ์ SQL เองใน Neon SQL Editor** — ถ้าพิมพ์เอง สคริปต์จะไม่รู้ว่าไฟล์นั้นรันแล้ว
  (hash ไม่ถูกบันทึก) → ครั้งหน้าที่สคริปต์รันจะพังเพราะ `already exists`
  (`0045` เป็นไฟล์เดียวที่ไม่มี `IF NOT EXISTS` — ไฟล์อื่นรันซ้ำได้)
- สคริปต์บันทึกแถวลง `drizzle.__drizzle_migrations` (hash + created_at) ในรูปแบบเดียวกับ drizzle-kit
  → ถ้าภายหลังมีคน commit journal แล้วรัน `npm run db:migrate` drizzle-kit จะข้ามไฟล์เหล่านี้เอง

### 2.2 เตรียมเครื่อง (ตั้งค่า host ที่ห้ามรัน)

บล็อกลิสต์ host ที่ห้ามรันอ่านจาก env (คั่นด้วย comma) — ตั้งในเครื่องของผู้ดูแล:

```powershell
# PowerShell (เครื่องผู้ดูแล)
$env:APPLY_MIGRATION_BLOCKED_HOSTS = "<host ของ production>,<host อื่นที่ห้ามแตะ>"
```

หรือในไฟล์ `.env.local` ของเครื่องนั้น (ห้าม commit):

```
APPLY_MIGRATION_BLOCKED_HOSTS=<host ของ production>,<host อื่น>
```

> ค่าเริ่มต้ม = บล็อกเสมอ (ถ้า host ตรงกับบล็อกลิสต์ สคริปต์จะปฏิเสธก่อนแตะ DB)
> ถ้าตั้งใจรันกับ production จริง ให้ใส่ `--allow-blocked-host` พร้อมกับ `--confirm-host <host>` ที่ตรงกัน
> (สคริปต์จะพิมพ์ชื่อ host ที่กำลังจะรันซ้ำอีกครั้งก่อนลงมือ)

### 2.3 รัน (บน branch ที่ซ้อมก่อนเสมอ)

```powershell
# 1) ดูแผนก่อน (dry-run — ไม่เขียนอะไรลง DB)
npx tsx scripts/apply-migration.ts --from 45

# 2) รันจริง (ต้องยืนยัน host)
npx tsx scripts/apply-migration.ts --from 45 --apply --confirm-host <host ของ branch ที่ซ้อม>

# 3) ถ้าเป็น production (ต้องมี --allow-blocked-host เพิ่ม)
npx tsx scripts/apply-migration.ts --from 45 --apply --allow-blocked-host --confirm-host <host ของ production>
```

ตัวเลือกอื่น: `--from <n>` (เริ่มจากเลข migration), `drizzle/00XX_xxx.sql` (ระบุไฟล์เฉพาะ)

### 2.4 ตรวจผลหลังรัน

```sql
-- ตาราง/คอลัมน์ของ AI Tutor ต้องมีครบ
SELECT count(*) FROM ai_tutor_messages;            -- 0 (ยังไม่มีข้อมูล)
SELECT ai_tutor_access FROM users LIMIT 1;          -- ต้องไม่ error
-- แถวของ migration ต้องถูกบันทึก (5 แถวสำหรับ 0045–0049)
SELECT count(*) FROM drizzle.__drizzle_migrations;
```

รันซ้ำอีกครั้งต้องขึ้นว่า "ข้าม (บันทึกไว้แล้ว)" ทุกไฟล์ ✓

---

## 3. Env บน Vercel (Production)

ตั้งที่ **Vercel → Production → Environment Variables** (ไม่ใช่ `NEXT_PUBLIC_*` เด็ดขาด —
ค่าเหล่านี้ถูกฝังใน bundle ฝั่งผู้ใช้และอ่านได้ทุกคน)

| ตัวแปร | ค่าตัวอย่าง | ต้องตั้ง | หมายเหตุ |
|---|---|---|---|
| `AI_TUTOR_ENABLED` | `true` | ✅ | master switch — **ปิดได้ทันทีทุกเมื่อ** |
| `AI_TUTOR_PROOF_SECRET` | `<ค่าสุ่มอย่างน้อย 32 ตัวอักษร>` | ✅ | สร้างใหม่ทุกครั้งที่ขึ้น prod · **ห้ามใช้ซ้ำกับค่าในเครื่อง local** · เปลี่ยนแล้ว proof เก่าหมดอายุ (ผู้เรียนต้องกดตรวจคำตอบใหม่) |
| `OPENROUTER_API_KEY` | `<คีย์เฉพาะ AI Tutor>` | ✅ | แยกจากคีย์ Tap & Select + ตั้งเพดานเครดิต |
| `AI_TUTOR_MODEL` | `minimax/minimax-m3.1-flash:free` | ✅ | เปลี่ยนผ่านหน้า admin ได้ภายหลัง |
| `AI_TUTOR_FALLBACK_MODEL` | `deepseek/deepseek-v4.1-flash` | ทางเลือก | ใช้เมื่อโมเดลหลักล้ม |
| `AI_TUTOR_REASONING_EFFORT` | `low` | ทางเลือก | minimax บังคับคิด (ปิดไม่ได้) |
| `AI_TUTOR_FALLBACK_REASONING_EFFORT` | `none` | ทางเลือก | ลด token/เวลา |
| `AI_TUTOR_QUESTION_QUOTA` | `5` | ทางเลือก | ต่อ (ผู้เรียน, ข้อ) ต่อวันไทย · ช่วง 1–10 |
| `AI_TUTOR_USER_DAILY_LIMIT` | `50` | ทางเลือก | ต่อผู้เรียนต่อวัน · ช่วง 1–100 (ต้อง ≥ โควตาต่อข้อ) |
| `AI_TUTOR_SYSTEM_DAILY_LIMIT` | `200` | ✅ ช่วงแรก | **เพดานรวมทั้งระบบต่อวัน** · ช่วง 1–20000 · เริ่มที่ 200 แล้วค่อยขยาย (ค่า 0 = ใช้ค่าเริ่มต้น 10,000 **ไม่ใช่** "ปิดระบบ") |
| `AI_TUTOR_MAX_TOKENS` | `1200` | ทางเลือก | ช่วง 200–2000 |
| `AI_TUTOR_TIMEOUT_MS` | `30000` | ทางเลือก | ช่วง 5000–30000 (ผูกกับ maxDuration ของ route) |
| `AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS` | `12000` | ทางเลือก | ช่วง 2000–30000 และต้อง ≤ timeout |
| `AI_TUTOR_ROLLOUT_PERCENT` | `0` → `10` → `50` → `100` | ทางเลือก | เปอร์เซ็นต์ผู้เรียนที่ได้ใช้ (สุ่มแบบคงที่) |
| `AI_TUTOR_EXPORT_SALT` | `<salt สำหรับ hash user_id>` | ทางเลือก | ต้องมีถ้าจะ export ข้อมูลวิเคราะห์ |

> หลังแก้ env ต้อง **Redeploy** — ค่า env ถูกอ่านตอนรัน ไม่ใช่ตอน build
> (ยกเว้นค่าที่ Next.js อ่านตอน build อย่าง `maxDuration` ซึ่งเป็นค่าคงที่ในโค้ด)

### Preview (optional)

ตั้งแค่ `AI_TUTOR_ENABLED=false` (หรือไม่ตั้งเลย) → PR ไหนก็ยิงโมเดลจริงไม่ได้

---

## 4. ลำดับการขึ้น production (เรียงตามลำดับ)

### ขั้นที่ 1 — ซ้อมบน Neon branch ใหม่จาก production
- Neon Console → Branches → สร้าง branch ใหม่จาก production
- ตั้ง `DATABASE_URL` ของเครื่องให้ชี้ branch ใหม่ → รันสคริปต์ migration (ข้อ 2)
- ทดสอบ flow จริงบน branch: login → ตอบข้อ → กดตรวจคำตอบ → ถาม AI → ได้คำตอบ

### ขั้นที่ 2 — เตรียมคีย์ OpenRouter เฉพาะ AI Tutor
- สร้างคีย์ใหม่ใน openrouter.ai (ไม่ใช้คีย์เดียวกับ Tap & Select)
- **ตั้งเพดานเครดิต/งบ** ให้กับคีย์นี้ (เพดานเครดิตคือ kill switch ที่ดีที่สุด)
- ใส่คีย์ลง Vercel Production ตอนขั้นที่ 4

### ขั้นที่ 3 — รัน migration 0045–0049 บน production
- ดูข้อ 2 (ผ่านสคริปต์เท่านั้น + `--allow-blocked-host --confirm-host`)
- ตรวจผลตามข้อ 2.4

### ขั้นที่ 4 — merge/deploy โดยยังไม่เปิดฟีเจอร์
- merge branch → `main` → deploy
- **ยังไม่ตั้ง** `AI_TUTOR_ENABLED` (หรือตั้งเป็น `false`) → ฟีเจอร์ปิดอยู่ ไม่มีใครเห็นกรอบ AI
- ตรวจว่าเว็บปกติ (หน้าสอบ/ตรวจคำตอบ) ยังทำงานปกติ

### ขั้นที่ 5 — ตั้ง env ทั้งหมดบน Production แล้ว redeploy
- ตั้งตามตารางข้อ 3 (รวม `AI_TUTOR_PROOF_SECRET` **ค่าใหม่** — ห้ามใช้ซ้ำกับ local)
- ยังตั้ง `AI_TUTOR_ENABLED=false` ไว้ก่อน → redeploy

### ขั้นที่ 6 — เปิดใช้งานจริง
- เปลี่ยน `AI_TUTOR_ENABLED=true` → redeploy
- grant สิทธิ์บัญชีเจ้าของระบบก่อน: `npx tsx scripts/ai-tutor-access.ts grant <email>`
- เปิด `/admin/ai-tutor` → ต้องไม่มีคำเตือนแดง "AI Tutor ใช้งานไม่ได้ในตอนนี้"
  (ถ้ามี = secret หรือคีย์ยังไม่ครบ)
- ทดสอบจริง 1 บัญชี: ตอบข้อ → กดตรวจคำตอบ → ถาม AI → ได้คำตอบ → กด 👍

### ขั้นที่ 7 — ขยายกลุ่มทดสอบ
- `AI_TUTOR_ROLLOUT_PERCENT` = 10 → 50 → 100 (คนเดิมได้กลุ่มเดิมเสมอ)
- หรือ grant ทีละบัญชี: `npx tsx scripts/ai-tutor-access.ts grant <email>`

---

## 5. วิธีปิดฉุกเฉิน (3 ชั้น เรียงจากเร็วที่สุด)

| ชั้น | วิธี | ผล | ใช้เวลา |
|---|---|---|---|
| 1 | หน้า `/admin/ai-tutor` → สวิตช์ "เปิดใช้งาน AI Tutor" = ปิด | ปิดทุกคน (แคช 30 วินาที) | ~30 วิ |
| 2 | Vercel → `AI_TUTOR_ENABLED=false` → Redeploy | ปิดทั้งระบบ | ~2–3 นาที |
| 3 | `AI_TUTOR_SYSTEM_DAILY_LIMIT=1` (ไม่ใช่ 0) → Redeploy | เหลือโควตารวมระบบ 1 ครั้ง/วัน | ~2–3 นาที |

> ❌ **`AI_TUTOR_SYSTEM_DAILY_LIMIT=0` ไม่ได้ปิดระบบ** — โค้ดแปลงค่าที่ ≤ 0 กลับเป็นค่าเริ่มต้น 10,000
> และขอบเขตต่ำสุดที่หน้า admin ยอมรับคือ 1
> วิธีปิดที่ถูกต้องคือ **สวิตช์ชั่วคราว** หรือ **`AI_TUTOR_ENABLED=false`**
>
> ทางเลือกที่ดีกว่าและทำงานทันทีโดยไม่ต้อง deploy = ตั้ง **เพดานเครดิตของคีย์ OpenRouter**
> (ถ้าเครดิตหมด ระบบจะได้ 402 และผู้เรียนเห็นข้อความ "ระบบ AI มีปัญหาชั่วคราว")

---

## 6. ย้อนกลับ

| สิ่งที่ย้อนกลับ | วิธี | หมายเหตุ |
|---|---|---|
| โค้ด | deploy เวอร์ชันก่อนหน้าใน Vercel | ตาราง `ai_tutor_*` ที่ยังอยู่ไม่กระทบโค้ดเก่า |
| ฟีเจอร์ | `AI_TUTOR_ENABLED=false` → redeploy | ปิดใช้งานทันที |
| สวิตช์ชั่วคราว | หน้า `/admin/ai-tutor` → เปิดกลับ | กลับมาได้เร็วที่สุด |
| ข้อมูล | `DROP TABLE ai_tutor_feedback, ai_tutor_messages, ai_tutor_settings, ai_tutor_admin_audit;` แล้วค่อย `ALTER TABLE users DROP COLUMN ai_tutor_access;` | ทุก migration เป็น "เพิ่มอย่างเดียว" → ย้อนกลับได้ด้วย DROP (แต่ข้อมูลคำถามหายถาวร) |

---

## 7. ข้อจำกัดที่รู้ (อ่านก่อนเปิดใช้จริง)

- **มีเฉพาะสาขา focus-form** — หน้าสอบสาขา `focus-meaning` และ `listening` ยังไม่ได้ส่ง prop
  ของ AI Tutor เลย (ยังไม่มีกรอบแชทในสองสาขานั้น) → ผู้เรียนจะเห็นบล็อก "แวะอ่านสักนิด" แบบเดิม
- **รหัสรอบ (attempt key) เก็บใน `sessionStorage`** — เปิดแท็บใหม่/ล้างข้อมูลเว็บ = ได้รอบใหม่ (เห็นเธรดว่าง)
  รีเฟรชในรอบเดิมยังเห็นบทสนทนาเดิม ✓ · กด "ทำซ้ำ" หรือส่งข้อสอบแล้ว = เริ่มรอบใหม่ (เธรดว่าง)
- **โควตานับต่อ (ผู้เรียน, ข้อ) ต่อวันตามเวลาไทย** — ไม่ผูกกับรอบ (เปลี่ยนรอบเพื่อเลี่ยงโควตาไม่ได้)
  และพบด้วยว่าค่าต่อรอบ/ต่อวันถูกบีบให้อยู่ในช่วงที่กำหนด ดูหน้า admin
- **ข้อความ/คำตอบของผู้เรียนถูกบันทึกไว้เพื่อวิเคราะห์** (ตาราง `ai_tutor_messages`)
  → ดูในหน้า admin ได้ที่ `/admin/ai-tutor` → แท็บ **“คำถามผู้เรียน”** (กรองช่วงเวลา/ประเภท/สถานะ/ข้อสอบ/คำค้นได้)
  · มีข้อความแจ้งผู้เรียนในหน้าแชท · export ใช้ hash user_id (`AI_TUTOR_EXPORT_SALT`)
  · ลบข้อมูลเก่าด้วย `npx tsx scripts/ai-tutor-retention.ts --apply --confirm-host <host>` (ค่าเริ่มต้ม = dry-run)
- **ระบบตั้งค่าไม่ครบ → ผู้เรียนถาม AI ไม่ได้** — ถ้าไม่ได้ตั้ง `AI_TUTOR_PROOF_SECRET`
  ข้อความจะเป็น "ระบบ AI Tutor ยังไม่ได้ตั้งค่าให้พร้อมใช้งาน" (ไม่ใช่โทษผู้เรียนว่าไม่ได้กดตรวจคำตอบ)
  ดูสถานะได้ที่ `/admin/ai-tutor`
- **รายละเอียดจาก OpenRouter ไม่ถูกส่งให้ผู้เรียน** — ผู้เรียนเห็นแค่ข้อความกลาง ๆ (เช่น "ระบบ AI ใช้เวลานานเกินไป")
  รายละเอียดอยู่ใน log ฝั่ง server เท่านั้น
- **หน้า `/dev/tutor-mock`** (หน้าตัวอย่าง UI) ตอบ 404 ใน production โดยอัตโนมัติ ✓

### 7.1 Redis ล่ม = เหลือเพดานจาก SQL อย่างเดียว (ไม่มี burst limit)

ตัวนับโควตาฝั่ง Redis (`src/lib/rate-limit.ts`) **fail-open** เมื่อ Redis ล่ม
(บรรทัด 43-47: คืน `limited: false` เมื่อต่อ Redis ไม่ได้) → เมื่อเกิดเหตุการณ์นี้:

| กลไก | ยังทำงานไหม | หมายเหตุ |
|---|---|---|
| rate limit ต่อนาที (10/นาที/คน) | **ไม่** | ใช้ Redis ตัวเดียวกัน → ยิงรวดได้ชั่วคราว |
| kill switch รวมทั้งระบบ/วัน | **ไม่** | ใช้ Redis ตัวเดียวกัน |
| เพดานต่อข้อ (question quota) | **ใช่** | SQL ใน `reserveQuestion` (บังคับด้วย advisory lock) |
| เพดานรายวันของผู้เรียน | **ใช่** | SQL ใน `reserveQuestion` (นับด้วย `countUserDailyQuestions`) |
| เพดานรวมทั้งระบบ/วัน | **ใช่** | SQL (`countSystemDailyQuestions`) + fail-closed ถ้านับไม่ได้ → ตอบ 503 |

→ **ต้นทุนรายวันยังถูกจำกัดอยู่** (เพดานจาก DB) แต่ **การกันยิงรวด (burst) หายไปชั่วคราว**
→ เกณฑ์การเทียบของเพดานรวมทั้งระบบ: `>=` และนับ **ก่อน** insert แถวของคำขอนั้น
  (ดู `src/app/api/ai-tutor/route.ts`) · การนับนี้ไม่อยู่ใต้ lock → คำขอที่มาพร้อมกัน K คำขอ
  อาจเกินเพดานได้มากสุด K-1 คำขอ (ในทางปฏิบัติไม่กี่คำขอ)

### 7.2 แถวที่ `question_id` เป็น NULL (หลัง migration 0050)

`drizzle/0050_ai_tutor_messages_question_set_null.sql` เปลี่ยน FK ของ
`ai_tutor_messages.question_id` เป็น `ON DELETE SET NULL` (+ คอลัมน์เป็น nullable)
→ **ลบข้อสอบแล้ว ข้อความ/คำตอบของผู้เรียนไม่หาย** (เดิม `ON DELETE CASCADE` = หายทั้งชุด)

- ข้อความที่เหลือ: นับโควตาได้ปกติ (นับจาก `role`/`status`/`created_at` ไม่กรอง `question_id`)
  → เพดานรายวัน/รวมทั้งระบบไม่เปลี่ยน
- ไม่โผล่ในเธรดของข้อสอบ (กรองด้วย `question_id = X` → NULL ไม่ match) และไม่กินโควตาของข้อนั้น
- **การลบด้วย retention ยังนับแถวพวกนี้** (นับจาก `created_at` เท่านั้น → รวมแถว `question_id IS NULL`)
  → ถ้าต้องการเก็บสถิติไว้นานกว่า 180 วัน ให้เพิ่ม `--days` (ขั้นต่ำ 30) ตอนรัน retention
- เทสที่พิสูจน์เรื่องนี้: `src/lib/ai-tutor/question-set-null.db.test.ts` และ
  `src/lib/ai-tutor/retention.test.ts` (เคส "แถวที่ question_id = NULL") — **ข้ามอัตโนมัติ
  จนกว่า migration 0050 จะถูกใช้กับฐานนั้น**

### 7.3 ขั้นตอนใช้ migration 0050 (ทำที่ฐานทดสอบก่อนเสมอ)

```powershell
# 1) ดูก่อนว่าจะรันอะไร (dry-run · ไม่แตะฐาน)
npx tsx scripts/apply-migration.ts --from 50

# 2) รันจริงที่ฐานทดสอบ (ต้องยืนยัน host ให้ตรงกับ DATABASE_URL)
npx tsx scripts/apply-migration.ts --from 50 --apply --confirm-host <host ของ DATABASE_URL>

# 3) รันเทสที่ต่อ DB (ต้องมี AI_TUTOR_TEST_DB_HOSTS ใน .env.local)
npm run test:db
```

- ค่าเริ่มต้นของ `apply-migration.ts` = **dry-run** (ต้องมี `--apply` + `--confirm-host`)
- ถ้าไฟล์ถูกแก้หลังจากที่รันไปแล้ว → hash เปลี่ยน → สคริปต์จะเตือนว่าไฟล์ถูกแก้ (ไม่รันซ้ำเงียบ ๆ)
- `drizzle/meta/_journal.json` อยู่ใน `.gitignore` → ไม่ต้องแก้ด้วยมือ (สคริปต์จัดการเอง)
- ใช้ `DO $$ … $$` หา constraint จาก `pg_constraint` ได้ ถ้าชื่อ constraint ในฐานไม่ตรงกับไฟล์

---

## 8. คำสั่งที่ใช้บ่อย

```powershell
# grant / revoke สิทธิ์ผู้ใช้ (ค่าเริ่มต้ม = dry-run → ต้องยืนยัน host ก่อนเขียนจริง)
npx tsx scripts/ai-tutor-access.ts grant <email>
npx tsx scripts/ai-tutor-access.ts grant <email> --apply --confirm-host <host ของ DATABASE_URL>
npx tsx scripts/ai-tutor-access.ts revoke <email> --apply --confirm-host <host ของ DATABASE_URL>

# รายงานสรุปการใช้งาน (ต้องมี DATABASE_URL · อ่านอย่างเดียว ไม่ต้องยืนยัน host)
npx tsx scripts/ai-tutor-report.ts [--days 30]

# export ข้อมูลเพื่อวิเคราะห์ (ต้องมี AI_TUTOR_EXPORT_SALT · อ่านอย่างเดียว)
npx tsx scripts/ai-tutor-export.ts --days 30

# ลบข้อมูลเก่า (ค่าเริ่มต้ม = dry-run ยังไม่ลบ · ต้องยืนยัน host)
npx tsx scripts/ai-tutor-retention.ts
npx tsx scripts/ai-tutor-retention.ts --apply --confirm-host <host ของ DATABASE_URL>
npx tsx scripts/ai-tutor-retention.ts --apply --blank --confirm-host <host ของ DATABASE_URL>  # เบลอ content ด้วย

# migration (ดูข้อ 2)
npx tsx scripts/apply-migration.ts --from 45
```
