# Security Best Practices Report — CefrReady

**เวอร์ชันรายงาน:** 1.0
**วันที่ตรวจสอบ:** 2026-06-20
**ขอบเขต:** ทั้งโปรเจค (`src/`) — App Router API routes, auth, DB, rate limiting, CSP, frontend rendering
**Stack:** Next.js 14.2.3, NextAuth v5 beta, Drizzle ORM 0.31, PostgreSQL (Neon), Upstash Redis, Cloudflare R2

---

## Executive Summary

โปรเจค CefrReady มีเลเยอร์ security ที่ดีกว่าโปรเจค Next.js ทั่วไป: มี CSP, security headers (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), CSRF origin validation บน mutating admin endpoints, rate limiting ทั้งแบบ IP และ user, IDOR checks บน attempt/feedback, Zod validation และการใช้ Drizzle ORM (parameterized queries) ที่ป้องกัน SQL injection ได้แทบทั้งหมด

**อย่างไรก็ตาม** มีปัญหาวิกฤต (Critical) 1 ข้อและปัญหาระดับสูง (High) หลายข้อที่ต้องแก้ก่อนใช้งานจริง โดยเฉพาะ:

1. **`NEXTAUTH_SECRET` ใน `.env` อ่อนแอมาก** — เป็นข้อความที่คาดเดาง่ายมาก (`"CefrReadyWebsite!"`) ทำให้ attacker สามารถ forge JWT session และ impersonate เป็น admin ได้
2. **Secrets หลายตัวเก็บใน `.env` แบบ plaintext และที่สำคัญคือมี `NEXTAUTH_URL=http://localhost:3000`** ในไฟล์ env เดียวกับ secrets จริง ซึ่งบอกว่าไฟล์นี้น่าจะใช้กับ production ผ่าน Vercel ที่ auto-inject env vars จาก build environment
3. **Demo submit endpoint ส่ง `correctAnswer` และ `explanation` กลับไปให้ client โดยไม่ต้อง auth** — เป็น data leakage ของคำตอบที่ถูก
4. **Admin CSRF check บาง endpoint ขาด validation** และมี endpoints สาธารณะ (dictionary, articles, vocabularies) ที่ไม่มี rate limiting

ผมจัดลำดับตามความรุนแรงและให้ line numbers เพื่อให้ track ง่าย

---

## 🔴 CRITICAL

### C1 — `NEXTAUTH_SECRET` อ่อนแอมาก ทำให้ forge JWT session / admin impersonation ได้

**ไฟล์:** `.env:6` (ค่าจริง) — ใช้งานผ่าน `src/lib/auth.config.ts:1` → `src/lib/auth.ts`

```
NEXTAUTH_SECRET="CefrReadyWebsite!"
```

**Impact:** ใครก็ตามที่รู้ค่านี้สามารถ sign JWT token เอง โดยตั้ง `email: pawatsaekoo@gmail.com` (ที่รู้จาก README, public config หรือ source code) แล้ว bypass auth + เป็น admin ได้ทันที ทั้งระบบ admin และ user authentication พังทะลาย

**Secure-by-default fix:**

```bash
# Generate a real secret (do NOT reuse this exact value)
openssl rand -base64 32
```

```bash
# .env (development) — use a random value even locally
NEXTAUTH_SECRET="<output from openssl rand -base64 32>"
```

For production, **never commit** the secret. Set it via `vercel env add NEXTAUTH_SECRET production` (CLI) หรือ Vercel dashboard แล้ว pull ลงเครื่องด้วย `vercel env pull .env.local`.

**สิ่งที่ต้องทำเพิ่ม:**
- เปลี่ยนทุก secrets ที่เกี่ยวข้องทันทีเพราะต้องถือว่า compromised แล้ว (DB password, R2 keys, Upstash token, Google OAuth secret)
- ตรวจสอบ audit log ของ Neon DB, R2 และ Upstash หามีกิจกรรมผิดปกติ
- เพิ่ม startup check ปฏิเสธ boot ถ้า secret สั้นเกินไป:

```ts
// src/lib/auth.ts (add near top)
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32)
) {
  throw new Error('NEXTAUTH_SECRET must be set to a random 32+ char value in production');
}
```

---

## 🟠 HIGH

### H1 — `/api/tests/submit` ใน demo mode รั่ว `correctAnswer` + `explanation` ให้ unauthenticated users

