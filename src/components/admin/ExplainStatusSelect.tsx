'use client';

import { CONTENT_STATUSES, contentStatusMeta, type ContentStatus } from '@/lib/explain-visibility';

/**
 * ตัวเลือกสถานะเนื้อหา — draft / review / published / hidden
 * แยกสถานะออกจากตัวข้อมูล เพื่อทยอยเปิดใช้เนื้อหาได้ทีละเรื่อง
 */
export default function ExplainStatusSelect({
  value,
  onChange,
  label = 'สถานะเนื้อหา',
}: {
  value: ContentStatus;
  onChange: (status: ContentStatus) => void;
  /** ป้ายหัวกลุ่ม — เปลี่ยนได้เมื่อใช้กับเนื้อหาชนิดอื่น เช่นกิจกรรม Tap & Select */
  label?: string;
}) {
  const meta = contentStatusMeta(value);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
          {CONTENT_STATUSES.map((status) => {
            const item = contentStatusMeta(status);
            const selected = status === value;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={selected}
                title={item.hint}
                onClick={() => onChange(status)}
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                  selected ? item.selectedClass : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.learnerVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {meta.learnerVisible ? 'ผู้เรียนเห็นเนื้อหานี้' : 'ผู้เรียนยังไม่เห็นเนื้อหานี้'}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500" data-status-hint={meta.label}>{meta.hint}</p>
    </div>
  );
}
