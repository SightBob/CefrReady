import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';

export interface TestSetData {
  id: number;
  sectionId: string;
  name: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  questionCount: number;
}

const BORDER_HOVER_MAP: Record<string, string> = {
  'focus-form': 'hover:border-blue-200 hover:shadow-blue-50',
  'focus-meaning': 'hover:border-emerald-200 hover:shadow-emerald-50',
  'form-meaning': 'hover:border-purple-200 hover:shadow-purple-50',
  'listening': 'hover:border-orange-200 hover:shadow-orange-50',
};

export default function TestSetCard({
  testSet,
  sectionId,
  index,
}: {
  testSet: TestSetData;
  sectionId: string;
  index: number;
}) {

  const isReady = testSet.questionCount >= 20;

  return (
    <Link
      href={`/tests/${sectionId}/${testSet.id}`}
      className={`
        group block bg-white rounded-2xl border border-[#BFDFEB] p-5
        
      `}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Set number circle */}
 

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-slate-900 text-[1rem] transition-colors">
              ข้อสอบ - {index + 1}
            </h3>
          </div>
          {/* Footer meta */}
          <div className="flex items-center gap-3 mt-3">
            {testSet.description && (
              <p className="text-sm text-slate-500 line-clamp-1">
                {testSet.description}
              </p>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="p-2 rounded-full flex items-center justify-center bg-[#E2E8FF]">
          <ArrowRight className="w-5 h-5 text-[#7372DF] self-center flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
