'use client';

/**
 * client-side sync ของ draft ไปยังฐานข้อมูล (คู่กับ sessionStorage ใน test-progress.ts)
 *
 * หลักการ:
 * - sessionStorage ยังเป็นตัวแรกที่อ่าน (เร็ว + ใช้ได้ตอนออฟไลน์)
 * - ฝั่งเซิร์ฟเวอร์ใช้ "กู้คืนเมื่อเปิดแท็บใหม่/เครื่องอื่น" — ถ้า local ว่างแต่ server มี ให้ใช้ของ server
 * - เขียนขึ้น server แบบ debounce เพื่อไม่ยิงทุกคลิก
 */
import type { SavedAnswerCheck, TestProgressState } from './test-progress';

export type RemoteDraft = {
  index: number;
  answers: (string | null)[];
  checked: Record<number, SavedAnswerCheck>;
  choiceSeed: string | null;
};

const SYNC_DELAY_MS = 2000;

function endpoint(sectionId: string, setId: number | string): string {
  const params = new URLSearchParams({ sectionId, setId: String(setId) });
  return `/api/tests/draft?${params.toString()}`;
}

/** โหลด draft จากเซิร์ฟเวอร์ — คืน null เมื่อไม่มี/ยังไม่ล็อกอิน/ผิดพลาด */
export async function fetchTestDraft(
  sectionId: string,
  setId: number | string,
): Promise<RemoteDraft | null> {
  if (typeof window === 'undefined') return null;
  // จำกัดเวลา: หน้าสอบรอผลการกู้คืนก่อนตัดสินใจเด้งไปหน้า /explain
  // ถ้าเน็ตช้า/ค้าง ต้องไม่ทำให้ทั้งหน้าเงียบ — ตัดที่ 4 วินาทีแล้วทำต่อเหมือนไม่มี draft
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
  try {
    const response = await fetch(endpoint(sectionId, setId), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      signal: controller?.signal,
    });
    if (!response.ok) return null;
    const body = await response.json() as { success?: boolean; data?: RemoteDraft | null };
    if (!body?.success || !body.data) return null;
    if (!Number.isInteger(body.data.index) || body.data.index < 0) return null;
    return body.data;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * สร้างตัว push แบบ debounce — เรียกได้บ่อยเท่าไรก็ได้ระหว่างสอบ
 * ใช้ `keepalive` เพื่อให้คำขอสุดท้ายรอดตอนผู้เรียนออกจากหน้า
 */
export function createTestDraftPusher(sectionId: string, setId: number | string) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { state: TestProgressState; choiceSeed: string | null } | null = null;
  let disposed = false;

  const flush = () => {
    timer = null;
    if (disposed || !pending) return;
    const payload = pending;
    pending = null;
    try {
      void fetch(endpoint(sectionId, setId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
          sectionId,
          setId: Number(setId),
          index: payload.state.index,
          answers: payload.state.answers,
          checked: payload.state.checked,
          choiceSeed: payload.choiceSeed,
        }),
      }).catch(() => {
        // เก็บใน sessionStorage ไว้แล้ว — รอบถัดไปจะ sync ใหม่
      });
    } catch {
      // ไม่มีอะไรต้องทำ
    }
  };

  return {
    push(state: TestProgressState, choiceSeed: string | null) {
      if (disposed) return;
      pending = { state, choiceSeed };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, SYNC_DELAY_MS);
    },
    /** ส่งทันที (เช่น ก่อน submit/ออกจากหน้า) */
    flushNow() {
      if (timer) clearTimeout(timer);
      flush();
    },
    dispose() {
      if (timer) clearTimeout(timer);
      flush();
      disposed = true;
    },
    /**
     * ยกเลิกงานที่ค้างโดย "ไม่ส่ง" — ใช้หลังส่งข้อสอบสำเร็จ
     * (dispose() ยิง flush ก่อนปิด ทำให้ PUT ท้ายค้างไปถึงเซิร์ฟเวอร์หลัง DELETE
     *  แล้วสร้าง draft ผีของชุดที่ส่งไปแล้วกลับมา)
     */
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
      disposed = true;
    },
  };
}

/** ปิดรอบที่ค้างในฐานข้อมูล (ผู้เรียนเริ่มชุดใหม่/ส่งข้อสอบแล้ว) */
export async function clearTestDraft(sectionId: string, setId: number | string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch(endpoint(sectionId, setId), {
      method: 'DELETE',
      credentials: 'same-origin',
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}
