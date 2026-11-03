import type { Metadata } from 'next';

/**
 * /contact — metadata ชั้น layout เพราะหน้า page.tsx ต้องเป็น 'use client'
 * (เอา metadata ไปค้างใน page ที่เป็น client component ไม่ได้)
 * ปัญหาเดิม: ไม่มี metadata → title ตกเป็นค่า default ของเว็บจนหน้าติดต่อเราใช้ title หน้าแรก
 */
export const metadata: Metadata = {
  // title ไม่ใส่ " | CEFR Ready" เอง — root layout มี template "%s | CEFR Ready" ต่อให้แล้ว
  title: 'ติดต่อเรา',
  description: 'ช่องทางติดต่อทีมงาน CEFR Ready ผ่าน Facebook และ Instagram — สอบถาม สมัครเรียน หรือแจ้งปัญหา',
  alternates: { canonical: 'https://cefr-ready.site/contact' },
  openGraph: {
    title: 'ติดต่อเรา | CEFR Ready',
    description: 'ช่องทางติดต่อทีมงาน CEFR Ready ผ่าน Facebook และ Instagram — สอบถาม สมัครเรียน หรือแจ้งปัญหา',
    url: 'https://cefr-ready.site/contact',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ติดต่อเรา | CEFR Ready',
    description: 'ช่องทางติดต่อทีมงาน CEFR Ready ผ่าน Facebook และ Instagram — สอบถาม สมัครเรียน หรือแจ้งปัญหา',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
