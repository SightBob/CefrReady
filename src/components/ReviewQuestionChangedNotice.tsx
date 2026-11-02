/**
 * การ์ดแจ้งเตือนสำหรับ attempt เก่าที่โจทย์ถูกแก้หลังจากผู้เรียนส่งคำตอบ
 *
 * attempt เหล่านั้นไม่มี `__review` snapshot จึงไม่มีทางรู้ว่าผู้เรียนเห็นตัวเลือก/เฉลยใด
 * — แสดงเฉพาะผลที่บันทึกไว้ ไม่ดึงข้อความโจทย์เวอร์ชันปัจจุบันมาแสดงคู่กัน
 */
export default function ReviewQuestionChangedNotice({ isCorrect }: { isCorrect: boolean }) {
  return (
    <div className="rounded-[20px] bg-white px-[26px] py-6">
      <p className="text-[15px] font-semibold text-slate-800">
        ข้อนี้ถูกปรับปรุงหลังคุณทำข้อสอบ
      </p>
      <p className="mt-2 text-sm text-slate-600">
        ทีมงานแก้โจทย์ข้อนี้หลังจากคุณส่งคำตอบแล้ว จึงไม่แสดงตัวเลือกและเฉลยเดิม
        ผลที่บันทึกไว้ตอนนั้น: {isCorrect ? 'ตอบถูก' : 'ตอบผิด'}
      </p>
    </div>
  );
}
