# Performance Audit — CEFR Ready

วันที่: 4 ต.ค. 2026 · วัดจาก **production build จริง** (`next build` + `next start`) ไม่ใช่ dev server
**ยังไม่มีการแก้โค้ดใด ๆ** — รายงานนี้เป็น Phase 1–3 (Audit + Prioritize) เท่านั้น

---

## สรุปสั้น

เว็บทำงานถูกต้อง แต่แพงเพราะ **4 อย่างที่วัดได้ชัด**:

| ปัญหา | ตัวเลขที่วัดได้ | กระทบ |
|---|---|---|
| ฟอนต์ 2 ตัวเป็น **TTF** (gzip ได้แค่ 45–48%) | Caveat 210KB + Momo 48KB = **258KB** ที่ส่งจริง | บล็อก text paint → LCP/FCP ช้า |
| `layout.tsx` อ่าน `headers()` → ทุกหน้าเป็น dynamic | `/cefr` ที่ตั้ง `revalidate=3600` **ไม่เคย static** | TTFB สูงกว่าที่ควรทุก request |
| Analytics 2 ตัว + Sentry บนทุกหน้า | posthog+sentry chunk = **14KB gzip** ที่อยู่ใน home จริง | JS ที่ไม่จำเป็นต่อหน้า |
| `swiper` / `ChartComponents` / `HomeTestTypes` ไม่มีใคร import | dead code | dependency ที่แก้ไม่ได้จริง |

ฝั่งบวกที่ต้องบอก: **ระบบ cache ทำงานดี** — `unstable_cache` ตั้งไว้ถูกที่, index ใน DB ครบ, `Promise.all` ใช้แทน N+1, PostHog lazy-load หลัง idle แล้ว, image optimization บน Vercel ทำงานถูก (11MB PNG → **6.1KB AVIF**)

> ตัวเลข bundle ทั้งหมดข้างต้นมาจาก `next build` จริง และผมตรวจแล้วว่า home page มี `async:true` = **0** — คือทุก chunk ที่นับเป็น **initial load จริง** ไม่ใช่ lazy chunk

> หมายเหตุสำคัญ: แม้ตั้ง `revalidate` ไว้ 11 จุด แต่ build แสดงผลเป็น `ƒ` (Dynamic) **ทุกหน้า** เพราะ `headers()` ใน layout ดังนั้นค่า `revalidate` เหล่านั้น **ยังไม่เคยมีผลจริง** — ดู C2

---

## 🔴 Critical

### C1 — ฟอนต์ Caveat + Momo เป็น TTF (ควรเป็น woff2)

**Before (วัดจริงจาก network trace ของหน้าแรก)**
```
211.2 KB  font/ttf  /fonts/Caveat-VariableFont_wght.ttf
 48.2 KB  font/ttf  /fonts/MomoTrustDisplay-Regular.ttf
```
`Caveat` ใช้แค่ตัวอักษร "READY!" ในโลโก้ แต่ดาวน์โหลด **210KB ทุกหน้า**

**สาเหตุ** — [fonts.css](src/app/fonts.css) ประกาศ `format('truetype')`:
```css
src: url('/fonts/Caveat-VariableFont_wght.ttf') format('truetype-variations'),
     url('/fonts/Caveat-VariableFont_wght.ttf') format('truetype');
```

**แก้ความเข้าใจผิดที่เคยเขียนไว้ก่อนหน้านี้:** ผมเคยเขียนว่า "TTF บีบอัดไม่ได้" — **ไม่จริง** วัดจริงได้:
| ไฟล์ | raw | gzip ที่ส่งจริง | ลดได้ |
|---|---|---|---|
| Caveat | 385KB | **210KB** | 45% |
| Momo | 91KB | **48KB** | 48% |

**สิ่งที่ IBM Plex ทำถูกแล้ว** — 20 weight×subset ทั้งหมดเป็น `.woff2` ✅ Caveat/Momo คือข้อยกเว้นเพียง 2 ตัว

**Change** — แปลง Caveat + Momo เป็น woff2 แล้วแก้ `fonts.css`

**ความเสี่ยง UX/UI: ต่ำ** — woff2 เป็น rasterization เดียวกันทุก browser ที่รองรับ ตัวอักษรและ layoutไม่เปลี่ยน