**ไฟล์:** `src/app/api/tests/submit/route.ts:82-92` (combined with `src/lib/score-utils.ts:101-107`)

เมื่อ `isDemo: true` ส่งคำตอบแบบสุ่ม ๆ แล้ว response กลับมามี `results[].correctAnswer` และ `results[].explanation` เต็ม ๆ ไม่ต้อง login ผู้ไม่ประสงค์ดีสามารถ iterate question IDs ทั้งหมด (เป็น serial integers ตามที่เห็นใน schema) เพื่อ harvest คำตอบและคำอธิบายของทุกข้อสอบในระบบ

```ts
// submit/route.ts:82
return NextResponse.json({
  success: true,
  data: {
    score: Math.round(score),
    totalQuestions,
    correctAnswers: correctCount,
    results,                       // ← contains correctAnswer + explanation
    isDemo: true,
  },
});
```

**Impact:** Data exfiltration ของแบงค์คำถามทั้งหมด รวมถึง answer key และ explanation คู่แข่งสร้างเว็บเลียนแบบได้ภายในไม่กี่ชั่วโมง

**Fix:** ใน demo mode ให้คืนเฉพาะสรุปผล ไม่ส่ง correct answer และ explanation

```ts
// In demo branch, strip sensitive fields
return NextResponse.json({
  success: true,
  data: {
    score: Math.round(score),
    totalQuestions,
    correctAnswers: correctCount,
    // SECURITY: never expose correctAnswer/explanation to unauthenticated clients
    isDemo: true,
  },
});
```

หรือถ้าต้องการให้ demo เห็นเฉพาะ correct/incorrect ต่อข้อ (ไม่เฉลย):

```ts
results: results.map(r => ({
  questionId: r.questionId,
  isCorrect: r.isCorrect,
})),
```

---

### H2 — `.env` มี secrets หลายประเภทผสมกัน (production + dev) และมี `NEXTAUTH_URL=http://localhost:3000`

**ไฟล์:** `.env:3, 9-11, 17-18, 24-25, 28, 32`

ไฟล์เดียวมีทั้ง Neon production connection string (`sslmode=verify-full`), R2 access/secret keys, Google OAuth secret, Upstash token, Sentry DSN, PostHog key — และ `NEXTAUTH_URL=http://localhost:3000` ซึ่งขัดกับ `NEXTAUTH_URL="https://cefr-ready.site"` ใน `.env.example:14`. มี comment ในบรรทัดที่ 2 ที่บอกว่าเคยมี URL ตัวเดิมที่ไม่ใช่ pooler.

**Impact:**
- หากไฟล์นี้ถูก push ขึ้น build environment จริง (เช่น Vercel) ด้วยค่าผิด NextAuth จะ redirect OAuth callbacks ไป `localhost:3000` และทำให้ login พัง หรือถ้าใช้ค่าจาก `.env` ที่ local จริง ๆ ในเครื่อง dev แล้ว secrets เหล่านี้อยู่ใน plaintext บน disk โดยไม่มีการ rotate
- `.env.vercel` ก็อยู่ใน repo (ดู `.gitignore:14` บอกว่า ignore แต่ไฟล์อยู่ใน repo จริง) — ตรวจสอบด่วน

**Fix:**
- **Rotate ทุก secret ทันที** ทั้ง Neon DB password, R2 keys, Google OAuth secret, Upstash token, Sentry DSN, PostHog key (เพราะต้องถือว่า `.env` นี้ compromised แล้ว — `NEXTAUTH_SECRET` อ่อนแอในไฟล์เดียวกันยืนยันว่าไม่ใช่ไฟล์ที่ "private จริง ๆ")
- แยก `.env.local` สำหรับ dev (mock data + dummy secrets) ออกจาก `.env.production` ที่มี secrets จริง
- ใช้ Vercel env vars ผ่าน dashboard/CLI แทนไฟล์ใน repo
- ตรวจสอบว่า `.env.vercel` ไม่ได้ถูก commit:

```bash
git ls-files | grep -i env
# Should output ONLY .env.example
```

---

### H3 — ส่วน Markdown rendering ใน `GrammarArticleEditor.tsx` ไม่ผ่าน DOMPurify (XSS ใน admin preview)

**ไฟล์:** `src/components/GrammarArticleEditor.tsx:86-97` (renderMarkdown) และ `:182` (dangerouslySetInnerHTML)

