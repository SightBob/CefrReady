# SEO Changes — 2026-05-21

## สิ่งที่แก้ไข

### 1. Favicon & Apple Icon
- `src/app/icon.tsx` — เปลี่ยนจาก "CR" gradient เป็นโลโก้จริง (globe สีฟ้า + checkmark สีส้ม)
- `src/app/apple-icon.tsx` — ใช้โลโก้เดียวกัน 180x180px
- เพิ่มไฟล์โลโก้ใน `public/`: `logo.svg`, `logo.png`, `logo.jpg`

### 2. Google Search แสดง "CEFR Ready" แทน "Vercel"
- `src/app/layout.tsx` — เพิ่ม JSON-LD `WebSite` schema (`@type: WebSite, name: "CEFR Ready"`)
- ลบ `<meta name="generator">` ซ้ำซ้อน
- ลบ hardcoded `<link>` favicon tags (metadata `icons` จัดการให้แล้ว)

### 3. OpenGraph & Twitter Metadata
เพิ่ม `openGraph` + `twitter` ให้ทุกหน้า:
- `/tests`, `/tests/layout`, `/tests/[sectionId]`
- `/demo`, `/demo/layout`
- `/progress`, `/flashcards`
- `/must-know`, `/must-know/layout`, `/must-know/[slug]`

### 4. Canonical URLs
เพิ่ม `alternates.canonical` ให้ทุกหน้าที่ขาด:
- `/tests`, `/tests/[sectionId]`
- `/demo`, `/demo/focus-form`, `/demo/focus-meaning`, `/demo/form-meaning`, `/demo/listening`
- `/progress`, `/flashcards`
- `/must-know/layout`

### 5. Layout สำหรับ Client-only Pages (สร้างใหม่)
Client component ไม่สามารถ export metadata ได้ จึงสร้าง layout.tsx:
- `src/app/demo/focus-form/layout.tsx`
- `src/app/demo/focus-meaning/layout.tsx`
- `src/app/demo/form-meaning/layout.tsx`
- `src/app/demo/listening/layout.tsx`
- `src/app/tests/[sectionId]/[setId]/layout.tsx` (ตั้ง `robots: index: false`)

### 6. Quiz Structured Data (JSON-LD)
- เพิ่ม `educationalTestSchema` (Quiz schema) ใน `/tests/[sectionId]` ทุก section
- มี schema สำหรับ: Focus on Form, Focus on Meaning, Form & Meaning, Listening

## สิ่งที่ตรวจแล้วไม่มีปัญหา
- **Sitemap** — ครอบคลุมทุก public page แล้ว (รวม demo sub-pages)
- **robots.txt** — ถูกต้อง (block `/admin`, `/api`, allow AI crawlers)
- **Heading hierarchy** — H1 เดียวต่อหน้า ลำดับถูกต้อง
- **Alt text** — ไม่มี `<img>` ในเว็บ ใช้ SVG icons ทั้งหมด
- **Internal links** — ทุกอันใช้ `next/link`

## หลัง Deploy ต้องทำ

### Google Search Console
1. เปิด https://search.google.com/search-console
2. URL Inspection → ใส่ `https://cefr-ready.vercel.app` → **Request Indexing**
3. ทำเช่นกันกับหน้าอื่นๆ ที่สำคัญ:
   - `https://cefr-ready.vercel.app/tests`
   - `https://cefr-ready.vercel.app/must-know`
   - `https://cefr-ready.vercel.app/demo`

### Rich Results Test
1. เปิด https://search.google.com/test/rich-results
2. ใส่ URL เพื่อตรวจ JSON-LD schemas (WebSite, Quiz, Article)

### ยืนยัน Favicon
- เปิด `https://cefr-ready.vercel.app/icon` — ควรเห็น globe + checkmark
- เปิด `https://cefr-ready.vercel.app/apple-icon` — สำหรับ iOS

### Timeline
- Google จะอัปเดต favicon + site name ภายใน 1-2 สัปดาห์
- Request Indexing ช่วยเร่งได้เร็วขึ้น (อาจใช้เวลา 1-3 วัน)
