import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว — Privacy Policy',
  description:
    'นโยบายความเป็นส่วนตัวของ CEFR Ready วิธีการเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคล',
  alternates: { canonical: 'https://cefr-ready.site/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          นโยบายความเป็นส่วนตัว
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Privacy Policy &nbsp;|&nbsp; ปรับปรุงล่าสุด: 1 มิถุนายน 2569 (2026)
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-[15px] leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              1. ภาพรวม (Overview)
            </h2>
            <p>
              CEFR Ready (&quot;เรา&quot;, &quot;ผู้ให้บริการ&quot;) ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้งาน
              นโยบายนี้อธิบายวิธีการที่เราเก็บรวบรวม ใช้ เปิดเผย และปกป้องข้อมูลส่วนบุคคลของคุณ
              ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ของประเทศไทย
            </p>
            <p>
              CEFR Ready (&quot;we&quot;, &quot;Service Provider&quot;) is committed to protecting
              your personal data. This policy explains how we collect, use,
              disclose, and protect your personal information in compliance with
              Thailand&apos;s Personal Data Protection Act B.E. 2562 (PDPA).
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              2. ข้อมูลที่เก็บรวบรวม (Data We Collect)
            </h2>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              2.1 ข้อมูลที่คุณให้โดยตรง (Directly Provided)
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>ข้อมูลบัญชี Google (ชื่อ อีเมล รูปโปรไฟล์) — ผ่าน Google OAuth</li>
              <li>ข้อมูลผลการทดสอบและความก้าวหน้าในการเรียน</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2 mt-4">
              2.2 ข้อมูลที่เก็บรวบรวมโดยอัตโนมัติ (Automatically Collected)
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>ข้อมูลการใช้งาน — หน้าที่เข้าชม ความถี่ในการใช้ ระยะเวลาใช้งาน</li>
              <li>ข้อมูลอุปกรณ์ — ประเภทเบราว์เซอร์ ระบบปฏิบัติการ หมายเลข IP</li>
              <li>Cookies และเทคโนโลยีการติดตามที่คล้ายกัน</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2 mt-4">
              2.3 ข้อมูลจากบริการภายนอก (Third-Party Services)
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Google Analytics — วิเคราะห์การใช้งานเว็บไซต์</li>
              <li>Google OAuth — การยืนยันตัวตนและการเข้าสู่ระบบ</li>
              <li>Sentry — การติดตามข้อผิดพลาด (เฉพาะเมื่อเปิดใช้งาน)</li>
              <li>Vercel Analytics — ประสิทธิภาพเว็บไซต์</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              3. วัตถุประสงค์ในการใช้ข้อมูล (Purpose of Data Use)
            </h2>
            <p>เราใช้ข้อมูลส่วนบุคคลเพื่อ:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ให้บริการและดำเนินการแพลตฟอร์มให้ทำงานอย่างถูกต้อง</li>
              <li>ปรับปรุงและพัฒนาบริการให้ดีขึ้น</li>
              <li>ติดตามความก้าวหน้าและแสดงผลการเรียน</li>
              <li>ดำเนินการชำระเงินและจัดการสมาชิก</li>
              <li>สื่อสารเกี่ยวกับบริการ การอัปเดต และประกาศสำคัญ</li>
              <li>ปฏิบัติตามกฎหมายที่เกี่ยวข้อง</li>
              <li>ป้องกันการทุจริตและการใช้งานที่ผิดกฎหมาย</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              4. ฐานทางกฎหมายในการประมวลผลข้อมูล (Legal Basis)
            </h2>
            <p>เราประมวลผลข้อมูลส่วนบุคคลของคุณตาม:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ความยินยอมของคุณ (เช่น การยอมรับ Cookies)</li>
              <li>การดำเนินการตามสัญญา (การให้บริการที่คุณขอ)</li>
              <li>หน้าที่ตามกฎหมายที่เราต้องปฏิบัติ</li>
              <li>สิทธิผลประโยชน์โดยชอบด้วยกฎหมายของผู้ให้บริการ</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              5. การเปิดเผยและแชร์ข้อมูล (Data Sharing)
            </h2>
            <p>เราไม่จำหน่าย เช่า หรือแลกเปลี่ยนข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สาม
              เราอาจแชร์ข้อมูลกับ:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>ผู้ให้บริการชำระเงิน</strong> — เฉพาะข้อมูลที่จำเป็นสำหรับการดำเนินการชำระเงิน</li>
              <li><strong>ผู้ให้บริการโฮสติ้งและโครงสร้างพื้นฐาน</strong> — Vercel (การโฮสต์), Neon (ฐานข้อมูล), Upstash (Redis), Cloudflare R2 (การเก็บไฟล์)</li>
              <li><strong>เจ้าหน้าที่ที่มีอำนาจตามกฎหมาย</strong> — เมื่อจำเป็นตามกฎหมาย</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              6. การจัดเก็บและรักษาความปลอดภัยข้อมูล (Data Storage &amp; Security)
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>ข้อมูลจัดเก็บในฐานข้อมูล PostgreSQL ผ่าน Neon (serverless) ซึ่งโฮสต์อยู่ในภูมิภาคเอเชีย</li>
              <li>เราใช้การเข้ารหัส SSL/TLS สำหรับการส่งข้อมูล</li>
              <li>รหัสผ่านและ session tokens ถูกเข้ารหัสและจัดการอย่างปลอดภัย</li>
              <li>การเข้าถึงข้อมูลถูกจำกัดเฉพาะบุคคลที่ได้รับอนุญาต</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              7. Cookies (คุกกี้)
            </h2>
            <p>เราใช้ประเภทคุกกี้ต่อไปนี้:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>จำเป็น (Essential)</strong> — NextAuth session cookie สำหรับการเข้าสู่ระบบ</li>
              <li><strong>วิเคราะห์ (Analytics)</strong> — Google Analytics, Vercel Analytics สำหรับการวิเคราะห์การใช้งาน</li>
              <li><strong>การตั้งค่า (Preferences)</strong> — การตั้งค่าที่คุณเลือกบนเว็บไซต์</li>
            </ul>
            <p className="mt-2">
              คุณสามารถจัดการค่ากาต์พวกคุกกี้ผ่านเครื่องมือจัดการคุกกี้ของเบราว์เซอร์
              การปิดใช้งานคุกกี้บางประเภทอาจส่งผลต่อการทำงานของเว็บไซต์
            </p>
            <p>
              You may manage cookie preferences through your browser settings.
              Disabling certain cookies may affect website functionality.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              8. สิทธิของผู้ใช้ข้อมูล (Data Subject Rights)
            </h2>
            <p>ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) คุณมีสิทธิ:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>เข้าถึงข้อมูล</strong> — ขอดูข้อมูลส่วนบุคคลที่เราเก็บรวบรวม</li>
              <li><strong>แก้ไขข้อมูล</strong> — ขอให้แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li><strong>ลบข้อมูล</strong> — ขอให้ลบข้อมูลส่วนบุคคล</li>
              <li><strong>จำกัดการประมวลผล</strong> — ขอให้จำกัดการใช้ข้อมูล</li>
              <li><strong>โอนย้ายข้อมูล</strong> — ขอรับข้อมูลในรูปแบบที่อ่านได้โดยเครื่อง</li>
              <li><strong>คัดค้าน</strong> — คัดค้านการประมวลผลข้อมูลในบางกรณี</li>
              <li><strong>ถอนความยินยอม</strong> — ถอนความยินยอมที่ให้ไว้ก่อนหน้านี้</li>
            </ul>
            <p className="mt-2">
              หากต้องการใช้สิทธิดังกล่าว กรุณาติดต่อเราผ่านหน้า{' '}
              <Link
                href="/contact"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                ติดต่อเรา
              </Link>{' '}
              เราจะดำเนินการตามคำขอภายใน 30 วัน
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              9. การเก็บรักษาข้อมูล (Data Retention)
            </h2>
            <p>
              เราเก็บรักษาข้อมูลส่วนบุคคลของคุณตามระยะเวลาที่จำเป็นเพื่อ:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>ให้บริการตามที่คุณขอ</li>
              <li>ปฏิบัติตามข้อกำหนดทางกฎหมาย</li>
              <li>แก้ไขข้อพิพาท</li>
            </ul>
            <p className="mt-2">
              เมื่อคุณลบบัญชี เราจะลบหรือทำให้ข้อมูลไม่สามารถระบุตัวตนได้ภายใน 30 วัน
              ยกเว้นข้อมูลที่จำเป็นต้องเก็บรักษาตามกฎหมาย
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              10. ข้อมูลของเด็ก (Children&apos;s Data)
            </h2>
            <p>
              บริการนี้ไม่มุ่งหวังผู้ใช้งานที่อายุต่ำกว่า 18 ปี
              เราไม่เก็บรวบรวมข้อมูลส่วนบุคคลของเด็กโดยเจตนา
              หากเราทราบว่าได้เก็บข้อมูลของเด็กโดยไม่ได้รับความยินยอมจากผู้ปกครอง
              เราจะดำเนินการลบข้อมูลดังกล่าวทันที
            </p>
            <p>
              This Service is not intended for users under 18 years of age. We
              do not knowingly collect personal data from children. If we become
              aware that we have collected a child&apos;s data without parental
              consent, we will delete it promptly.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              11. การเปลี่ยนแปลงนโยบาย (Changes to This Policy)
            </h2>
            <p>
              เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้ได้เป็นครั้งคราว
              การเปลี่ยนแปลงที่สำคัญจะถูกแจ้งผ่านเว็บไซต์
              วันที่ &quot;ปรับปรุงล่าสุด&quot; ด้านบนจะแสดงวันที่มีการปรับปรุงครั้งล่าสุด
            </p>
            <p>
              We may update this Privacy Policy from time to time. Significant
              changes will be notified on the website. The &quot;Last updated&quot;
              date above indicates when the policy was last revised.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              12. ข้อมูลติดต่อ (Contact Information)
            </h2>
            <p>
              สำหรับคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวหรือการใช้สิทธิของคุณ
              กรุณาติดต่อเราผ่านหน้า{' '}
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