```tsx
// No sanitization before dangerouslySetInnerHTML
dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) || '...' }}
```

`MarkdownContent.tsx:19` ใช้ `DOMPurify.sanitize` ที่ถูกต้อง แต่ฟังก์ชัน `renderMarkdown` ใน editor ไม่ได้ใช้ library เดียวกัน ทำให้ถ้ามีใครวาง `<img src=x onerror=alert(1)>` ใน markdown ที่ admin preview ก็จะ render เป็น HTML จริง

**Impact:** จำกัดเฉพาะ admin เอง (self-XSS ที่ไม่ร้ายแรง) เพราะเป็น editor ในหน้า admin ที่เฉพาะ admin เข้าได้ แต่ถ้ามี stored content ที่ user-created ในอนาคตจะกลายเป็นปัญหาใหญ่ และเป็น antipattern ที่ควรแก้เพื่อให้ source-of-truth เดียว

**Fix:** ใช้ `MarkdownContent` component หรือ wrap ด้วย DOMPurify เหมือนกัน

```tsx
import DOMPurify from 'dompurify';

const renderMarkdown = (md: string) => {
  const html = md
    .replace(/^### (.+)$/gm, '<h3 class="...">$1</h3>')
    // ... rest of replacements
    ;
  // SECURITY: sanitize admin-authored markdown before rendering as HTML
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1','h2','h3','p','div','span','strong','em','code','ul','ol','li','br'],
    ALLOWED_ATTR: ['class'],
  });
};
```

---

### H4 — Admin CSRF check ที่ `admin-auth.ts` ใช้ `origin.startsWith(allowed)` และ skip เมื่อ header หายไป

**ไฟล์:** `src/lib/admin-auth.ts:14-20` และ `src/lib/api-security.ts:11-20`

```ts
// admin-auth.ts:18
if (origin && !ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
  return { error: ..., session: null };
}
//                              ^^^^^^ if origin is missing/empty → skip check entirely
```

ปัญหา 2 ข้อ:

1. **`startsWith` เป็น substring match** ที่เปิดช่อง bypass: attacker ลงทะเบียนโดเมน `https://cefr-ready.site.evil.com` หรือสร้างหน้าที่ origin เป็น `https://cefr-ready.site` ตามด้วย path ที่ attacker คุม จะผ่าน check (เพราะ `cefr-ready.site.evil.com`.startsWith(`https://cefr-ready.site`) === true)

2. **ถ้าไม่มี origin และ referer เลย (request จาก curl, server-to-server, หรือ cross-origin ที่ซ่อน header) จะ bypass ทั้ง check** เพราะเงื่อนไข `if (origin && ...)` short-circuit

**Impact:** CSRF บน admin endpoints ที่ใช้ `requireAdmin` ได้ (ถ้า admin มี active session) ผ่านการ craft origin ปลอมหรือส่ง request ที่ไม่มี Origin header

**Fix:** ใช้ URL equality + บังคับให้มี header

```ts
const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL,
  'https://cefr-ready.site',
  'https://cefr-ready.vercel.app',
  'http://localhost:3000',
].filter(Boolean) as string[];

const ALLOWED_ORIGIN_SET = new Set(ALLOWED_ORIGINS);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false; // SECURITY: require Origin header on mutating requests
  try {
    // SECURITY: compare full Origin URL, not substring, to prevent bypass via evil lookalike domain
    const u = new URL(origin);
    const base = `${u.protocol}//${u.host}`;
    return ALLOWED_ORIGIN_SET.has(base);
  } catch {
    return false;
  }
}
```

---

### H5 — Public API endpoints ที่ไม่มี rate limiting และมี external fetch (SSRF/data-harvesting surface)

**ไฟล์:** `src/app/api/dictionary/route.ts`, `src/app/api/articles/route.ts`, `src/app/api/vocabularies/route.ts`, `src/app/api/sections/route.ts`, `src/app/api/test-sets/[id]/route.ts`

`/api/dictionary` ส่งคำไปยัง `api.dictionaryapi.dev` และ `translate.googleapis.com` โดยไม่มี rate limiting ผู้ไม่ประสงค์ดีสามารถยิงผ่าน endpoint นี้เพื่อ trigger billions ของ calls ไปยัง Google Translate (ซึ่งทำให้ IP ของ Vercel function ถูก block หรือถูก flag) หรือใช้เป็น arbitrary-URL lookup

```ts
// dictionary/route.ts:18 — no rate limit before external fetch
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word')?.trim();
  // ... only validation is regex on word, then fetch external
}
```

**Impact:**
- DoS ผ่าน dictionary endpoint ที่ trigger external calls ทุก request
- IP reputation damage กับ Google Translate
- Resource exhaustion ของ Vercel function seconds

**Fix:** เพิ่ม IP throttle เหมือน endpoints อื่น

```ts
// dictionary/route.ts
import { checkIpThrottle } from '@/lib/api-security';

