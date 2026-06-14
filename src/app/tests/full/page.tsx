import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft, Play, Clock, ListChecks, Brain } from 'lucide-react';

export const metadata: Metadata = {
  title: 'สอบจำลองเต็มรูปแบบ | CEFR Ready',
  description: 'ข้อสอบ CEFR 45 ข้อ ครบทุกพาร์ท ระบบ Adaptive ปรับระดับตามคำตอบ',
};

const CEFR_TABLE = [
  { level: 'C2', range: '101 – 120', desc: 'เชี่ยวชาญสูงสุด' },
  { level: 'C1', range: '81 – 100', desc: 'ขั้นสูง' },
  { level: 'B2', range: '61 – 80', desc: 'ขั้นกลางสูง' },
  { level: 'B1', range: '41 – 60', desc: 'ขั้นกลาง' },
  { level: 'A2', range: '21 – 40', desc: 'ขั้นต้น' },
  { level: 'A1', range: '1 – 20', desc: 'ขั้นพื้นฐาน' },
];

export default async function FullTestIntroPage() {
  const session = await auth();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-5 h-5" /> กลับไปหน้าข้อสอบ
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">สอบจำลองเต็มรูปแบบ</h1>
      <p className="text-slate-600 mb-8">
        ทดสอบตัวเองด้วยข้อสอบ 45 ข้อที่รวมทุกพาร์ท ระบบจะปรับระดับความยากตามคำตอบของคุณแบบเรียลไทม์
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <ListChecks className="w-6 h-6 text-primary-600" />
          <div><p className="text-sm text-slate-500">จำนวนข้อ</p><p className="font-bold">45 ข้อ</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <Clock className="w-6 h-6 text-primary-600" />
          <div><p className="text-sm text-slate-500">เวลา</p><p className="font-bold">60 นาที</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary-600" />
          <div><p className="text-sm text-slate-500">ระบบ</p><p className="font-bold">Adaptive</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr><th className="text-left p-3">ระดับ CEFR</th><th className="text-left p-3">คะแนน</th><th className="text-left p-3">คำอธิบาย</th></tr>
          </thead>
          <tbody>
            {CEFR_TABLE.map((row) => (
              <tr key={row.level} className="border-t border-slate-100">
                <td className="p-3 font-bold">{row.level}</td>
                <td className="p-3">{row.range}</td>
                <td className="p-3 text-slate-600">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
        <p className="font-semibold mb-1">กติกา</p>
        <ul className="list-disc list-inside space-y-1">
          <li>ไม่สามารถย้อนกลับไปแก้ข้อก่อนหน้าได้</li>
          <li>หากไม่ตอบและกดข้อถัดไป ข้อนั้นจะถือว่าผิด</li>
          <li>เมื่อครบ 60 นาทีระบบจะส่งคำตอบโดยอัตโนมัติ</li>
          <li>สามารถกดยกเลิกการสอบได้ตลอดเวลา</li>
        </ul>
      </div>

      {session?.user ? (
        <Link
          href="/tests/full/exam"
          className="btn-primary inline-flex items-center gap-2 text-lg py-3 px-8"
        >
          <Play className="w-5 h-5" /> เริ่มสอบ
        </Link>
      ) : (
        <Link
          href="/api/auth/signin?callbackUrl=/tests/full"
          className="btn-primary inline-flex items-center gap-2 text-lg py-3 px-8"
        >
          เข้าสู่ระบบเพื่อเริ่มสอบ
        </Link>
      )}
    </div>
  );
}
