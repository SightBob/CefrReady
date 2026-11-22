# Cloudflare migration — สถานะ / สิ่งที่เจอ / แผนที่เหลือ

อัปเดต: 22 พ.ย. 2026 · branch `feat/cloudflare-workers`

## สถานะ production

| ของ | ค่า |
|---|---|
| โฮสต์ | Cloudflare Workers (OpenNext) — `server: cloudflare`, `x-opennext: 1` |
| Worker | `cefr-ready-staging` (ชื่อเดิม ไม่เปลี่ยนแล้ว — ผูก custom domain อยู่) |
| โดเมน | `cefr-ready.site`, `www.cefr-ready.site` |
| Deploy | `npm run cf:build` แล้ว `npm run cf:deploy` (manual, จาก worktree) |
| DB | Neon serverless — HTTP driver + WebSocket pool เฉพาะ transaction |
| Cron | `0 3 * * *` UTC → `/api/cron/ai-tutor-retention` (ผ่าน `scheduled` ใน `worker.mjs`) |

ตรวจสด: `https://cefr-ready.site/api/health` = 200

## ทำแล้ว

- **P0 image optimization**: Cloudflare ไม่มี `IMAGES` binding → `/_next/image` ส่งไฟล์ต้นฉบับทั้งดุ้น
  - `bg-main1` 11,255KB → 312KB (webp q95 @2880), `bg-mobile` 2,158KB → 261KB
  - otter/illustration 9 ใบ → lossless webp (พิกเซลเหมือน PNG ทุกจุดที่มองเห็น)
  - `verb-icon` 552KB → 6KB (แสดงที่ 24px, ย่อเป็น 96px)
- **P0 cron**: worker ที่ OpenNext generate ไม่มี `scheduled` → เพิ่ม `worker.mjs` เป็น entry override + `triggers.crons`
- **CRON_SECRET** ตั้งบน worker แล้ว (dry-run ค่าเริ่มต้น)

## ข้อจำกัดที่ต้องรู้ (ยังไม่แก้)

- **retention ยัง dry-run** — ไม่ลบข้อมูลจนกว่าจะตั้ง `AI_TUTOR_RETENTION_APPLY=true` (การลบถาวร ต้องมีคนอนุมัติ)
- **ไม่มี incremental cache** (`defineCloudflareConfig({})`) → `unstable_cache`, ISR, `revalidateTag`, sitemap `revalidate` ไม่แคชจริง
- **static asset** `/_next/static/*` ส่ง `cache-control: public, must-revalidate, max-age=0` → browser revalidate ทุกครั้ง (มี ETag)
- **ไม่มี error monitoring** — Sentry ถอดออกทั้งระบบตอนย้าย (ใช้ไม่ได้บน Workers); เหลือ Workers Logs
- **HTML แคชไม่ได้** — ทุก response มี `Set-Cookie` CSRF จาก NextAuth
- **`main` ยังไม่มีงาน Cloudflare** (ขาดทุก commit ของ branch นี้)

## หนี้ที่ยังค้าง (เรียงตามความสำคัญ)

1. privacy policy ผิด: ยังเขียน Vercel เป็นผู้โฮสต์ + Vercel Analytics/Google Analytics ที่ถอดแล้ว (`src/app/privacy/page.tsx`)
2. merge `feat/cloudflare-workers` → `main` (เช็คก่อนว่ามี Workers Builds ผูก main หรือไม่)
3. เปิด incremental cache (R2 bucket + `NEXT_INC_CACHE_R2_BUCKET` + `withRegionalCache`)
4. static asset cache (Cache Rule / `_headers` สำหรับ `/_next/static/*`)
5. CI: เพิ่ม `opennextjs-cloudflare build` + `wrangler deploy --dry-run` (ตอนนี้ CI รัน `next build` เท่านั้น)
6. error monitoring ตัวใหม่
7. `void logAiUsage()` ใน `src/app/api/tests/tap-reason/route.ts` → `await` (Workers ตัด promise หลัง response)
8. ทดสอบอัปโหลด R2 (`@aws-sdk/client-s3` บน Workers) 1 ครั้งจากหน้า admin
9. เก็บกวาด: `vercel.json`, `railway.json`, `.vercel/`, CSP `va.vercel-scripts.com`, เอกสาร `CLAUDE.md`/`PROJECT.md`, `pg` → devDependencies

## จงใจไม่ทำ

- เปลี่ยนชื่อ worker `cefr-ready-staging` (ต้องย้าย custom domain เสี่ยง downtime)
- แคช HTML หน้า public (ต้องแก้ auth/CSRF ก่อน)
- `withTransaction` เปิด WebSocket ใหม่ทุกครั้ง — ถูกต้องแล้ว ช้าแต่รอตัวเลข latency จริงก่อน

## ข้อควรระวัง

- **ห้ามแตะ maintenance mode** (`maintenance:mode` ใน Upstash, `POST /api/admin/maintenance`, `src/proxy.ts`, `src/lib/maintenance.ts`) เว้นแต่ผู้ใช้สั่งชัดเจน
- งานทั้งหมดอยู่บน branch `feat/cloudflare-workers` — `feat/payment-checkout` เป็นงานคนละเรื่อง (ยังไม่ทำต่อ) ห้าม merge ปนกัน