export async function GET(req: NextRequest) {
  // SECURITY: rate-limit to prevent abuse of upstream dictionary/translate APIs
  const ipThrottleError = await checkIpThrottle(req, {
    windowMs: 60_000,
    maxRequests: 15,
    keySuffix: 'dictionary',
  });
  if (ipThrottleError) return ipThrottleError;

  // ... rest
}
```

---

## 🟡 MEDIUM

### M1 — IDOR ที่ `/api/users` ดึงข้อมูล user ด้วย email จาก session แต่มี POST สร้าง user ใหม่ที่ไม่มี uniqueness guard

**ไฟล์:** `src/app/api/users/route.ts:44-68`

`POST /api/users` รับ email + name + image จาก body แล้ว insert user ใหม่โดยไม่เช็คว่า email ซ้ำ ถึงแม้ schema มี `unique()` บน email แต่ insert จะ throw error และ return 500 ที่ไม่ informative อีกทั้งการ allow user ที่ login อยู่แล้วสร้าง user อื่น ๆ ที่ email ต่างออกไปเป็นพฤติกรรมแปลก ๆ (ดูเหมือน legacy/onboarding flow)

```ts
// POST /api/users — accepts ANY email, not just the session user's
const { email, name, image } = parsed.data;
const id = `user_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
const [user] = await db.insert(schema.users).values({ id, email, name, image }).returning();
```

**Impact:** User ที่ login แล้วสามารถ create users ด้วย email arbitrary ที่ไม่ใช่ของตัวเองได้ ซึ่งอาจไปรบกวน admin view, dashboard stats หรือ auth flow

**Fix:** ตรวจสอบว่า endpoint นี้ยังจำเป็นไหม ถ้าใช้ ให้ force email = session email:

```ts
// SECURITY: only allow creating/updating the currently-authenticated user
const [user] = await db.insert(schema.users)
  .values({ id, email: session.user.email, name, image })
  .onConflictDoNothing({ target: schema.users.email }) // ignore if already exists
  .returning();
```

---

### M2 — `validateOrigin` แบบเดียวกันกับ H4 ใช้ใน `api-security.ts` และถูกเรียกในหลาย endpoints

**ไฟล์:** `src/lib/api-security.ts:11-20` (เรียกใน `tests/full/start`, `tests/full/next`, `tests/full/submit`, `tests/submit`)

ตรรกะเดียวกับ H4: ใช้ `startsWith` และ skip เมื่อไม่มี origin. ควรแก้พร้อมกันที่ที่เดียว (แนะนำให้ refactor ให้ทั้ง `admin-auth.ts` และ `api-security.ts` ใช้ helper เดียวกัน)

---

### M3 — Admin email check ใน `authorized()` callback อิง `process.env.ADMIN_EMAIL` ที่อาจ undefined

**ไฟล์:** `src/lib/auth.config.ts:63`

```ts
if (!process.env.ADMIN_EMAIL || auth.user?.email !== process.env.ADMIN_EMAIL)
  return Response.redirect(new URL('/', nextUrl));
```

ถ้า `ADMIN_EMAIL` ไม่ถูก set ใน environment ใด ๆ (เช่น preview deployment) ทุกคนจะไม่สามารถเข้า `/admin/*` ได้แม้แต่คนที่ควรเป็น admin. นี่ไม่ใช่ vulnerability โดยตรงแต่เป็น reliability footgun และทำให้ fail-secure อาจผิดพลาด

**Fix:** Log warning ตอน startup และพิจารณา hardcoded fallback list:

```ts
// src/lib/auth.config.ts (top of file)
if (!process.env.ADMIN_EMAIL) {
  console.warn('ADMIN_EMAIL not set — /admin/* routes will be inaccessible');
}
```

---

### M4 — `getRateLimitIdentifier` trust `X-Forwarded-For` แบบไม่กำหนดขอบเขต

