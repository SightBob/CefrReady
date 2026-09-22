import type { Metadata } from 'next';
import UnitsPath from '@/components/UnitsPath';
import ResumeCard from '@/components/ResumeCard';
import { fetchLearningPath } from '@/lib/learning-path';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'เส้นทางการเรียน UnitsPath',
  description:
    'เส้นทางการเรียนภาษาอังกฤษ แบบจุดเลเวลซิกแซกคล้าย Duolingo — เริ่มเรียนจากพื้นฐานถึงการใช้จริง',
};

export default async function UnitsPage() {
  let units = await fetchLearningPath().catch((err) => {
    console.error('[units] Failed to fetch learning path:', err);
    return [];
  });

  return (
    <div className="max-w-[640px] mx-auto px-4 sm:px-6 pb-16 pt-[65px] max-lg:pt-[45px] min-h-svh">
      {/* Page heading */}
      <header className="text-center mb-8">
        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800">
          เส้นทางการเรียน
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mt-1">
          ก้าวผ่านทุกจุดเลเวลเพื่อปลดล็อกยูนิตถัดไป
        </p>
      </header>

      {/* เรียนต่อจากเดิม — last visited node (signed-in learners only) */}
      <ResumeCard units={units} />

      {units.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium">ยังไม่มียูนิตในระบบ</p>
          <p className="text-sm mt-1">ผู้ดูแลระบบสามารถเพิ่มยูนิตได้ที่ /admin/units</p>
        </div>
      ) : (
        <UnitsPath units={units} />
      )}
    </div>
  );
}
