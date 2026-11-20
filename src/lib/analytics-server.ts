/**
 * Server-side PostHog capture.
 *
 * ใช้กับ event ที่ browser ไม่รู้ — `signup_completed` (ตอน OAuth adapter สร้าง
 * user ใหม่) และ `test_scored` (คะแนนจริงจากฝั่งเซิร์ฟเวอร์ ใช้ reconcile กับ
 * client event ที่อาจหาย)
 *
 * ต้อง `await` เสมอ: บน serverless (Vercel) ฟังก์ชันจะถูก freeze ทันทีที่คืน
 * response — fetch แบบ fire-and-forget จึงถูกตัดทิ้งก่อนถึง PostHog
 * (นี่คือสาเหตุที่ `signup_completed` ไม่เคยยิงเลยทั้งที่มีคนสมัคร)
 * timeout กันไม่ให้ analytics หน่วง response นานเกิน 2 วิ และ error ถูกกลืน
 * เพื่อไม่ให้ analytics ทำให้การส่งข้อสอบ/สมัครสมาชิกพัง
 */
const CAPTURE_TIMEOUT_MS = 2000;

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !distinctId) return;

  // Server-to-server, so the direct host is used (no ad blockers here).
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(
    /\/+$/,
    '',
  );

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event,
        properties: { distinct_id: distinctId, ...properties },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
    });
  } catch {
    // analytics ต้องไม่ทำให้ flow หลักพัง
  }
}
