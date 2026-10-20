import { auth } from './auth';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * คอลัมน์ที่ getCurrentUser ดึง — ระบุชัดเจนทุกตัวโดยเจตนา
 *
 * เหตุผล: `db.select()` ไม่ระบุคอลัมน์ = SELECT * ซึ่งจะพังทันทีถ้าตาราง users
 * ยังไม่มีคอลัมน์ที่เพิ่งเพิ่ม (ai_tutor_access) ตอน deploy ที่ migration
 * ยังไม่ได้รัน — คิวรีจะ error และถูกกลืนใน catch ทำให้ getCurrentUser คืน null
 * ทำให้ "ส่งคำตอบ" ใช้ไม่ได้ทั้งเว็บ (ดู src/app/api/tests/submit/route.ts)
 * โค้ดนี้จึงยึดเฉพาะคอลัมน์ที่มีอยู่จริงในทุกสภาพแวดล้อม
 */
const CURRENT_USER_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  emailVerified: users.emailVerified,
  image: users.image,
  isAdmin: users.isAdmin,
  isTaster: users.isTaster,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/**
 * Get the current user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await db
      .select(CURRENT_USER_COLUMNS)
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return user.length > 0 ? user[0] : null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}