**ไฟล์:** `src/lib/rate-limit.ts:53-57`

```ts
const forwarded = request.headers.get('x-forwarded-for');
const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
```

ถ้า Vercel/CDN ไม่ได้ override `X-Forwarded-For` ก่อนส่งต่อ client สามารถ spoof IP เพื่อ bypass rate limit ทั้งหมดได้ Vercel ปกติจะเพิ่ม `x-vercel-forwarded-for` และ `x-real-ip` ที่เชื่อถือได้ แต่โค้ดไม่ได้อ่านค่าเหล่านั้น

**Impact:** Rate limiting ทั้งระบบ bypass ได้ผ่าน header spoofing (ขึ้นกับ proxy chain)

**Fix:** อ่าน trusted headers ของ Vercel ก่อน

```ts
export function getRateLimitIdentifier(request: Request): string {
  // SECURITY: prefer platform-trusted headers over client-supplied X-Forwarded-For
  const vercelIp = request.headers.get('x-vercel-forwarded-for') ||
                   request.headers.get('x-real-ip');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}
```

---

### M5 — `console.warn` / `console.error` รั่วข้อมูลที่อาจ sensitive ไปยัง server logs (และ Sentry)

**ไฟล์:** หลายที่ เช่น `src/lib/auth.ts:9, 13`, `src/db/index.ts:19`, `src/app/api/admin/questions/import/route.ts:255, 275, 483`, ฯลฯ

ไม่ได้เป็นช่องโหว่โดยตรง แต่ log มี message ละเอียดเกี่ยวกับ DB errors และ user input ที่อาจมี PII เมื่อ forward ไป Sentry (DSN public ใน `.env:28`) ต้องระวัง server-side scrubbing

**Fix:** ใช้ Sentry's `beforeSend` เพื่อ scrub PII (เช่น email, message content) ก่อน send:

```ts
// sentry.server.config.ts
Sentry.init({
  // ...
  beforeSend(event) {
    if (event.request?.data) {
      delete event.request.data.email;
      delete event.request.data.message;
    }
    return event;
  },
});
```

---

## 🟢 LOW / Hardening

### L1 — ใช้ auto-incrementing integer IDs สำหรับ resources ที่ exposed ผ่าน public API

**ไฟล์:** `src/db/schema.ts` — `questions.id`, `testAttempts.id`, `testSets.id`, `articles.id`, `vocabularies.id`, `flashcards.id` ล้วนเป็น `serial('id').primaryKey()`

ตาม skill guidance การใช้ integer auto-increment ทำให้ attacker enumeration ง่าย (ดู H1 ข้างบนที่ exploit ได้จริง) และเรียนรู้ขนาดของ dataset ได้ (เช่น รู้ว่ามีข้อสอบเท่าไหร่ในระบบ)

**Fix:** พิจารณา UUID สำหรับ tables ที่ expose IDs ผ่าน public API (questions, test attempts). อย่างไรก็ตาม การ migrate ทั้ง table เป็นการใหญ่ ให้เริ่มจาก tables ใหม่เท่านั้น

### L2 — HSTS preload อาจเป็นปัญหาถ้า domain เคยใช้ HTTP

**ไฟล์:** `next.config.mjs:33-34`

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Preload list เป็นการถาวร ถ้า domain เปลี่ยนแผน (เช่น staging บน HTTP) จะ lock users ออก ควรเอา `preload` ออกจนกว่าจะมั่นใจว่าทุก subdomain ใช้ HTTPS ตลอดการ ตาม skill guidance "avoid recommending HSTS"

### L3 — `Permissions-Policy` ดี แต่อาจตัดฟีเจอร์ในอนาคต

**ไฟล์:** `next.config.mjs:41-43`

ปัจจุบันปิด camera/mic/geolocation ครบ ดีแล้ว — เป็นข้อสังเกตว่าห้ามลืมอัปเดตตอนเพิ่มฟีเจอร์ที่ต้องใช้สิทธิ์เหล่านี้

### L4 — `.env.example:30` บอกให้ใช้ `ADMIN_EMAIL` แต่ใน `.env` จริงใช้ค่าเดิม

อย่างไรก็ตาม admin email (`pawatsaekoo@gmail.com`) ปรากฏใน `.env`, `CLAUDE.md`, และ memory หลายที่ ถือเป็น public knowledge ไม่ใช่ secret แต่ทำให้ email enumeration เล็งไปที่ admin ได้ง่าย พิจารณาใช้ role-based flag ใน DB แทน email check

