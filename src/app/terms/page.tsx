import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'เงื่อนไขการให้บริการ — Terms of Service',
  description:
    'เงื่อนไขการให้บริการของ CEFR Ready แพลตฟอร์มฝึกข้อสอบ CEFR ออนไลน์',
  alternates: { canonical: 'https://cefr-ready.site/terms' },
};

export default function TermsPage() {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          เงื่อนไขการให้บริการ
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Terms of Service &nbsp;|&nbsp; ปรับปรุงล่าสุด: 1 มิถุนายน 2569 (2026)
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-[15px] leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              1. ข้อกำหนดทั่วไป (General)
            </h2>
            <p>
              การใช้บริการเว็บไซต์ CEFR Ready (&quot;บริการ&quot;) ภายใต้โดเมน
              cefr-ready.site ถือว่าผู้ใช้ (&quot;คุณ&quot;) ได้อ่าน เข้าใจ
              และยอมรับเงื่อนไขการให้บริการนี้ (&quot;ข้อกำหนด&quot;) ทั้งหมด
              หากคุณไม่ยอมรับข้อกำหนดใด ๆ กรุณางดการใช้บริการ
            </p>
            <p>
              By accessing and using the CEFR Ready website at cefr-ready.site
              (&quot;Service&quot;), you (&quot;User&quot;) acknowledge that you have read,
              understood, and agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree, please do not use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              2. ผู้ให้บริการ (Service Provider)
            </h2>
            <p>
              บริการนี้ดำเนินการและให้บริการโดยบุคคลธรรมดาที่ตั้งอยู่ใน
              ประเทศไทย ซึ่งเป็นผู้ดูแลและผู้ให้บริการแพลตฟอร์มสำหรับการฝึกทักษะภาษาอังกฤษ
              ตามมาตรฐาน CEFR ทั้งหมด
            </p>
            <p>
              This Service is operated and provided by an individual based in
              Thailand, who is the sole administrator and provider of the CEFR
              English proficiency practice platform.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              3. ลักษณะของบริการ (Description of Service)
            </h2>
            <p>CEFR Ready เป็นแพลตฟอร์มออนไลน์สำหรับ:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>แบบทดสอบทักษะภาษาอังกฤษ ประกอบด้วย Focus on Form, Focus on Meaning, Form &amp; Meaning และ Listening</li>
              <li>ระบบประเมินระดับ CEFR (A1–C2)</li>
              <li>ระบบติดตามความก้าวหน้า</li>
              <li>บทความไวยากรณ์ภาษาอังกฤษ</li>
            </ul>
            <p className="mt-2">
              บริการจัดส่งทั้งหมดในรูปแบบดิจิทัลผ่านเว็บไซต์ ไม่มีสินค้าทางกายภาพ
            </p>
            <p>
              CEFR Ready is an online platform providing English proficiency
              tests (grammar, vocabulary, cloze, and listening), CEFR level
              estimation (A1–C2), progress tracking, and grammar articles. All services are delivered
              digitally via the website. No physical goods are provided.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              4. บัญชีผู้ใช้งาน (User Accounts)
            </h2>
            <p>ผู้ใช้งานต้อง:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ลงทะเบียนผ่าน Google OAuth เพื่อสร้างบัญชี</li>
              <li>ให้ข้อมูลที่ถูกต้องและเป็นจริง</li>
              <li>รักษาความปลอดภัยของบัญชี รวมถึงรหัสผ่าน</li>
              <li>แจ้งให้ทราบทันทีหากพบการใช้งานที่ไม่ได้รับอนุญาต</li>
            </ul>
            <p className="mt-2">
              Users must register via Google OAuth, provide accurate information,
              maintain account security, and promptly report unauthorized access.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              5. แพ็กเกจบริการฟรีและแบบสมัครสมาชิก (Free and Subscription Plans)
            </h2>
            <p>
              <strong>บริการฟรี:</strong> ผู้ใช้สามารถเข้าถึงชุดข้อสอบฟรีได้ 2 ชุด
              ต่อทุกส่วน (Focus on Form, Focus on Meaning, Form &amp; Meaning,
              Listening)
            </p>
            <p>
              <strong>แพ็กเกจสมาชิก:</strong> ชุดข้อสอบที่เหลือจำเป็นต้องสมัครสมาชิก
              โดยชำระค่าบริการผ่านช่องทางชำระเงินออนไลน์
            </p>
            <p>
              <strong>Free Plan:</strong> Users may access up to 2 free test sets
              per section (Focus on Form, Focus on Meaning, Form &amp; Meaning,
              Listening).
            </p>
            <p>
              <strong>Subscription Plan:</strong> Additional test sets require a
              paid subscription, payable through online payment channels.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              6. การชำระเงิน (Payments)
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>การชำระเงินดำเนินการผ่านช่องทางชำระเงินออนไลน์ที่รองรับ</li>
              <li>ราคาและแพ็กเกจบริการอาจเปลี่ยนแปลงได้โดยไม่ต้องแจ้งให้ทราบล่วงหน้า ยกเว้นสำหรับสมาชิกที่สมัครอยู่แล้ว</li>
              <li>การชำระเงินถือว่าสำเร็จเมื่อได้รับการยืนยันจากช่องทางชำระเงิน</li>
            </ul>
            <p className="mt-2">
              Payments are processed through supported online payment channels.
              Prices and plans may change with advance notice to existing
              subscribers. A payment is considered complete upon confirmation
              from the payment provider.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              7. พฤติกรรมการใช้งานที่ห้าม (Prohibited Conduct)
            </h2>
            <p>ผู้ใช้งานห้าม:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ทำซ้ำ ดัดแปลง จำหน่าย หรือเผยแพร่เนื้อหาของบริการ</li>
              <li>ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย</li>
              <li>พยายามเข้าถึงระบบหรือข้อมูลที่ไม่ได้รับอนุญาต</li>
              <li>ใช้โปรแกรมอัตโนมัติ (bot, scraper) โดยไม่ได้รับอนุญาต</li>
              <li>แบ่งปันบัญชีหรือข้อมูลสมาชิกกับบุคคลอื่น</li>
              <li>กระทำการใด ๆ ที่ส่งผลกระทบต่อการทำงานของระบบ</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              8. ทรัพย์สินทางปัญญา (Intellectual Property)
            </h2>
            <p>
              เนื้อหาทั้งหมดบนแพลตฟอร์ม CEFR Ready รวมถึงแต่ไม่จำกัดเพียง
              ข้อสอบ บทความ เครื่องหมายการค้า โลโก้ และซอฟต์แวร์ เป็นทรัพย์สินทางปัญญา
              ของผู้ให้บริการ ห้ามทำซ้ำ ดัดแปลง หรือเผยแพร่โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
            </p>
            <p>
              All content on the CEFR Ready platform, including but not limited
              to test questions, articles, trademarks, logos, and software, is
              the intellectual property of the Service Provider. Unauthorized
              reproduction, modification, or distribution is prohibited.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              9. การจำกัดความรับผิดชอบ (Disclaimer of Warranties)
            </h2>
            <p>
              บริการนี้ให้ไว้ &quot;ตามสภาพที่เป็นอยู่&quot; (as-is) โดยไม่มีการรับประกันใด ๆ
              ทั้งโดยชัดแจ้งหรือโดยนัย ผู้ให้บริการไม่รับประกันว่า:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>บริการจะพร้อมใช้งานตลอดเวลาโดยไม่มีขัดจังหวะ</li>
              <li>ผลการประเมินระดับ CEFR จะตรงกับผลการสอบจริง</li>
              <li>เนื้อหาจะไม่มีข้อผิดพลาด</li>
            </ul>
            <p className="mt-2">
              The Service is provided &quot;as is&quot; without warranties of any kind,
              express or implied. The Service Provider does not guarantee
              uninterrupted availability, accuracy of CEFR level estimates, or
              error-free content.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              10. การจำกัดความรับผิด (Limitation of Liability)
            </h2>
            <p>
              ผู้ให้บริการไม่รับผิดชอบต่อความเสียหายใด ๆ ที่เกิดจากการใช้
              หรือไม่สามารถใช้บริการได้ รวมถึงแต่ไม่จำกัดเพียง
              ความเสียหายทางตรง ทางอ้อม ผลประโยชน์ที่หายไป หรือความเสียหายพิเศษ
              ในทุกกรณี ความรับผิดชอบสูงสุดจะไม่เกินค่าบริการที่ผู้ใช้ชำระไปแล้ว
            </p>
            <p>
              In no event shall the Service Provider be liable for any damages
              arising from the use or inability to use the Service, including
              direct, indirect, incidental, or consequential damages. Total
              liability shall not exceed the fees paid by the User.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              11. การยกเลิกและระงับบริการ (Termination)
            </h2>
            <p>
              ผู้ให้บริการมีสิทธิ์ระงับหรือยกเลิกบัญชีผู้ใช้ที่ละเมิดข้อกำหนด
              โดยไม่ต้องแจ้งล่วงหน้า ในกรณีที่มีการระงับหรือยกเลิก
              ผู้ใช้จะไม่มีสิทธิ์ขอเงินคืนสำหรับสมาชิกที่เหลืออยู่ เว้นแต่ระบบระงับเป็น
              ความผิดของผู้ให้บริการ
            </p>
            <p>
              The Service Provider may suspend or terminate accounts that
              violate these Terms without prior notice. No refund shall be
              provided for the remaining subscription period, unless the
              termination is caused by the Service Provider&apos;s fault.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              12. การเปลี่ยนแปลงข้อกำหนด (Changes to Terms)
            </h2>
            <p>
              ผู้ให้บริการอาจปรับปรุงข้อกำหนดนี้ได้ทุกเมื่อ
              การใช้บริการหลังจากมีการปรับปรุงถือว่าเป็นการยอมรับข้อกำหนดฉบับใหม่
              ผู้ให้บริการจะแจ้งการเปลี่ยนแปลงที่สำคัญผ่านเว็บไซต์
            </p>
            <p>
              The Service Provider may update these Terms at any time.
              Continued use of the Service after changes constitutes acceptance
              of the updated Terms. Significant changes will be notified via the
              website.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              13. กฎหมายที่ใช้บังคับ (Governing Law)
            </h2>
            <p>
              ข้อกำหนดนี้อยู่ภายใต้กฎหมายของราชอาณาจักรไทย
              หากเกิดข้อพิพาทใด ๆ ให้ใช้ศาลที่มีเขตอำนาจในประเทศไทยเป็นศาลที่มีอำนาจพิจารณา
            </p>
            <p>
              These Terms are governed by the laws of the Kingdom of Thailand.
              Any disputes shall be resolved by courts of competent jurisdiction
              in Thailand.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              14. ข้อมูลติดต่อ (Contact Information)
            </h2>
            <p>
              หากมีข้อสงสัยเกี่ยวกับข้อกำหนดนี้ สามารถติดต่อได้ผ่านหน้า{' '}
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
