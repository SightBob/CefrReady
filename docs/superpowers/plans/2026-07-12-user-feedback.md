# Authenticated User Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the general contact form with a single-field feedback form that only authenticated users can submit and that securely associates every new submission with its session account.

**Architecture:** Keep `/contact` as a client page for session-aware presentation, but make the route handler the authentication boundary and derive `userId` exclusively from `auth()`. Evolve `contact_messages` without deleting legacy data, and join current user identity into the admin read API with legacy-column fallbacks.

**Tech Stack:** Next.js 14 App Router, React 18, NextAuth v5, Drizzle ORM/PostgreSQL, Zod, Vitest, Tailwind CSS, Sonner

---

## File map

- Modify `src/db/schema.ts`: make legacy identity fields nullable and add the account relationship.
- Create `drizzle/0013_user_feedback.sql`: preserve legacy rows while allowing account-linked feedback.
- Create `src/app/api/contacts/route.test.ts`: exercise the authentication and validation boundary.
- Modify `src/app/api/contacts/route.ts`: accept only message text and derive identity from the session.
- Modify `src/app/contact/page.tsx`: render a login prompt or one-field feedback form.
- Modify `src/app/api/admin/contacts/route.ts`: return joined current account identity.
- Modify `src/app/admin/contacts/page.tsx`: render new feedback and legacy contact rows safely.
- Modify `src/app/admin/page.tsx`, `src/components/HeaderClient.tsx`, and `src/components/Footer.tsx`: update visible navigation labels.

### Task 1: Add the account-linked feedback data model

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0013_user_feedback.sql`

- [ ] **Step 1: Update the Drizzle schema**

Replace the `contactMessages` definition with nullable legacy fields, a nullable user relation, and an index:

```ts
export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  subject: varchar('subject', { length: 200 }),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  isReadIdx: index('contact_messages_is_read_idx').on(table.isRead),
  userIdx: index('contact_messages_user_id_idx').on(table.userId),
}));
```

- [ ] **Step 2: Add the non-destructive SQL migration**

Create `drizzle/0013_user_feedback.sql`:

```sql
ALTER TABLE "contact_messages" ADD COLUMN "user_id" text;
ALTER TABLE "contact_messages" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "contact_messages" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "contact_messages" ALTER COLUMN "subject" DROP NOT NULL;
DO $$ BEGIN
 ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "contact_messages_user_id_idx" ON "contact_messages" USING btree ("user_id");
```

- [ ] **Step 3: Verify schema typing and migration shape**

Run: `npx tsc --noEmit`

Expected: exit code 0, or only pre-existing errors documented before continuing. Do not run `npm run db:migrate` without an explicitly configured target database.

### Task 2: Enforce authenticated message-only submissions

**Files:**
- Create: `src/app/api/contacts/route.test.ts`
- Modify: `src/app/api/contacts/route.ts`

- [ ] **Step 1: Write route tests with mocked auth, rate limiting, and database insertion**

Create a Vitest suite that mocks `@/lib/auth`, `@/lib/rate-limit`, and `@/db`, imports `POST`, and asserts these cases:

```ts
it('returns 401 without a session', async () => {
  mockedAuth.mockResolvedValue(null);
  const response = await POST(request({ message: 'พบปัญหา' }));
  expect(response.status).toBe(401);
  expect(mockInsert).not.toHaveBeenCalled();
});

it.each(['', '   ', 'x'.repeat(5001)])('rejects invalid message text', async (message) => {
  mockedAuth.mockResolvedValue({ user: { id: 'user-1' } });
  const response = await POST(request({ message }));
  expect(response.status).toBe(400);
});