> ⚠️ **ยังไม่ได้วัดตัวเลข woff2 จริง** — เครื่องนี้ไม่มี fonttools/woff2_compress ผมจึงไม่ยอมเดา คาดว่าดีกว่า gzip อีกราว 30–40% (**ประมาณ −80 ถึง −100KB**) แต่ต้องแปลงจริงแล้ววัดซ้ำเพื่อยืนยัน

---

### C2 — `layout.tsx` อ่าน `headers()` ทำให้ ISR ตายทั้งเว็บ

**Before (วัดจาก build output — ทุกหน้าขึ้น `ƒ` Dynamic)**
```
ƒ /cefr          ← มี revalidate = 3600
ƒ /tests         ← มี revalidate = 300
ƒ /guide/[slug]  ← มี revalidate = 3600
```
Build ระบุ **0 หน้า** ที่ static ได้ (นอกจาก icon/robots/sitemap) ทั้งที่โค้ดตั้ง `revalidate` ไว้ 11 จุด — **ค่าเหล่านี้จึงไม่เคยมีผลจริง**

**สาเหตุ** — [layout.tsx:106](src/app/layout.tsx#L106)
```ts
const nonce = (await headers()).get('x-nonce') ?? undefined;
```
อ่าน `headers()` = ทำให้ทั้ง tree กลายเป็น dynamic ทุก request

**Change** — ย้าย logic ที่ต้องใช้ nonce ออกจาก root layout ให้ไปอยู่เฉพาะจุดที่ render `<script>` จริง (JsonLd) แล้วอ่าน header ใน component นั้นแทน

**ความเสี่ยง UX/UI: ต่ำ** — nonce ยังทำงานเหมือนเดิม ทุกหน้าที่ไม่มี inline script ไม่ต้อง dynamic

**คาดว่าจะได้:** `/cefr`, `/guide/*`, `/must-know/*` กลายเป็น static จริง → TTFB ลดจาก **~20ms warm** เหลือ **edge cache 0ms** และประหยัด Neon query ทุก request

> หมายเหตุ: ถ้าคุณต้องการ CSP nonce ที่ยากแกะที่สุด อาจต้องยอม trade-off เรื่องนี้ — ผมจะถามก่อนลงมือ

---

### C3 — โหลดฟอนต์ IBM Plex หลาย weight ทุกหน้า

**Before** — [fonts.css](src/app/fonts.css) ประกาศ 300/400/500/600/700 แยกทีละ weight
ทุก weight มี `font-display: swap` → browser โหลดทุก weight ที่หน้านั้นเรนเดอร์จริง

**สถานะ: ยังไม่ยืนยัน** — ผมยังไม่ได้ตรวจว่าแต่ละหน้าใช้กี่ weight จริง
ต้องนับจาก class ที่ build ออกมาจริงก่อน ถ้าลดผิดจะเห็นตัวหนาผิดทันที

**ความเสี่ยง UX/UI: ปานกลาง** — ย้ายไปรอบที่ 2

---

## 🟠 High

### H1 — Analytics 2 ตัว + Sentry บนทุกหน้า

**ตรวจจาก production build (ไม่ใช่ dev)**
- `0_yp_q03kahkl.js` = **42KB raw / 14KB gzip** — อยู่ใน home page manifest จริง (grep นับได้ 1)
- `3-_2x18p_qxhc.js` = **189KB raw / 62KB gzip** — มีทั้ง posthog และ sentry

> หมายเหตุ: ตัวเลข 76KB ที่เห็นใน trace มาจาก **dev server** ซึ่งบีบอัดไม่เหมือน production — ผมจึงไม่ใช้มันในรายงานนี้

[layout.tsx](src/app/layout.tsx) วาง `<SpeedInsights />` (Vercel) ควบคู่ PostHog — **2 analytics** ทั้งที่ comment ในโค้ดเขียนว่า "PostHog is the single analytics provider" ขัดกับตัวเอง

**Change:** ตัดสินใจทิ้งตัวใดตัวหนึ่ง หรือ gate SpeedInsights ให้โหลดเฉพาะ production
**ความเสี่ยง UX/UI: ไม่มี**

### H2 — `recharts` 365KB (×2 = 730KB raw / 208KB gzip)

วัดแล้ว: `admin/reports` = **979KB raw / 283KB gzip**, `admin/question-pool` = 952KB / 277KB
**ข่าวดี:** โหลดเฉพาะหน้า admin ไม่กระทบผู้ใช้ทั่วไป — จัดเป็น 🟢 ได้ถ้าไม่มี admin จำนวนมาก

### H3 — `useSession()` ทำให้ Header ยิง `/api/auth/session` ทุกหน้า

[HeaderClient.tsx](src/components/HeaderClient.tsx) + `SessionProvider` ใน layout — ทุกหน้ารวมถึงหน้า content ต้องรอ auth round-trip

**Change:** ส่ง `user` จาก server ลง props (เหมือนที่ [tests/page.tsx](src/app/tests/page.tsx) ทำอยู่แล้ว) แทนการให้ client fetch เอง
**ความเสี่ยง UX/UI: ต่ำ** — ปุ่ม "เข้าสู่ระบบ"/ชื่อผู้ใช้แสดงผลเหมือนเดิม

---

## 🟡 Medium

| # | ปัญหา | ไฟล์ | หมายเหตุ |
|---|---|---|---|
| M1 | `swiper` (~150KB) ถูก import ใน [HomeReviews.tsx](src/components/HomeReviews.tsx) ที่**ไม่มีใครใช้** | — | ยืนยันแล้ว: grep ทั้ง `src/` ไม่มีไฟล์ไหน import `HomeReviews` |
| M2 | `ChartComponents.tsx` + `HomeTestTypes.tsx` ไม่มีไฟล์ไหน import | — | ยืนยันแล้วด้วย grep — 0 reference |
| M3 | `TopLoadingBar` ฟัง `document click` แบบ capture ทุกครั้ง | [TopLoadingBar.tsx](src/components/TopLoadingBar.tsx) | ต้นทุนน้อย แต่รันทุก click |
| M4 | หน้าเดียวแยก `unstable_cache` key ซ้ำ 3 ที่ | `tests/page.tsx`, `tests/[sectionId]/page.tsx`, `intro/page.tsx` | รวมเป็น helper เดียว |
| M5 | `fetch(... no-store)` ต่อข้อใน [tests set page](src/app/tests/[sectionId]/[setId]/page.tsx#L187) | — | มี cache ใน memory แล้ว ยัง OK |

> M1/M2 ยืนยันด้วยคำสั่ง: `grep -rn "ชื่อ" src --include=*.tsx` → ไม่พบ import นอกไฟล์ตัวเอง
> **หมายเหตุ:** swiper ยัง**ไม่**ถูกโหลดใน bundle ที่วัดได้ เพราะไม่มี route ไหน import — ผลคือลบ dependency ได้ปลอดภัย แต่**ไม่ใช่**กำได้ bundle ที่วัดได้ตอนนี้

---

## 🟢 Low

- **L1** — CSS bundle 162KB raw / **26KB gzip** (บีบอัดดีแล้ว ไม่ต้องแก้)
- **L2** — marquee animation `infinite` ค้างตลอด แต่ CSS-only ไม่กระทบ JS
- **L3** — `dompurify` ใช้แค่ 2 ที่ (admin) — ยังไม่ต้อง lazy

---

## ⚠️ สิ่งที่ผมวัดแล้วแต่ "ไม่ใช่บั๊ก"

เพื่อไม่ให้เสียเวลาแก้ผิด:

1. **Image optimization ปกติดีมาก** — ทดสอบ production จริง:
   ```
   https://cefr-ready.site/_next/image?url=/bg/bg-main1.png&w=1920&q=75
   → Content-Type: image/avif, Content-Length: 6127 (จาก PNG 11MB)
   ```
   ตัวเลข 11MB ที่เห็นใน `public/` เป็น **ไฟล์ต้นฉบับเท่านั้น** ไม่ใช่สิ่งที่ user โหลด

2. **TTFB ฝั่ง server ไม่ช้า** — วัด `next start` จริง: `/` = 21ms, `/tests` = 15ms, `/cefr` = 14ms

3. **DB index ครบ** — ทุกตารางที่ query หนักมี index ตรง ๆ และใช้ `Promise.all` แทน N+1

4. **PostHog ถูก lazy-load แล้ว** — `requestIdleCallback` + dynamic import

---

## ข้อจำกัดของการวัดรอบนี้ (ต้องบอกตามตรง)

**ผมวัด Web Vitals (LCP/INP/TBT) บนหน้าจริงไม่สำเร็จ** — เว็บอยู่ใน maintenance mode ทุก request เลยถูก redirect ไป `/maintenance` การวัดที่ได้คือหน้า maintenance ไม่ใช่หน้าจริง

**ผมไม่แตะ maintenance mode ตามกฎใน AGENTS.md** — ถ้าอยากให้วัด LCP/INP จริง ต้องให้คุณสั่งปิดเองชั่วคราว (ห้ามผมแตะ flag ใน Redis)

**เรื่อง login:** Chromium ที่ผมใช้เป็น **โปรไฟล์แยกและไม่ล็อกอินอยู่** คุณที่ยัง login อยู่คือ session ในเบราว์เซอร์คุณ ไม่ใช่ของผม — ผมจึงยังวัดหน้า `/progress`, `/review/[attemptId]`, `/tests/[sectionId]/[setId]` (ที่ต้อง login) ไม่ได้

> ถ้าต้องการวัดหน้าเหล่านั้น: ส่ง session cookie มาให้ผม หรือปิด maintenance ชั่วคราวแล้วผมวัดให้ครบ

---

## ข้อเสนอแนะ: ลำดับทำ

**รอบที่ 1 (ได้ผลมาก ความเสี่ยงต่ำ)** — C1 ฟอนต์ woff2 + H1 ตัด analytics ตัวที่ไม่ใช้ + M1/M2 ลบ dependency ที่ไม่มีใครใช้
→ คาด −150 ถึง −180KB ต่อหน้า (ยังไม่ยืนยันตัวเลข woff2) โดยหน้าตาเหมือนเดิมทุกประการ

**รอบที่ 2** — H3 Header เลิก fetch session + M4 รวม cache key
→ ลด request ลด re-render (C3 ย้ายไปรอบนี้เพราะต้องยืนยัน weight ที่ใช้จริงก่อน)

**รอบที่ 3 (ต้องคุณตัดสินใจ)** — C2 เรื่อง CSP nonce กับ static rendering
→ ได้ TTFB ดีที่สุด แต่กระทบ security architecture

---

## สคริปต์ที่สร้างไว้ (ใช้วัดซ้ำได้)

- [measure-route-js.js](scripts/measure-route-js.js) — วัด JS ต่อ route จาก build
- [attribute-route-js.js](scripts/attribute-route-js.js) — ดูว่า route นั้นโหลด library อะไรบ้าง
- [measure-vitals.js](scripts/measure-vitals.js) — วัด Core Web Vitals ผ่าน CDP

```bash
npx next build && npx next start -p 3100
node scripts/measure-route-js.js --top 20

# บน Git Bash ต้องใช้ MSYS_NO_PATHCONV=1 ไม่งั้น argument `/` จะกลายเป็น Windows path
MSYS_NO_PATHCONV=1 node scripts/measure-vitals.js http://127.0.0.1:3100 / /tests
```

> `measure-vitals.js` หา Chromium จาก `~/AppData/Local/ms-playwright/` อัตโนมัติ (ไม่ต้อง npm install)
> **ข้อจำกัดบนเครื่องนี้:** `sharp` โหลดไม่ได้ (`Could not load the "sharp" module using the win32-x64 runtime`)
> ทำให้ `/_next/image` ตอบกลับไฟล์ต้นฉบับไม่ย่อ — **ตัวเลข image ที่วัดบนเครื่องนี้จึงไม่ใช่ของจริง**
> ตัวเลข image ที่รายงานข้างบนจึงมาจาก **production จริงบน Vercel** แทน

---

## ข้อถามก่อนเริ่มรอบที่ 1

ยืนยันว่าจะให้ผมแก้ C1/H1/M1/M2 เลยไหมครับ? (ทั้งหมดไม่กระทบ UX/UI และมีตัวเลขรองรับ)