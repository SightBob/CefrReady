import SectionCard, { type SectionData } from '@/components/SectionCard';
import Link from 'next/link';

export interface DemoTest {
  type: 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening';
  title: string;
  description: string;
  questions: number;
  href: string;
}

/**
 * ชุดข้อสอบตัวอย่างของ /demo — flow เดิม: 4 หน้า ชุดละ 5 ข้อ ใช้เวลา 5 นาที ไม่ต้อง login
 * ค่า description ตรงนี้ถูกใช้ต่อในหน้า /demo เท่านั้น
 */
export const demoTests: DemoTest[] = [
  {
    type: 'focus-form',
    title: 'Focus on Form',
    description: 'Try a sample test on grammatical structures, verb forms, and sentence patterns.',
    questions: 5,
    href: '/demo/focus-form',
  },
  {
    type: 'focus-meaning',
    title: 'Focus on Meaning',
    description: 'Sample vocabulary test covering meanings, synonyms, and contextual usage.',
    questions: 5,
    href: '/demo/focus-meaning',
  },
  {
    type: 'form-meaning',
    title: 'Form & Meaning',
    description: 'Sample fill-in-the-blank test combining grammar and vocabulary.',
    questions: 5,
    href: '/demo/form-meaning',
  },
  {
    type: 'listening',
    title: 'Listening',
    description: 'Sample listening comprehension test with audio passages.',
    questions: 5,
    href: '/demo/listening',
  },
];

const DEMO_MINUTES = 5;

/** แปลงข้อมูล demo ให้เข้ารูปแบบเดียวกับ SectionData ที่การ์ดใช้ */
function toSectionData(test: DemoTest): SectionData {
  return {
    id: test.type,
    name: test.title,
    description: test.description,
    icon: null,
    color: null,
    duration: DEMO_MINUTES,
    testSets: [],
  };
}

/**
 * การ์ด demo 4 ใบ ในหน้าตาเดียวกับการ์ดหมวดหมู่ของ /tests
 * วางในกริดของ TestsLandingShell แล้ว จึงไม่ห่อกริดซ้ำอีกชั้น
 * หมายเหตุเรื่อง demo วางใต้กริด (DemoInfoNote) ไม่ใช่ในกริด
 * เพื่อให้แถวการ์ดขึ้นตรงตำแหน่งเดียวกับหน้า /tests พอดี
 */
export default function DemoTestsSection() {
  return (
    <div className="contents">
      {demoTests.map((test) => (
        <SectionCard
          key={test.type}
          section={toSectionData(test)}
          href={test.href}
          secondaryLabel={`${test.questions} ข้อ`}
        />
      ))}
    </div>
  );
}

/** หมายเหตุ "ทดลองฟรี / ต้องการข้อสอบเต็ม" — ใต้กริดการ์ด */
export function DemoInfoNote() {
  return (
    <div className="mt-6 rounded-[14px] bg-[#F2F8FC] px-4 py-3 text-[13px] font-medium leading-[20px] text-[#53657F] lg:mt-8 lg:px-5">
      <p>🎉 These are sample tests with 5 questions each.</p>
      <p>
        For full tests with 20-30 questions and progress tracking,{' '}
        <Link href="/tests" className="font-semibold text-[#2A4246] underline underline-offset-2">
          login here
        </Link>
        .
      </p>
    </div>
  );
}
