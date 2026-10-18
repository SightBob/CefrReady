/**
 * ตัวป้องกัน race ของ request ที่อาจถูกยกเลิกแทนที่
 *
 * ใช้เมื่อผู้ใช้สลับ "สิ่งที่กำลังโหลด" เร็ว ๆ (เช่นสลับชุดข้อสอบ) แล้ว
 * response ของรอบเก่าอาจกลับมาทีหลังแล้วทับ state ของรอบใหม่
 *
 * สองชั้น:
 *   1. AbortController — ยกเลิก request ที่ยังค้างอยู่จริง ๆ
 *   2. เลขรอบ — กันเผื่อ response เก่าถูกยิงไปแล้วแต่ยังกลับมาทีหลัง
 */
export interface LatestRequest {
  signal: AbortSignal;
  /** false เมื่อมีรอบใหม่มาแทนแล้ว — ห้ามแตะ state */
  isCurrent(): boolean;
}

export interface LatestRequestGuard {
  begin(): LatestRequest;
  /** ยกเลิกรอบปัจจุบัน ใช้ตอน unmount */
  abort(): void;
}

export function createLatestRequestGuard(): LatestRequestGuard {
  let seq = 0;
  let controller: AbortController | null = null;

  return {
    begin() {
      controller?.abort();
      controller = new AbortController();
      const mine = ++seq;
      return {
        signal: controller.signal,
        isCurrent: () => mine === seq,
      };
    },
    abort() {
      controller?.abort();
    },
  };
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  );
}