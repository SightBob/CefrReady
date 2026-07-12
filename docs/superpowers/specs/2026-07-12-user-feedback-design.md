# User Feedback Page Design

## Goal

Replace the general-purpose `/contact` form with a low-friction page where authenticated users can submit a free-text problem report or suggestion. Submissions must always be associated with the signed-in account.

## User experience

- Rename the page heading to “แจ้งปัญหาและข้อเสนอแนะ” and use the shorter navigation label “ความคิดเห็น”.
- Explain that users can report a problem or suggest an improvement and that every response helps improve CEFR Ready.
- Signed-in users see one required free-text field and a submit button. The field accepts 1–5,000 characters.
- Signed-out visitors see a login prompt and a Google sign-in button whose callback returns them to `/contact`. They cannot submit feedback.
- On success, clear the field and show a success toast that thanks the user. On failure, preserve the entered text and show the server-provided error where available.
- Remove the name, email, subject, and Facebook contact cards from the primary feedback flow.

## Authentication and API

- The `POST /api/contacts` endpoint reads the active session with the existing server-side `auth()` helper.
- Unauthenticated requests receive HTTP 401.
- The endpoint accepts only `{ message: string }`; it never accepts a user ID, name, or email from the browser.
- Zod validates the trimmed message as 1–5,000 characters. Existing per-minute and daily rate limits remain in place.
- The authenticated session user ID is saved with the message. Account details shown later are obtained from the users table rather than copied from client input.

## Data model and migration

- Add a nullable `user_id` foreign key from `contact_messages` to `users.id`, using `ON DELETE SET NULL`, plus an index for account lookups.
- Make the legacy `name`, `email`, and `subject` columns nullable so existing records remain intact while new submissions no longer need those fields.
- Keep all existing contact records. No destructive migration or backfill is required.
- New feedback records contain `user_id`, `message`, read state, and timestamps.

## Admin experience

- Rename the admin section to “ปัญหาและข้อเสนอแนะ”.
- The admin contacts API joins the sender account where available and returns the current account name and email.
- The message list shows the sender name or email and a truncated preview of the free-text message instead of a subject.
- The detail view shows sender identity, submission time, and the full message. The email reply action is available when the account has an email.
- Legacy records fall back to their stored name, email, and subject so they remain readable.
- Existing mark-as-read and delete behavior remains unchanged.

## Navigation and compatibility

- Keep the `/contact` URL so links from privacy, refund, and terms pages do not break.
- Use “ความคิดเห็น” in the visible header, mobile navigation, and footer. Keep the descriptive admin dashboard label “ปัญหาและข้อเสนอแนะ”.
- Legal-page link text may remain “ติดต่อเรา” where it describes a formal contact method; it still resolves to `/contact`.

## Verification

- API tests cover unauthenticated rejection, empty and oversized messages, successful authenticated submission, and ignored/spoofed identity fields.
- UI checks cover the signed-out login prompt, signed-in single-field form, loading state, success reset, and failure text preservation.
- Admin checks cover both new account-linked feedback and legacy contact records.
- Run the repository’s relevant test, type-check, and lint commands after implementation.

## Out of scope

- Feedback categories, attachments, anonymous submissions, email notifications, and workflow statuses beyond the existing read/unread state.
