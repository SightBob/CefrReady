'use client';

/**
 * Progress page — two Figma frames, same DOM:
 *   desktop  node 172:454 (1536×730) — 2 columns, left 447px / right 699px
 *   mobile   node 172:7255 (390×850) — 1 column, order = profile → results → history
 *
 * Values below come from get_design_context on each node; nothing is invented.
 * DOM order follows the mobile reading order (profile → results → history).
 * From lg up, grid placement restores the desktop frame: 447px left column
 * holding profile + history, 699px results panel spanning both rows.
 */
import { useState } from 'react';
import Link from 'next/link';
import ProgressCategoryCard from '@/components/ProgressCategoryCard';
import ProgressHistoryList, { type HistoryAttempt } from '@/components/ProgressHistoryList';

const TEST_TYPE_NAMES: Record<string, string> = {
  'focus-form': 'Focus on Form',
  'focus-meaning': 'Focus on Meaning',
  'form-meaning': 'Form & Meaning',
  listening: 'Listening',
  'full-test': 'Full Mock Exam',
};

function displayName(testTypeId: string): string {
  return (
    TEST_TYPE_NAMES[testTypeId] ||
    testTypeId
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

interface CategoryRow {
  testTypeId: string;
  averageScore: number;
  testsTaken: number;
}

interface ProgressData {
  overall: { testsTaken: number; averageScore: number };
  byCategory: CategoryRow[];
  recentAttempts: Array<{
    id: number;
    testTypeId: string;
    testTypeName: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }>;
  /** Every test type in the catalogue (id + name), whether attempted or not. */
  testTypes: Array<{ id: string; name: string }>;
  /** "คะแนนเก็บ" รวมจากเหตุผล Tap & Select ที่ admin ให้คะแนนแล้ว */
  rewardPoints: number;
}

export interface ProgressUser {
  name: string;
  email: string | null;
  image: string | null;
  joinedAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/** "เข้าร่วมเมื่อ ธันวาคม 2024" — Figma 172:485 (desktop) / 172:7262 (mobile) */
function formatJoined(iso: string | null): string {
  if (!iso) return 'เข้าร่วมเมื่อ —';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'เข้าร่วมเมื่อ —';
  return `เข้าร่วมเมื่อ ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Mobile test-type filter pill — Figma 172:7274 ────────────────────────────

function TestTypeFilter({
  options,
  selected,
  onChange,
}: {
  options: CategoryRow[];
  selected: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.testTypeId === selected) ?? options[0];
  const label = active ? displayName(active.testTypeId) : 'ทั้งหมด';

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="เลือกประเภทข้อสอบ"
        className="bg-[#f8f7f2] h-[30px] w-[127px] rounded-[8px] pt-[6px] pb-[4px] pl-[9px] pr-[8px] flex flex-col text-left hover:bg-[#f2f1ec] transition-colors"
      >
        <span className="flex items-center gap-[9px] w-[110px]">
          <span className="text-[#6b6b6b] text-[11px] font-medium leading-[normal] w-[87px] truncate">
            {label}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/progress/caret-down-grey.svg"
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
          aria-label="ประเภทข้อสอบ"
          className="absolute right-0 top-[34px] z-30 w-[127px] bg-white rounded-[8px] border border-[#ededed] py-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] max-h-[220px] overflow-y-auto"
        >
          {options.map((o) => (
            <li key={o.testTypeId}>
              <button
                type="button"
                role="option"
                aria-selected={o.testTypeId === selected}
                onClick={() => {
                  onChange(o.testTypeId);
                  setOpen(false);
                }}
                className={`w-full text-left px-[9px] py-[6px] text-[11px] leading-[normal] transition-colors ${
                  o.testTypeId === selected
                    ? 'bg-[#e6f0f8] text-[#00608a] font-semibold'
                    : 'text-[#6b6b6b] hover:bg-[#f8f7f2]'
                }`}
              >
                {displayName(o.testTypeId)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProgressContent({
  progress,
  user,
}: {
  progress: ProgressData;
  user: ProgressUser;
}) {
  // The mobile picker lists every test type in the catalogue, not only the ones
  // with data, so a type the user has never attempted is still selectable and
  // renders as 0 attempts / 0%. Types absent from the catalogue fall back to
  // whatever `byCategory` has, so the page still works if the query fails.
  const categories: CategoryRow[] = progress.testTypes?.length
    ? progress.testTypes.map((tt) => {
        const row = progress.byCategory.find((c) => c.testTypeId === tt.id);
        return {
          testTypeId: tt.id,
          averageScore: row?.averageScore ?? 0,
          testsTaken: row?.testsTaken ?? 0,
        };
      })
    : progress.byCategory;

  // Mobile shows one category card at a time (Figma 172:7280); desktop shows
  // the whole 2-column grid. Default to the first category, like the mock.
  const [selectedType, setSelectedType] = useState<string>('');
  const activeType = selectedType || categories[0]?.testTypeId || '';
  const activeCategory = categories.find((c) => c.testTypeId === activeType);

  const hasData = progress.overall.testsTaken > 0;

  // ── Empty state (no attempts yet) ──
  if (!hasData) {
    return (
      <div className="bg-[#f7f7f7] min-h-full">
        <div className="max-w-[1157px] mx-auto px-[17px] min-[992px]:px-0 py-[11px]">
          <div className="bg-white border border-[#ededed] rounded-[16px] min-[992px]:rounded-[20px] p-10 sm:p-14 flex flex-col items-center text-center gap-5 stagger-animate">
            <div className="w-16 h-16 bg-[#e6f0f8] rounded-[7px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/progress/pen.svg" alt="" width={24} height={24} />
            </div>
            <h2 className="text-xl font-bold text-[#334155] tracking-tight">ยังไม่มีข้อมูลพัฒนาการ</h2>
            <p className="text-[#64748b] text-sm max-w-xs leading-relaxed">
              เริ่มทำข้อสอบ CEFR วันนี้เพื่อดูระดับภาษาอังกฤษของคุณและติดตามพัฒนาการ
            </p>
            <div className="flex gap-3 flex-wrap justify-center mt-1">
              <Link
                href="/tests"
                className="bg-[#fff0ae] border-[#ffdb40] border-b-[3px] border-r-[2px] text-[#524924] text-[15px] font-semibold rounded-[10px] px-[11px] py-[10px] hover:bg-[#ffe98f] transition-colors"
              >
                ทำข้อสอบ
              </Link>
              <Link
                href="/demo"
                className="bg-white border border-[#ededed] text-[#334155] text-sm font-semibold rounded-[10px] px-4 py-2.5 hover:bg-[#f8f7f2] transition-colors"
              >
                ลองทำ Demo ก่อน
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Points badge — Figma 172:487 / 172:7264. Shows the user's real "คะแนนเก็บ"
  // (total reward points an admin has given for Tap & Select reasons).
  const rewardPoints = progress.rewardPoints;

  const attempts: HistoryAttempt[] = progress.recentAttempts;

  return (
    <div className="bg-[#f7f7f7] min-h-full">
      <div className="max-w-[1157px] mx-auto px-[17px] min-[992px]:px-0 py-[11px]">
        {/* DOM order follows the mobile reading order (profile → results →
            history). From lg up, an explicit 2×2 grid restores the desktop
            frame: profile (r1c1), results (r1c2), history (r2c1) — matching
            172:454 where history sits directly under the profile card.
            The results panel spans both rows so a 5th category card grows it
            rather than overflowing; row 1 stays 164px because the profile card
            is fixed at that height. */}
        <div className="flex flex-col gap-[11px] min-[992px]:grid min-[992px]:grid-cols-[447px_699px] min-[992px]:grid-rows-[164px_419px] min-[992px]:items-start">
          {/* ── Profile card ── Figma 172:479 (desktop) / 172:7256 (mobile) */}
          <section className="bg-white rounded-[16px] min-[992px]:rounded-[20px] pl-[16px] pr-[16px] pt-[14px] pb-[17px] min-[992px]:pl-[24px] min-[992px]:pr-[25px] min-[992px]:pt-[21px] min-[992px]:h-[164px] flex flex-col shrink-0">
              <div className="flex gap-[16px] min-[992px]:gap-[14px] items-center">
                {/* Figma 172:7258 → 101×100 on mobile, 172:481 → 122×122 on
                    desktop. Plain square, no radius: the bundled otter asset
                    already carries its rounded alpha corners. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.image ?? '/progress/otter-avatar.png'}
                  alt={user.name}
                  width={101}
                  height={100}
                  className="w-[101px] h-[100px] min-[992px]:w-[122px] min-[992px]:h-[122px] shrink-0 object-cover bg-[#e6f0f8]"
                />

                <div className="flex flex-col gap-[17px] min-[992px]:gap-[14px] items-start w-full min-[992px]:w-[260px] min-w-0">
                  <div className="flex flex-col items-start w-full min-[992px]:w-[243px] min-w-0">
                    <p className="font-bold text-[16px] min-[992px]:text-[20px] text-[#334155] leading-[normal] w-full truncate">
                      {user.name}
                    </p>
                    {/* 172:7262 → medium 12px #5a687b; 172:485 → semibold 14px #919191 */}
                    <p className="font-medium text-[12px] text-[#5a687b] min-[992px]:font-semibold min-[992px]:text-[14px] min-[992px]:text-[#919191] leading-[normal] w-full">
                      {formatJoined(user.joinedAt)}
                    </p>
                  </div>

                  {/* 172:7264 → 166×34 pill; desktop 172:487 → full-width 47px bar */}
                  <div className="bg-[#e6f0f8] rounded-[7px] h-[34px] w-[166px] min-[992px]:h-[47px] min-[992px]:w-full px-[12px] flex items-center justify-center">
                    <div className="flex gap-[5px] items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/progress/points-icon.svg"
                        alt=""
                        width={11}
                        height={10}
                        className="w-[10.7px] h-[9.5px] min-[992px]:w-[13.4px] min-[992px]:h-[11.9px] shrink-0"
                      />
                      <span className="text-[#00608a] text-[12px] min-[992px]:text-[14px] font-bold leading-[22px] tracking-[0.16px] whitespace-nowrap">
                        {rewardPoints} คะแนน
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          {/* ── Results panel — Figma 172:566 (desktop) / 172:7270 (mobile) ── */}
          <section className="bg-white rounded-[16px] min-[992px]:rounded-[20px] pb-[16px] pl-[17px] pr-[16px] pt-[15px] min-[992px]:pb-[14px] min-[992px]:pl-[19px] min-[992px]:pr-[22px] min-[992px]:pt-[16px] flex flex-col w-full shrink-0 min-[992px]:col-start-2 min-[992px]:row-start-1 min-[992px]:row-span-2 min-[992px]:h-full">
            <div className="flex flex-col gap-[10px] min-[992px]:gap-[12px] items-start w-full max-w-[658px] mx-auto">
              {/* Header row: 172:7272 adds the test-type pill next to the title */}
              <div className="flex items-center justify-between w-full min-[992px]:justify-start min-[992px]:gap-[12px]">
                {/* 172:7273 → "ผลลัพธ์ตามประเภทข้อสอบ" semibold 14px (mobile)
                    172:567 → "ผลลัพธ์แบ่งตามประเภทข้อสอบ" bold 16px (desktop) */}
                <h2 className="font-semibold text-[14px] text-[#334155] leading-[normal] whitespace-nowrap lg:hidden">
                  ผลลัพธ์ตามประเภทข้อสอบ
                </h2>
                <h2 className="hidden lg:block font-bold text-[16px] text-[#334155] leading-[normal] whitespace-nowrap">
                  ผลลัพธ์แบ่งตามประเภทข้อสอบ
                </h2>

                <TestTypeFilter
                  options={categories}
                  selected={activeType}
                  onChange={setSelectedType}
                />
              </div>

              {categories.length > 0 ? (
                <>
                  {/* Mobile: the single card the pill selects — 172:7280 */}
                  <div className="lg:hidden w-full">
                    {activeCategory && (
                      <ProgressCategoryCard
                        testTypeId={activeCategory.testTypeId}
                        testTypeName={displayName(activeCategory.testTypeId)}
                        averageScore={activeCategory.averageScore}
                        testsTaken={activeCategory.testsTaken}
                      />
                    )}
                  </div>

                  {/* Desktop: 2-column grid, 322px cells — 172:566 */}
                  <div className="hidden lg:grid lg:grid-cols-2 gap-x-[14px] gap-y-[14px] w-full">
                    {categories.map((category) => (
                      <ProgressCategoryCard
                        key={category.testTypeId}
                        testTypeId={category.testTypeId}
                        testTypeName={displayName(category.testTypeId)}
                        averageScore={category.averageScore}
                        testsTaken={category.testsTaken}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-[#f3f5f7] rounded-[14px] p-8 text-center border border-[#ededed] w-full">
                  <p className="text-[#64748b] text-sm">ยังไม่มีข้อมูลแยกตามประเภท</p>
                  <Link
                    href="/tests"
                    className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold border border-[#334155] text-[#334155] rounded-[8px] px-4 py-1.5 hover:bg-[#334155] hover:text-white transition-colors"
                  >
                    เริ่มทำข้อสอบ →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* History panel — Figma 172:492 (desktop) / 172:7315 (mobile) */}
          <section className="min-h-0 min-[992px]:h-[419px] shrink-0 min-[992px]:col-start-1 min-[992px]:row-start-2">
            <ProgressHistoryList attempts={attempts} />
          </section>
        </div>
      </div>
    </div>
  );
}