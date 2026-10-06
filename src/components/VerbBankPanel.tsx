'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { filterVerbEntries, type VerbEntry } from '@/lib/verb-bank';
import { clearVerbEntries, loadVerbEntries, VERB_BANK_CHANGED_EVENT, VERB_BANK_STORAGE_KEY } from '@/lib/verb-bank-client';

type Column = 'v1' | 'v2' | 'v3';

const COLUMNS: { key: Column; label: string }[] = [
  { key: 'v1', label: 'V.1' },
  { key: 'v2', label: 'V.2' },
  { key: 'v3', label: 'V.3' },
];

/**
 * คลังกริยา 3 ช่องจากข้อสอบจริง — ดึงข้อมูลจาก /api/verb-banks
 *
 * variant="sidebar" — กล่องใน sidebar (Figma node 2654:1249) ค่าเดิมทั้งหมด
 * variant="modal"   — การ์ดใน modal (Figma node 249:8290) การ์ด 334px r19 p15/21
 *                     + ไอคอน 24px หน้าหัวข้อตามดีไซน์
 */
export default function VerbBankPanel({ variant = 'sidebar' }: { variant?: 'sidebar' | 'modal' }) {
  const isModal = variant === 'modal';
  const [verbs, setVerbs] = useState<VerbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCol, setActiveCol] = useState<Column | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVerbs() {
      try {
        const entries = await loadVerbEntries();
        if (cancelled) return;
        setVerbs(entries);
        setError(null);
      } catch {
        if (cancelled) return;
        setVerbs([]);
        setError('โหลดคลังกริยาไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Do not fetch the CSS-hidden desktop panel on mobile. Match the existing
    // layout breakpoint, without changing its markup or any modal behavior.
    const media = window.matchMedia('(min-width: 890px)');
    const loadIfVisible = () => { if (isModal || media.matches) void loadVerbs(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== VERB_BANK_STORAGE_KEY) return;
      clearVerbEntries(event.newValue);
      loadIfVisible();
    };
    const onFocus = () => { loadIfVisible(); };
    loadIfVisible();
    media.addEventListener('change', loadIfVisible);
    window.addEventListener(VERB_BANK_CHANGED_EVENT, loadIfVisible);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      media.removeEventListener('change', loadIfVisible);
      window.removeEventListener(VERB_BANK_CHANGED_EVENT, loadIfVisible);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [isModal]);

  const filtered = useMemo(
    () => filterVerbEntries(verbs, query, activeCol),
    [verbs, query, activeCol],
  );

  return (
    // Figma 60:3892 — การ์ด 295×343 r16, padding ข้าง 17, บน 16, ล่าง 22
    // Figma 249:8290 — modal: การ์ด 334×337 r19, px21 py15, เงา 0 0 4.95px rgba(0,0,0,.09)
    <div className={isModal
      ? 'w-full rounded-[19px] bg-white px-[21px] pt-[15px] pb-[15px] shadow-[0_0_4.95px_0_rgba(0,0,0,0.09)]  overflow-y-scroll [scrollbar-width:none] h-[343px] [&::-webkit-scrollbar]:hidden overflow-hidden'
      : 'bg-white rounded-2xl px-[17px] pt-4 pb-[22px] overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-hidden h-[343px]'}>
      {isModal ? (
        // Figma 249:8293 — ไอคอน 24×24 + หัวข้อ 14px semibold #454545, gap 8
        <div className="flex items-center gap-2">
          <Image
            src="/tests/verb-bank-icon.png"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 object-contain"
          />
          <h3 className="text-[0.875rem] font-semibold leading-[17px] text-[#454545]">คลังกริยา 3 ช่องจากข้อสอบจริง</h3>
        </div>
      ) : (
        <h3 className="pl-[2px] text-[0.875rem] font-semibold leading-[17px] text-[#454545]">คลังกริยา 3 ช่องจากข้อสอบจริง</h3>
      )}

      {/* Search — bg transparent, border #D3DEE7 radius 11, placeholder #868686 Medium 13
          Figma 249:8296 — หัวข้อสูง 24 → ช่องค้นหาเริ่มที่ +32 = gap 8 */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="ค้นหาคำศัพท์"
        aria-label="ค้นหาคำศัพท์ในคลังกริยา"
        className={`w-full h-[2.5rem] bg-transparent border border-[#D3DEE7] rounded-[11px] pl-4 pr-[30px] text-[0.8125rem] font-medium text-slate-700 placeholder:text-[#868686] focus:outline-none focus:border-[#6387A5] ${isModal ? 'mt-2' : 'mt-[15px]'}`}
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
      {/* Figma 60:3898 — แถวแรก top 159.12, gap ระหว่างแถว 18.57, pill 41.5px, gap ระหว่าง pill 15px
          Figma 249:8298 — gap 17px ระหว่างแถว, pill 43px */}
      <div className={`flex flex-col ${isModal ? 'mt-[17px] max-h-[min(58vh,420px)] gap-[17px] overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'mt-[15.12px] gap-[18.57px]'}`}>
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-4 text-[0.8125rem] font-medium text-[#868686]">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลดคลังกริยา…
          </p>
        ) : error ? (
          <p className="py-4 text-center text-[0.8125rem] font-medium text-[#868686]">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-[0.8125rem] font-medium text-[#868686]">ไม่พบคำศัพท์</p>
        ) : (
  filtered.map((v, idx) => (
  <div
    key={v.id ?? idx}
    className="relative grid grid-cols-3 gap-[15px]"
  >
    {/* V.1 */}
    <div className={`${isModal ? 'h-[43px]' : 'h-[41.5px]'} rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2`}>
      {v.v1}
    </div>

    {/* V.2 */}
    <div className={`${isModal ? 'h-[43px]' : 'h-[41.5px]'} rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2`}>
      {v.v2}
    </div>

    {/* V.3 */}
    <div className={`${isModal ? 'h-[43px]' : 'h-[41.5px]'} rounded-[7px] bg-[#F5F5F5] grid place-items-center text-[0.8125rem] font-medium text-[#3C3C3C] truncate px-2`}>
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
