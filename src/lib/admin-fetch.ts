/**
 * ดึง JSON จาก API ของฝั่ง admin โดย throw ให้ครบทุกกรณีที่โหลดไม่ได้
 *
 * เดิมหน้า admin หลายหน้า fetch ตรง ๆ แล้วเช็คแค่ `json.success` ทำให้
 *   - network error → ถูกกลืนทิ้ง
 *   - res.ok === false → ตกไปหา .json() แล้วพังแบบงง ๆ
 *   - success: false → ไม่มี error state เลย แอดมินเห็นหน้าว่าง
 *
 * คืนค่าเป็น `data` เท่านั้น ผู้เรียกต้อง wrap ด้วย try/catch เพื่อ setError
 */
export async function fetchAdminJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  }

  if (!res.ok) {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`);
  }

  let json: { success?: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error('เซิร์ฟเวอร์ส่งข้อมูลที่อ่านไม่ได้');
  }

  if (json?.success !== true) {
    throw new Error(json?.error || 'เซิร์ฟเวอร์ไม่คืนข้อมูล');
  }

  return json.data as T;
}