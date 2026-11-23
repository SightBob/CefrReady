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
- **privacy policy** ตรงความจริง: โฮสต์ Cloudflare, ตัด GA/Vercel Analytics/Sentry, ระบุ AI Tutor retention ว่า dry-run
- **static asset cache**: `public/_headers` → `/_next/static/*` เป็น `public, max-age=31536000, immutable`
  (Cloudflare asset layer ไม่ผ่าน Next server เพราะ `run_worker_first=false`)
- **CI** ครอบ adapter: `opennextjs-cloudflare build` + `wrangler deploy --dry-run` (timeout 35 นาที)
- **`logAiUsage` ใน `api/tests/tap-reason`** await ก่อนตอบ response (เดิม promise ถูกตัดทิ้งบน Workers)
- **cleanup**: ลบ `vercel.json`/`railway.json`, ตัด Sentry env, CSP ไม่ allow `va.vercel-scripts.com`, แก้ `CLAUDE.md`/`PROJECT.md`
- **round 2 cleanup**: ลบ `HomePricing.tsx`, `ProgressStats.tsx`, `src/app/support/`; แก้ comment "Vercel Cron" ใน `route.ts`/`wrangler.jsonc`; เติม `AI_TUTOR_*` ลง `.env.example`

## ข้อจำกัดที่ต้องรู้ (ยังไม่แก้)

- **retention ยัง dry-run** — ไม่ลบข้อมูลจนกว่าจะตั้ง `AI_TUTOR_RETENTION_APPLY=true` (การลบถาวร ต้องมีคนอนุมัติ)
- **ไม่มี incremental cache** (`defineCloudflareConfig({})`) → `unstable_cache`, ISR, `revalidateTag`, sitemap `revalidate` ไม่แคชจริง
- **ไม่มี error monitoring** — Sentry ถอดออกทั้งระบบตอนย้าย (ใช้ไม่ได้บน Workers); เหลือ Workers Logs
- **HTML แคชไม่ได้** — ทุก response มี `Set-Cookie` CSRF จาก NextAuth
- **`main` ยังไม่มีงาน Cloudflare** (ขาดทุก commit ของ branch นี้)

## หนี้ที่ยังค้าง (เรียงตามความสำคัญ)

1. merge `feat/cloudflare-workers` → `main` (เช็คก่อนว่ามี Workers Builds ผูก main หรือไม่)
2. เปิด incremental cache (R2 bucket + `NEXT_INC_CACHE_R2_BUCKET` + `withRegionalCache`)
3. error monitoring ตัวใหม่ (เลือกเจ้าก่อน)
4. ตัดสินใจเปิด retention apply (`AI_TUTOR_RETENTION_APPLY=true`)
5. ทดสอบอัปโหลด R2 (`@aws-sdk/client-s3` บน Workers) 1 ครั้งจากหน้า admin
6. เก็บกวาดรอบสอง: comment "Vercel Cron" ใน `route.ts`/`wrangler.jsonc`, `docs/ai-tutor-runbook.md`, `pg` → devDependencies, `.vercel/`

## จงใจไม่ทำ

- เปลี่ยนชื่อ worker `cefr-ready-staging` (ต้องย้าย custom domain เสี่ยง downtime)
- แคช HTML หน้า public (ต้องแก้ auth/CSRF ก่อน)
- `withTransaction` เปิด WebSocket ใหม่ทุกครั้ง — ถูกต้องแล้ว ช้าแต่รอตัวเลข latency จริงก่อน

## ข้อควรระวัง

- **ห้ามแตะ maintenance mode** (`maintenance:mode` ใน Upstash, `POST /api/admin/maintenance`, `src/proxy.ts`, `src/lib/maintenance.ts`) เว้นแต่ผู้ใช้สั่งชัดเจน
- งานทั้งหมดอยู่บน branch `feat/cloudflare-workers` — `feat/payment-checkout` เป็นงานคนละเรื่อง (ยังไม่ทำต่อ) ห้าม merge ปนกัน
