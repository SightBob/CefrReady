# Feedback Discovery Modal Design

## Goal

Tell authenticated users that they can report problems and send suggestions, without repeatedly interrupting them or overlapping the existing home-page product tour.

## Trigger and persistence

- Mount the modal on the home page only.
- Show it only when NextAuth reports an authenticated user.
- Show it once per browser using the local-storage key `cefrready-feedback-modal-seen`.
- Do not show it while the first-time home tour is active.
- If the home tour has already been completed, open the feedback modal after a short delay once the session is known.
- If the home tour runs during the current visit, `HomeTour` emits a `cefrready-tour-finished` window event when it closes or completes; the feedback modal opens after that event.
- Mark the modal as seen whenever the user dismisses it or follows its call to action.

## Content and actions

- Title: “มีความคิดเห็นอยากบอกเราไหม?”
- Description: “หากพบปัญหาในการใช้งาน หรือมีข้อเสนอแนะ คุณสามารถส่งความคิดเห็นให้เราได้ทุกเมื่อ”
- Primary action: “ส่งความคิดเห็น”, marks the modal as seen and navigates to `/contact`.
- Secondary action: “ไว้ภายหลัง”, marks the modal as seen and closes it.
- A close icon and backdrop click perform the same dismiss action.

## Accessibility and behavior

- Implement a dedicated informational dialog instead of reusing the confirmation modal, because navigation and dismissal are its only responsibilities.
- Use `role="dialog"`, `aria-modal="true"`, an accessible title and description, initial focus inside the dialog, Escape-to-close, focus restoration, and a focus trap.
- Lock body scrolling while open and restore the prior overflow value when closed.
- Keep the design consistent with the existing rounded cards, primary colors, and Lucide icons.
- If local storage is unavailable, fail safely by not repeatedly opening the modal during the mounted session.

## Files

- Create `src/components/FeedbackDiscoveryModal.tsx` for session checks, persistence, dialog behavior, and navigation.
- Modify `src/components/HomeTour.tsx` to emit the completion event.
- Modify `src/app/page.tsx` to mount the modal after `HomeTour`.

## Verification

- Signed-out users never see the modal.
- Signed-in users with an incomplete tour see the modal only after the tour closes.
- Signed-in users with a completed tour see it once after the home page loads.
- All dismissal paths persist the seen flag; the CTA routes to `/contact`.
- Keyboard focus is trapped, Escape closes, and focus returns to the previously focused element.
- Type checking, focused tests, and the production build pass.

## Out of scope

- Periodic reminders, server-side persistence, display outside the home page, analytics events, and changes to the `/contact` form.