it('stores the trimmed message under the session user only', async () => {
  mockedAuth.mockResolvedValue({ user: { id: 'user-1' } });
  const response = await POST(request({
    message: '  เพิ่มโหมดมืดด้วยครับ  ',
    userId: 'attacker',
    email: 'spoof@example.com',
  }));
  expect(response.status).toBe(200);
  expect(mockValues).toHaveBeenCalledWith({
    userId: 'user-1',
    message: 'เพิ่มโหมดมืดด้วยครับ',
  });
});
```

The local `request()` helper must construct `new NextRequest('http://localhost/api/contacts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx vitest run src/app/api/contacts/route.test.ts`

Expected: FAIL because the current endpoint accepts name, email, and subject and does not require a session.

- [ ] **Step 3: Implement the server-side authentication boundary**

In `src/app/api/contacts/route.ts`, import `auth` from `@/lib/auth`, replace the schema, and authenticate before consuming rate-limit capacity:

```ts
const contactSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'กรุณาเข้าสู่ระบบก่อนส่งข้อความ' },
      { status: 401 },
    );
  }

  // Keep the existing per-minute and daily rate-limit checks here.
  // Parse the JSON body with contactSchema, retaining the existing 400 response.
  await db.insert(contactMessages).values({
    userId: session.user.id,
    message: parsed.data.message,
  });

  return NextResponse.json({ success: true });
}
```

Retain the existing `try/catch`, Thai 500 response, and both rate-limit windows. The actual implementation must not reference body-supplied identity fields.

- [ ] **Step 4: Run the focused tests**

Run: `npx vitest run src/app/api/contacts/route.test.ts`

Expected: all contact route tests PASS.

### Task 3: Replace the contact form with authenticated free text

**Files:**
- Modify: `src/app/contact/page.tsx`

- [ ] **Step 1: Add session-driven rendering**

Use `useSession` and `signIn` from `next-auth/react`. While status is `loading`, render the page shell with a centered “กำลังโหลด...” state. When unauthenticated, render this call to action:

```tsx
<div className="rounded-[1.5rem] border border-[#EAEAEA] bg-white p-8 text-center">
  <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-[#787774]" />
  <h2 className="text-lg font-semibold text-[#111]">เข้าสู่ระบบเพื่อส่งความคิดเห็น</h2>
  <p className="mt-2 text-sm text-[#787774]">
    เราจะผูกข้อความกับบัญชีของคุณเพื่อให้ตรวจสอบและติดต่อกลับได้
  </p>
  <button
    type="button"
    onClick={() => Promise.resolve(signIn('google', { callbackUrl: '/contact' })).catch(() => {})}
    className="mt-6 rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white"
  >
    เข้าสู่ระบบด้วย Google
  </button>
</div>
```

- [ ] **Step 2: Replace the four-field form with one textarea**

Keep only `message` and `submitting` state. Submit `{ message }` and render:

```tsx
<form onSubmit={handleSubmit} className="space-y-5">
  <div>
    <label htmlFor="feedback-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#111]">
      รายละเอียดปัญหาหรือข้อเสนอแนะ
    </label>
    <textarea
      id="feedback-message"
      required
      minLength={1}
      maxLength={5000}
      rows={8}
      value={message}
      onChange={(event) => setMessage(event.target.value)}
      placeholder="เล่าให้เราฟังได้เลยว่าพบปัญหาอะไร หรืออยากให้เราปรับปรุงส่วนไหน..."
      className="w-full resize-y rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
    />
    <p className="mt-1.5 text-right text-xs text-[#AAAAAA]">{message.length.toLocaleString()} / 5,000</p>
  </div>
  <button type="submit" disabled={submitting || !message.trim()} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
    <Send className="h-4 w-4" />
    {submitting ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}
  </button>
</form>
```

- [ ] **Step 3: Update page copy and response behavior**

Use heading “แจ้งปัญหาและข้อเสนอแนะ” and description “พบปัญหาในการใช้งาน หรือมีไอเดียที่อยากให้เราปรับปรุง? บอกเราได้เลย ทุกความคิดเห็นช่วยให้ CEFR Ready ดีขึ้น”. On success show `ขอบคุณสำหรับความคิดเห็น เราได้รับข้อความของคุณแล้ว` and clear the textarea. On non-OK or `{ success: false }`, keep the textarea content and show the returned error.

- [ ] **Step 4: Type-check the UI change**

Run: `npx tsc --noEmit`

Expected: exit code 0.

### Task 4: Make the admin inbox support account-linked and legacy records

**Files:**
- Modify: `src/app/api/admin/contacts/route.ts`
- Modify: `src/app/admin/contacts/page.tsx`

- [ ] **Step 1: Join current account identity in the admin API**

Import `users` and use a left join so deleted accounts and legacy rows remain visible:

```ts
const messages = await db
  .select({
    id: contactMessages.id,
    userId: contactMessages.userId,
    accountName: users.name,
    accountEmail: users.email,
    legacyName: contactMessages.name,
    legacyEmail: contactMessages.email,
    legacySubject: contactMessages.subject,
    message: contactMessages.message,
    isRead: contactMessages.isRead,
    createdAt: contactMessages.createdAt,
  })
  .from(contactMessages)
  .leftJoin(users, eq(contactMessages.userId, users.id))
  .orderBy(desc(contactMessages.createdAt))
  .limit(100);
```

Remove unused `NextRequest` and `and` imports while editing this file.

- [ ] **Step 2: Update the admin page type and fallback helpers**

Define nullable identity fields and centralize display fallbacks:

```ts
interface ContactMessage {
  id: number;
  userId: string | null;
  accountName: string | null;
  accountEmail: string | null;
  legacyName: string | null;
  legacyEmail: string | null;
  legacySubject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const senderName = (message: ContactMessage) =>
  message.accountName || message.accountEmail || message.legacyName || 'ไม่ทราบผู้ส่ง';
const senderEmail = (message: ContactMessage) =>
  message.accountEmail || message.legacyEmail;
```

- [ ] **Step 3: Update inbox presentation**

Set the page title to “ปัญหาและข้อเสนอแนะ”, the empty state to “ยังไม่มีความคิดเห็น”, list primary text to `senderName(msg)`, and list secondary text to `msg.legacySubject || msg.message`. In the detail view, use `selectedMessage.legacySubject || 'ความคิดเห็นจากผู้ใช้'` as the heading, show the resolved sender identity and email, and render the mailto button only when `senderEmail(selectedMessage)` is non-null.

- [ ] **Step 4: Type-check the admin changes**

Run: `npx tsc --noEmit`

Expected: exit code 0.

### Task 5: Update navigation wording and verify the complete flow

**Files:**
- Modify: `src/components/HeaderClient.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Update visible navigation labels**

Replace the `/contact` label in desktop header, mobile navigation, and footer with `ความคิดเห็น`. In the admin dashboard, rename the contact card title to `ปัญหาและข้อเสนอแนะ`. Keep all href values unchanged.

- [ ] **Step 2: Run focused unit tests**

Run: `npm run test:unit`

Expected: all Vitest suites PASS.

- [ ] **Step 3: Run the production type/build check**

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Perform manual acceptance checks**

Run: `npm run dev`

Verify in the browser:

1. Signed out `/contact` shows the login prompt and no textarea.
2. Google login returns to `/contact`.
3. Signed-in `/contact` shows exactly one textarea and submits a trimmed message.
4. A successful submission clears the textarea; a failed request preserves it.
5. `/admin/contacts` shows the account identity for a new row.
6. An old row with legacy name, email, and subject still renders and remains replyable.
7. Header, mobile menu, footer, and admin dashboard use the new wording.

- [ ] **Step 5: Record the repository limitation**

This workspace is not a Git repository, so the normal per-task commits cannot be created. Report the modified files, migration command needed for the deployment environment, and verification results in the final handoff.
