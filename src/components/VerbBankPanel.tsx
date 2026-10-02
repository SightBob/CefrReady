'use client';

import { useMemo, useState } from 'react';

interface VerbEntry {
  v1: string;
  v2: string;
  v3: string;
}

interface VerbBankPanelProps {
  verbs: VerbEntry[];
}

type Column = keyof VerbEntry;

const COLUMNS: { key: Column; label: string }[] = [
  { key: 'v1', label: 'V.1' },
  { key: 'v2', label: 'V.2' },
  { key: 'v3', label: 'V.3' },
];

/** คลังกริยา 3 ช่องจากข้อสอบจริง — sidebar panel (Figma node 2654:1249) */
export default function VerbBankPanel({ verbs }: VerbBankPanelProps) {
  const [query, setQuery] = useState('');
  const [activeCol, setActiveCol] = useState<Column | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return verbs;
    return verbs.filter(v =>
      activeCol
        ? v[activeCol].toLowerCase().includes(q)
        : v.v1.toLowerCase().includes(q) || v.v2.toLowerCase().includes(q) || v.v3.toLowerCase().includes(q)
    );
  }, [verbs, query, activeCol]);

  return (
    <div className="bg-white rounded-2xl p-4 pb-8">
      <h3 className="text-[0.875rem] font-semibold text-[#454545]">คลังกริยา 3 ช่องจากข้อสอบจริง</h3>

      {/* Search — bg transparent, border #D3DEE7 radius 11, placeholder #868686 Medium 13 */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="ค้นหาคำศัพท์"
        className="mt-2 w-full h-[2.5rem] bg-transparent border border-[#D3DEE7] rounded-[11px] px-4 text-[0.8125rem] font-medium text-slate-700 placeholder:text-[#868686] focus:outline-none focus:border-[#6387A5]"
      />

      {/* V.1 / V.2 / V.3 filter chips — bg #F7F1DC, text #2A4246 SemiBold 11 */}
      <div className="mt-3 grid grid-cols-3 gap-[0.9375rem]">
  {COLUMNS.map(col => (
    <button
      key={col.key}
      type="button"
      onClick={() => setActiveCol(prev => (prev === col.key ? null : col.key))}
      className={`h-[2.125rem] w-full rounded-[7px] text-[0.6875rem] font-semibold transition-colors ${
        activeCol === col.key
          ? 'bg-[#FFDB40] text-[#2A4246]'
          : 'bg-[#F7F1DC] text-[#2A4246] hover:bg-[#FFEFB0]'
      }`}
    >
      {col.label}
    </button>
  ))}
</div>

      {/* Verb rows — pills bg #F5F5F5 radius 7, text #3C3C3C Medium 13, divider line between rows */}
      <div className="mt-4 flex flex-col gap-4">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-[0.8125rem] font-medium text-[#868686]">ไม่พบคำศัพท์</p>
        ) : (
          filtered.map((v, idx) => (
  <div
    key={`${v.v1}-${idx}`}
    className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-x-[0.3125rem]"
  >
    {/* V.1 */}
    <div className="h-[2.59375rem] rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2">
      {v.v1}
    </div>

    {/* - */}
    <span className="text-[#D5D5D5] text-[0.875rem] font-medium">
      -
    </span>

    {/* V.2 */}
    <div className="h-[2.59375rem] rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2">
      {v.v2}
    </div>

    {/* - */}
    <span className="text-[#D5D5D5] text-[0.875rem] font-medium">
      -
    </span>

    {/* V.3 */}
    <div className="h-[2.59375rem] rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2">
      {v.v3}
    </div>
  </div>
))
        )}
      </div>
    </div>
  );
}
