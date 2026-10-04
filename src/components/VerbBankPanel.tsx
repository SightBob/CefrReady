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
    // Figma 60:3892 — การ์ด 295×343 r16, padding ข้าง 17, บน 16, ล่าง 22
    <div className="bg-white rounded-2xl px-[17px] pt-4 pb-[22px]">
      <h3 className="pl-[2px] text-[0.875rem] font-semibold leading-[17px] text-[#454545]">คลังกริยา 3 ช่องจากข้อสอบจริง</h3>

      {/* Search — bg transparent, border #D3DEE7 radius 11, placeholder #868686 Medium 13 */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="ค้นหาคำศัพท์"
        className="mt-[15px] w-full h-[2.5rem] bg-transparent border border-[#D3DEE7] rounded-[11px] pl-4 pr-[30px] text-[0.8125rem] font-medium text-slate-700 placeholder:text-[#868686] focus:outline-none focus:border-[#6387A5]"
      />

      {/* V.1 / V.2 / V.3 filter chips — bg #F7F1DC, text #2A4246 SemiBold 11 */}
      {/* Figma 60:3928 — แถว 37px, gap 15px, chip 34px */}
      <div className="mt-[19px] h-[37px] grid grid-cols-3 gap-[15px] items-center">
  {COLUMNS.map(col => (
    <button
      key={col.key}
      type="button"
      onClick={() => setActiveCol(prev => (prev === col.key ? null : col.key))}
      className={`h-[34px] w-full rounded-[7px] text-[0.6875rem] font-semibold transition-colors ${
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
      {/* Figma 60:3898 — แถวแรก top 159.12, gap ระหว่างแถว 18.57, pill 41.5px, gap ระหว่าง pill 15px */}
      <div className="mt-[15.12px] flex flex-col gap-[18.57px]">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-[0.8125rem] font-medium text-[#868686]">ไม่พบคำศัพท์</p>
        ) : (
          filtered.map((v, idx) => (
  <div
    key={`${v.v1}-${idx}`}
    className="relative grid grid-cols-3 gap-[15px]"
  >
    {/* V.1 */}
    <div className="h-[41.5px] rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2">
      {v.v1}
    </div>

    {/* V.2 */}
    <div className="h-[41.5px] rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2">
      {v.v2}
    </div>

    {/* V.3 */}
    <div className="h-[41.5px] rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2">
      {v.v3}
    </div>

    {/* Figma 60:3906/60:3907 — ขีดคั่น 2 เส้น กว้าง 7.651px สูง 2.184px อยู่กลางช่องว่างระหว่าง pill */}
    <span className="absolute top-1/2 left-[32.1%] h-[2.184px] w-[7.651px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D9D9D9]" aria-hidden="true" />
    <span className="absolute top-1/2 left-[67.59%] h-[2.184px] w-[7.651px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D9D9D9]" aria-hidden="true" />
  </div>
))
        )}
      </div>
    </div>
  );
}
