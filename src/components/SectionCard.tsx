import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, LayoutGrid } from 'lucide-react';
import type { TestSetData } from '@/components/TestSetCard';

export interface SectionData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  duration: number | null;
  testSets: TestSetData[];
}

/**
 * Section card.
 *
 * Mobile values come from Figma node 200:9243 (get_design_context):
 *   338×152 · radius 20 · border 1.4px #DEEBF6 · shadow 2px 2px 0 #DEEBF6
 *   padding 13px top / 21px sides / 20px bottom
 *   title 16px semibold #334155 · description 14px medium #53657F
 *   meta row: 14px icons with 4px gap, 12px between the two facts,
 *             39×30 #8EBEE6 tile with a 14px arrow
 * The desktop breakpoint keeps its own measured values, so both frames hold.
 */
interface SectionCardProps {
  section: SectionData;
  disabled?: boolean;
  onOpen?: (section: SectionData) => void;
  /** ปลายทางแทน /tests/{id} — ใช้ตอนการ์ดอยู่ในหน้า demo */
  href?: string;
  /** ข้อความข้อเท็จจริงที่สอง (ค่าเริ่มต้นคือ "{n} เซ็ต") — ใช้ตอนเป็น demo ที่นับเป็นข้อ */
  secondaryLabel?: string;
}

export default function SectionCard({ section, disabled = false, onOpen, href, secondaryLabel }: SectionCardProps) {
  const setCount = section.testSets.length;

  const inner = (
    <div
      className={`flex h-[152px] w-full flex-col justify-between rounded-[20px] border-[1.4px] border-[#DEEBF6] bg-white px-[21px] pb-[20px] pt-[13px] shadow-[2px_2px_0px_0px_#DEEBF6] transition-all duration-200 lg:h-[177px] lg:pt-[20px] lg:shadow-[3px_4px_0px_0px_#DEEBF6] ${
        disabled ? 'pointer-events-none opacity-60' : 'hover:-translate-y-0.5 lg:hover:shadow-[4px_6px_0px_0px_#DEEBF6]'
      }`}
    >
      <div className="min-w-0">
        <h3 className="truncate text-[16px] font-semibold leading-[normal] text-[#334155] lg:text-[18px] lg:leading-[30px]">
          {section.name}
        </h3>
        {section.description && (
          <p className="mt-[10px] line-clamp-3 pr-[14px] text-[14px] font-medium leading-[17px] text-[#53657F] lg:mt-[4px] lg:pr-0">
            {section.description}
          </p>
        )}
      </div>

      {/* 200:9249 — gap 12px between the two facts, arrow tile pinned right */}
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[12px] text-[13px] font-medium text-[#555555]">
          {section.duration != null && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              {/* 200:9253 / 200:9258 — icons exported from Figma */}
              <Image src="/tests/icon-time.svg" alt="" width={14} height={14} unoptimized className="h-[14px] w-[14px] shrink-0 lg:hidden" />
              <Clock className="hidden h-[14px] w-[14px] shrink-0 lg:block" strokeWidth={2.25} />
              {section.duration} นาที
            </span>
          )}
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Image src="/tests/icon-count.svg" alt="" width={14} height={14} unoptimized className="h-[14px] w-[14px] shrink-0 lg:hidden" />
            <LayoutGrid className="hidden h-[14px] w-[14px] shrink-0 lg:block" strokeWidth={2.25} />
            {secondaryLabel ?? `${setCount} เซ็ต`}
          </span>
        </div>
        <div className="flex h-[30px] w-[39px] shrink-0 items-center justify-center rounded-[12px] bg-[#8EBEE6] p-[8px]">
          <Image src="/tests/arrow-circle.svg" alt="" width={14} height={14} unoptimized className="h-[14px] w-[14px] lg:hidden" />
          <ArrowRight className="hidden h-[14px] w-[14px] text-white lg:block" strokeWidth={2.75} />
        </div>
      </div>
    </div>
  );

  if (onOpen) {
    return (
      <button type="button" onClick={() => onOpen(section)} className="block w-full text-left">
        {inner}
      </button>
    );
  }
  if (disabled) return inner;
  return <Link href={href ?? `/tests/${section.id}`}>{inner}</Link>;
}