import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'นโยบายการคืนเงิน — Refund Policy',
  description:
    'นโยบายการคืนเงินของ CEFR Ready เงื่อนไขและขั้นตอนการขอคืนเงินสำหรับบริการสมาชิก',
  alternates: { canonical: 'https://cefr-ready.site/refund' },
};

export default function RefundPage() {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          นโยบายการคืนเงิน
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Refund Policy &nbsp;|&nbsp; ปรับปรุงล่าสุด: 1 มิถุนายน 2569 (2026)
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-[15px] leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              1. ภาพรวม (Overview)
            </h2>
            <p>
              CEFR Ready เป็นบริการดิจิทัล (digital service) สำหรับการฝึกทักษะภาษาอังกฤษออนไลน์
              เนื่องจากลักษณะของบริการดิจิทัล
              การคืนเงินอาจจำกัดภายใต้เงื่อนไขดังต่อไปนี้
            </p>
            <p>
              CEFR Ready is a digital service for online English proficiency
              practice. Due to the nature of digital services, refunds are
              subject to the conditions outlined below.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              2. นโยบายการคืนเงิน (Refund Policy)
            </h2>

            <h3 className="text-lg font-medium text-slate-700 mb-2">
              2.1 เงื่อนไขที่สามารถขอคืนเงินได้ (Eligible Refunds)
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>ข้อผิดพลาดทางเทคนิค:</strong> หากบริการไม่สามารถใช้งานได้เนื่องจากข้อผิดพลาดทางเทคนิคของระบบ และผู้ให้บริการไม่สามารถแก้ไขได้ภายใน 7 วันทำการ</li>
              <li><strong>การชำระเงินซ้ำซ้อน:</strong> หากคุณถูกหักเงินเป็นจำนวนเดียวกันมากกว่า 1 ครั้ง โดยไม่ได้ตั้งใจ</li>
              <li><strong>ไม่ได้รับสิทธิ์สมาชิก:</strong> หากการชำระเงินสำเร็จแต่ระบบไม่ได้เปิดใช้งานสิทธิ์สมาชิกภายใน 24 ชั่วโมง</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2 mt-4">
              2.2 เงื่อนไขที่ไม่สามารถคืนเงินได้ (Non-Refundable)
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>การเปลี่ยนใจหลังจากเข้าถึงเนื้อหาสมาชิกแล้ว</li>
              <li>การซื้อผิดแพ็กเกจเนื่องจากความผิดพลายของผู้ใช้</li>
              <li>ปัญหาเกี่ยวกับเครือข่ายอินเทอร์เน็ตหรืออุปกรณ์ของผู้ใช้</li>
              <li>การขอคืนเงินหลังจากใช้งานผ่านระยะเวลาที่กำหนด</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              3. ระยะเวลาการขอคืนเงิน (Refund Request Period)
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>คำขอคืนเงินต้องยื่นภายใน <strong>7 วัน</strong> นับจากวันที่ชำระเงิน</li>
              <li>การขอคืนเงินเกินกำหนดระยะเวลาดังกล่าวจะไม่ได้รับการพิจารณา
                เว้นแต่เป็นกรณีการชำระเงินซ้ำซ้อน</li>
            </ul>
            <p className="mt-2">
              Refund requests must be submitted within <strong>7 days</strong>{' '}
              from the date of payment. Late requests will not be considered,
              except in cases of duplicate charges.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              4. วิธีการขอคืนเงิน (How to Request a Refund)
            </h2>
            <p>หากคุณต้องการขอคืนเงิน กรุณา:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>ติดต่อเราผ่านหน้า{' '}
                <Link
                  href="/contact"
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  ติดต่อเรา
                </Link>
              </li>
              <li>ระบุหมายเลขคำสั่งซื้อหรืออีเมลที่ใช้สมัคร</li>
              <li>ระบุเหตุผลในการขอคืนเงิน</li>
              <li>แนบหลักฐานการชำระเงิน (สลิปหรืออีเมลยืนยัน)</li>
            </ol>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              5. ขั้นตอนและระยะเวลาการดำเนินการ (Processing)
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>เราจะตรวจสอบและตอบกลับคำขอคืนเงินภายใน <strong>5–7 วันทำการ</strong></li>
              <li>หากคำขอได้รับอนุมัติ เงินจะคืนเข้าช่องทางเดิมที่ใช้ชำระ</li>
              <li>ระยะเวลาการรับเงินคืนขึ้นอยู่กับช่องทางชำระเงิน (ทั่วไป 3–14 วันทำการ)</li>
            </ul>
            <p className="mt-2">
              We will review and respond to refund requests within{' '}
              <strong>5–7 business days</strong>. If approved, refunds will be
              returned to the original payment method. Processing time depends
              on the payment provider (typically 3–14 business days).
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              6. การยกเลิกสมาชิก (Subscription Cancellation)
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>คุณสามารถยกเลิกสมาชิกได้ทุกเมื่อผ่านการตั้งค่าบัญชี</li>
              <li>สิทธิ์สมาชิกจะคงใช้งานได้จนกว่าระยะเวลาสมาชิกครบกำหนด</li>
              <li>การยกเลิกสมาชิกไม่ได้รับเงินคืนสำหรับระยะเวลาที่เหลืออยู่
                เว้นแต่เป็นกรณีที่อยู่ในเงื่อนไข 2.1</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              7. สิทธิตามกฎหมาย (Statutory Rights)
            </h2>
            <p>
              นโยบายนี้ไม่มีผลเสียต่อสิทธิของคุณตามกฎหมายคุ้มครองผู้บริโภค
              ของประเทศไทย หากคุณมีสิทธิตามกฎหมายที่เกินกว่าสิทธิที่ระบุไว้ในนโยบายนี้
              สิทธิตามกฎหมายจะมีผลบังคับใช้
            </p>
            <p>
              This policy does not affect your rights under Thai consumer
              protection laws. If your statutory rights exceed those described
              here, your statutory rights shall prevail.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              8. ข้อมูลติดต่อ (Contact Information)
            </h2>
            <p>
              หากมีข้อสงสัยเกี่ยวกับนโยบายการคืนเงิน กรุณาติดต่อเราผ่านหน้า{' '}
              <Link
                href="/contact"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                ติดต่อเรา
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