### L5 — CSP อนุญาต `'unsafe-inline'` และ `'unsafe-eval'` สำหรับ script-src

**ไฟล์:** `next.config.mjs:48`

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```

`'unsafe-eval'` ลดความคุ้มกันของ CSP ต่อ XSS อย่างมาก (อนุญาต `eval()`). ควรตรวจสอบว่าจำเป็นจริงหรือไม่ — ส่วนใหญ่ Next.js 14 ไม่จำเป็นต้องใช้ `'unsafe-eval'` ในโหมด production. พิจารณาใช้ nonce-based CSP ผ่าน Next.js middleware แทน

### L6 — ไม่มีหนด admin authentication log

**ไฟล์:** ไม่มี audit trail endpoint

ไม่มีบันทึกว่า admin login ครั้งล่าสุดเมื่อไหร่ หรือมีการเข้าถึง admin endpoints อย่างไร ถ้าเกิด incident จะไม่มี forensic evidence

**Fix:** Log admin actions ลง DB table ใหม่ (`admin_audit_log`) หรือ forward ไป Sentry/PostHog เป็น event แยก

---

## ✅ สิ่งที่ทำได้ดี

เพื่อให้สมดุล นี่คือสิ่งที่โปรเจคทำถูกต้อง:

- **CSP + security headers ครบถ้วน** (`next.config.mjs:19-63`) — ดีกว่าโปรเจค Next.js ทั่วไปมาก
- **Drizzle ORM ทุกที่** — ไม่มี raw SQL string concat, แม้ `sql\`\`` template tags ก็ parameterize
- **Zod validation บนทุก mutating endpoint** — pattern สม่ำเสมอ
- **IDOR checks** ที่ `tests/attempts/[attemptId]/route.ts:40-45`, `tests/feedback/route.ts:57-62` — ตรวจ `userId === session.user.id` ก่อนให้ข้อมูล
- **CSRF origin check** บน admin + full-test mutating endpoints (แม้จะมีข้อ H4 ที่ต้องแก้)
- **Rate limiting หลายชั้น** (IP throttle + per-user) บน endpoints ที่ sensitive
- **DOMPurify** สำหรับ markdown ที่ user-facing (`MarkdownContent.tsx:19`)
- **File upload validation** (`upload-audio/route.ts:5-9`) — ตรวจ MIME type + size + sanitize filename
- **`.gitignore`** มี `.env`, `.env.local`, `.env.*.local`, `.env.vercel` — และยืนยันด้วย `git ls-files` ว่า `.env` ไม่ถูก track
- **Edge-safe auth split** ที่ถูกต้องตาม NextAuth v5 best practice
- **HSTS, X-Frame-Options: DENY, frame-ancestors: 'none'** — ป้องกัน clickjacking
- **OTP/admin redirect** ใน middleware (`auth.config.ts:62-64`) — fail-secure สำหรับ protected routes

---

## ลำดับการแก้ไขที่แนะนำ

1. **C1 (ทันที)** — Rotate `NEXTAUTH_SECRET` เป็น random 32+ chars และทุก secrets ที่เกี่ยวข้อง เพราะต้องถือว่า compromised
2. **H1** — แก้ demo submit ไม่ส่ง `correctAnswer`/`explanation`
3. **H4 + M2** — Fix CSRF origin validation ที่ helper กลาง (แก้ที่เดียว)
4. **H2** — แยก env files, rotate secrets, ตรวจสอบ `.env.vercel` ไม่ถูก commit
5. **H3** — ใช้ DOMPurify ใน editor preview
6. **H5 + M4** — เพิ่ม rate limiting บน public endpoints + แก้ IP trust chain
7. **M1, M3, M5, L1-L6** — Hardening ตามลำดับความสำคัญ

---

## หมายเหตุเกี่ยวกับ skill references

skill `security-best-practices` ไม่มีไฟล์ reference `.md` สำหรับ Next.js / NextAuth / Drizzle โดยเฉพาะ (มีเพียง `SKILL.md`) ดังนั้นรายงานนี้อิงจาก OWASP Top 10 และ security best practices มาตรฐานสำหรับ Next.js 14 App Router, NextAuth v5, และ PostgreSQL/Drizzle stack
