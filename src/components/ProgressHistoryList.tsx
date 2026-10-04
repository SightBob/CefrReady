'use client';

/**
 * Attempt history panel — Figma 172:492 … 172:559.
 *
 * Layout mirrors the Figma nodes exactly:
 *   header  → title + 90×30 filter pill (#f8f7f2, radius 8)
 *   rail    → #f3f5f7 radius-14 panel holding 44px rows
 *   row     → 174px name chip + 88px score chip + 61px CEFR chip + 26px arrow button
 *   CTA     → yellow pill (#fff0ae / #ffdb40 bottom-right borders)
 */
import { Fragment, useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { estimateCefrLevel } from '@/lib/cefr-estimator';

export interface HistoryAttempt {
  id: number;
  testTypeId: string;
  testTypeName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
}

const RANGE_OPTIONS = [
  { days: 7, label: '7 วัน' },
  { days: 30, label: '30 วัน' },
  { days: 90, label: '90 วัน' },
  { days: 0, label: 'ทั้งหมด' },
] as const;

type RangeDays = (typeof RANGE_OPTIONS)[number]['days'];

/** Grey chip when below the pass mark, green when the attempt passed. */
function cefrChip(score: number) {
  const level = estimateCefrLevel(score);
  return score >= 52
    ? { level, bg: 'bg-[#edfce5]', text: 'text-[#5b9530]' }
    : { level, bg: 'bg-[#f2f2f2]', text: 'text-[#878f9b]' };
}

export default function ProgressHistoryList({ attempts }: { attempts: HistoryAttempt[] }) {
  const [range, setRange] = useState<RangeDays>(7);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const visible = useMemo(() => {
    if (range === 0) return attempts;
    const cutoff = Date.now() - range * 24 * 60 * 60 * 1000;
    return attempts.filter((a) => {
      const t = new Date(a.completedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
  }, [attempts, range]);

  const activeLabel = RANGE_OPTIONS.find((o) => o.days === range)?.label ?? '7 วัน';

  return (
    <div className="bg-white rounded-[16px] min-[992px]:rounded-[20px] pb-[18px] pl-[17px] pr-[15px] pt-[14px] min-[992px]:pb-[19px] min-[992px]:pl-[23px] min-[992px]:pr-[18px] min-[992px]:pt-[16px] flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[9px] min-[992px]:gap-[19px] items-center w-full max-w-[406px] mx-auto min-h-0 flex-1">
        <div className="flex flex-col gap-[9px] min-[992px]:gap-[13px] w-full min-h-0 flex-1">
          {/* Header: title + range filter */}
          <div className="flex items-center justify-between w-full">
            <h2 className="font-semibold text-[14px] min-[992px]:font-bold min-[992px]:text-[16px] text-[#334155] leading-[normal] whitespace-nowrap">
              ประวัติการฝึกทำข้อสอบ
            </h2>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label="กรองตามช่วงเวลา"
                className="bg-[#f8f7f2] h-[30px] w-[90px] rounded-[8px] pt-[6px] pb-[4px] pl-[9px] flex flex-col hover:bg-[#f2f1ec] transition-colors"
              >
                <span className="flex items-center justify-center w-[76px]">
                  <span className="text-[#6b6b6b] text-[12px] font-semibold leading-[normal] w-[45px] text-left whitespace-nowrap">
                    {activeLabel}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/progress/caret-down-2.svg"
                    alt=""
                    width={14}
                    height={14}
                    className={`size-[14px] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              {open && (
                <ul
                  role="listbox"
                  aria-label="ช่วงเวลา"
                  className="absolute right-0 top-[34px] z-20 w-[90px] bg-white rounded-[8px] border border-[#ededed] py-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
                >
                  {RANGE_OPTIONS.map((o) => (
                    <li key={o.days}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={o.days === range}
                        onClick={() => {
                          setRange(o.days);
                          setOpen(false);
                        }}
                        className={`w-full text-center text-[12px] font-semibold py-[6px] transition-colors ${
                          o.days === range
                            ? 'bg-[#e6f0f8] text-[#00608a]'
                            : 'text-[#6b6b6b] hover:bg-[#f8f7f2]'
                        }`}
                      >
                        {o.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Rows */}
          {/* Figma 172:502 (desktop) / 172:7324 (mobile) — the rail is sized by its
              rows and scrolls the rest. Mobile caps at 4 rows
              (14*2 padding + 4*44 rows + 3*1 dividers + 6*14 gaps = 291px,
              derived from the mock's own node values); shorter lists shrink to
              fit, as in the Figma auto-layout frame. The mock draws no
              scrollbar, so it is hidden while the rail still scrolls. */}
          <div className="bg-[#f3f5f7] rounded-[10px] min-[992px]:rounded-[14px] px-[10px] py-[14px] flex flex-col items-stretch w-full max-h-[291px] min-[992px]:max-h-none min-[992px]:flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full min-h-[263px] text-center">
                <p className="text-[#64748b] text-[13px] font-medium">ไม่มีข้อมูลในช่วงเวลานี้</p>
                <p className="text-[#919191] text-[12px] mt-1">ลองเลือกช่วงเวลาอื่น</p>
              </div>
            ) : (
              // Figma 172:503 — rows and dividers are siblings inside one gap
              // container (gap 10px desktop, 14px on mobile), so the spacing
              // above and below each divider comes from the gap itself.
              <div className="flex flex-col gap-[14px] min-[992px]:gap-[10px] w-full shrink-0">
                {visible.map((a, i) => {
                  const chip = cefrChip(a.score);
                  const isLast = i === visible.length - 1;
                  return (
                    <Fragment key={a.id}>
                      <Link
                        href={`/review/${a.id}`}
                        className="flex gap-[11px] h-[44px] items-center w-full group shrink-0"
                      >
                        {/* 172:505 → 174px desktop, 172:7326 → 116px mobile */}
                        <div className="bg-white h-full w-[116px] min-[992px]:w-[174px] shrink-0 rounded-[7px] px-[8px] py-[8px] flex items-center justify-center">
                          <span className="text-[#525c6c] text-[13px] font-semibold leading-[24px] truncate">
                            {a.testTypeName}
                          </span>
                        </div>
                        <div className="bg-white h-full w-[61px] min-[992px]:w-[88px] shrink-0 rounded-[7px] px-[8px] py-[8px] flex items-center justify-center">
                          <span className="text-[#525c6c] text-[12px] font-semibold leading-[22px] tracking-[0.16px]">
                            {a.score.toFixed(2)}%
                          </span>
                        </div>
                        <div className="bg-white h-full w-[61px] shrink-0 rounded-[7px] pl-[7px] pr-[6px] pt-[6px] pb-[5px] flex items-center">
                          <div className={`${chip.bg} h-[33px] w-[48px] rounded-[3px] flex items-center justify-center`}>
                            <span className={`${chip.text} font-bold text-[13px] leading-[32px]`}>
                              {chip.level}
                            </span>
                          </div>
                        </div>
                        {/* 172:513 / 172:7334: 26px tile, 14px icon inset 6px */}
                        <div className="bg-[#8ebee6] size-[26px] shrink-0 rounded-[7px] p-[6px] flex items-center justify-center transition-colors group-hover:bg-[#7ab3de]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/progress/arrow-right-circle.svg"
                            alt="ดูผลลัพธ์"
                            width={14}
                            height={14}
                            className="size-[14px]"
                          />
                        </div>
                      </Link>

                      {/* The mock keeps a trailing divider; the real list drops it on the
                          last row so there is no dead space at the bottom. */}
                      {!isLast && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/progress/row-divider.svg"
                          alt=""
                          width={276}
                          height={1}
                          className="block w-[276px] max-w-full h-[1px] mx-auto shrink-0"
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Link
          href="/tests"
          className="bg-[#fff0ae] border-[#ffdb40] border-b-[3px] border-r-[2px] rounded-[10px] h-[42px] px-[11px] py-[10px] w-full flex items-center justify-center hover:bg-[#ffe98f] transition-colors shrink-0"
        >
          <span className="text-[#524924] text-[15px] font-semibold leading-[normal] text-center whitespace-nowrap">
            ทำข้อสอบ
          </span>
        </Link>
      </div>
    </div>
  );
}