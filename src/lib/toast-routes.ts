/**
 * เส้นทางที่ `<Toaster/>` ของ sonner ต้องถูก mount
 *
 * ทำไมต้องมี: `<Toaster/>` อยู่ใน root layout จึงลาก sonner (~10 KB) ไปทุกหน้า
 * ทั้งที่ `toast()` ถูกเรียกจริงแค่บางเส้นทาง — หน้าเนื้อหา (/, /cefr, /progress,
 * /packages, หน้านโยบาย) ไม่มีทางยิง toast ได้เลย
 *
 * รายการนี้ต้องครอบทุกที่ที่ `import { toast } from 'sonner'`:
 * - /admin/**            (หน้าแอดมิน + Toggle/Editor ใน components/admin)
 * - /contact             (ฟอร์มติดต่อ)
 * - /tests/**            ([sectionId]/[setId], full/exam, full/results)
 * - /demo/**             (demo/exam ใช้ TestResults/FormMeaningQuiz ที่มี toast)
 *
 * src/lib/toast-routes.test.ts สแกนซอร์สและฟ้องถ้ามี page ใหม่ที่เรียก toast
 * แต่อยู่นอกเส้นทางเหล่านี้
 */
const TOAST_ROUTE = /^\/(admin|contact|tests|demo)(\/|$)/;

export function canShowToast(pathname: string): boolean {
  return TOAST_ROUTE.test(pathname);
}
