/**
 * attempt เก่าที่ทำก่อนมี `__review` snapshot ไม่มีสำเนาโจทย์เก็บไว้ในตัว attempt
 * หน้ารีวิวจึงต้องดึงข้อความ/ตัวเลือก/เฉลยจากตาราง `questions` ปัจจุบัน
 * ถ้าแอดมินแก้ข้อนั้นหลังจากผู้เรียนส่งคำตอบแล้ว ข้อมูลที่ดึงมาจะไม่ใช่ของที่ผู้เรียน
 * เห็นตอนนั้น (คำตอบถูก/ผิดยังเป็นของเดิมจาก `user_answers.is_correct`)
 * ฟังก์ชันนี้ใช้ตัดสินว่าต้องซ่อนโจทย์ข้อนั้นจากรีวิวหรือไม่
 */
export function isQuestionChangedSinceAttempt(
  questionUpdatedAt: Date | string | null | undefined,
  attemptCompletedAt: Date | string | null | undefined,
): boolean {
  if (!questionUpdatedAt || !attemptCompletedAt) return false;

  const updated = new Date(questionUpdatedAt).getTime();
  const completed = new Date(attemptCompletedAt).getTime();
  if (Number.isNaN(updated) || Number.isNaN(completed)) return false;

  return updated > completed;
}
