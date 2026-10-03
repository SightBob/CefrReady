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

export default function SectionCard({ section, disabled = false, onOpen }: { section: SectionData; disabled?: boolean; onOpen?: (section: SectionData) => void }) {
  const setCount = section.testSets.length;

  const inner = (
    <div
      className={`flex h-[177px] w-full flex-col justify-between rounded-[20px] border-[1.4px] border-[#DEEBF6] bg-white px-[21px] py-[20px] shadow-[3px_4px_0px_0px_#DEEBF6] transition-all duration-200 ${
        disabled ? 'pointer-events-none opacity-60' : 'hover:-translate-y-0.5 hover:shadow-[4px_6px_0px_0px_#DEEBF6]'
      }`}
    >
      <div className="min-w-0">
        <h3 className="truncate text-[18px] font-semibold leading-[30px] text-[#334155]">{section.name}</h3>
        {section.description && (
          <p className="mt-[4px] line-clamp-3 text-[14px] font-medium leading-[17px] text-[#53657F]">{section.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[13px] font-medium text-[#555555]">
          {section.duration != null && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-[14px] w-[14px]" strokeWidth={2.25} />
              {section.duration} นาที
            </span>
          )}
          <span className="flex items-center gap-1 whitespace-nowrap">
            <LayoutGrid className="h-[14px] w-[14px]" strokeWidth={2.25} />
            {setCount} เซ็ต
          </span>
        </div>
        <div className="flex h-[30px] w-[39px] shrink-0 items-center justify-center rounded-[12px] bg-[#8EBEE6]">
          <ArrowRight className="h-[14px] w-[14px] text-white" strokeWidth={2.75} />
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
  return <Link href={`/tests/${section.id}`}>{inner}</Link>;
}
