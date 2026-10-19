'use client';

// ─── UI Mock: AI Tutor (Figma 580:27829) ─────────────────────────────────────
// ภาพจำลองหน้าสอบพาร์ท Focus on Form ตามแบบ Figma — เปิดด้วย ?tutor=1 ที่
// /tests/focus-form/[setId] เท่านั้น (ยังไม่ deploy ผู้ใช้จริงไม่เห็น)
// - เนื้อหาก๊อบตาม Figma ทั้งหมด, ยังไม่ต่อ AI จริง (ปุ่มส่ง disabled)
// - โต้ตอบน้อยที่สุด: สลับข้อใน sidebar ได้ + พิมพ์ในช่อง AI ได้
// - ทุกค่ามาจาก get_design_context (forceCode) ของโหนดที่กำกับไว้ในคอมเมนต์ — ห้ามเดา
// - ไอคอนเป็น asset ดาวน์โหลดจาก Figma MCP วางใน public/tests/tutor-mock/
import { useState } from 'react';

const ASSET = '/tests/tutor-mock';

// ปุ่มเลขข้อในกริด (Figma 580:27838–27858) — ความกว้างพิกเซลต่อปุ่ม + สถานะคงแบบ
const NAV_CELLS = [
  { n: 1, width: 38, state: 'answered' },
  { n: 2, width: 37, state: 'answered' },
  { n: 3, width: 37, state: 'answered' },
  { n: 4, width: 37, state: 'answered' },
  { n: 5, width: 37, state: 'answered' },
  { n: 6, width: 37, state: 'answered' },
  { n: 7, width: 39, state: 'answered' },
  { n: 8, width: 37, state: 'idle' },
  { n: 9, width: 37, state: 'idle' },
] as const;

// คำในโจทย์วาง absolute ตำแหน่งซ้ายตามแบบ (Figma 580:27919–27927)
const QUESTION_WORDS: ReadonlyArray<readonly [string, number]> = [
  ['People', 0],
  ['do', 70.65],
  [' ___ ', 97.45],
  ['want', 140.8],
  ['flies', 193.78],
  ['around', 240.15],
  ['their', 312.33],
  ['houses', 362.75],
  ['.', 431.14],
];

// ตัวเลือก A–D (Figma 580:27935–27959) — A ถูกกำหนดเฉลย (เขียว) / B ตอบผิด (ชมพู)
const OPTIONS = [
  { letter: 'A', label: 'Who', box: 'bg-[#ecfdf5] border-[#cdefdf]', badge: 'bg-[#10b981] text-white' },
  { letter: 'B', label: 'Which', box: 'bg-[#fef2f2] border-[#ffd7d7]', badge: 'bg-[#f87171] text-white' },
  { letter: 'C', label: 'Whom', box: 'border-[#e2e8f0]', badge: 'bg-[#f1f5f9] text-[#64748b]' },
  { letter: 'D', label: 'Whose', box: 'border-[#e2e8f0]', badge: 'bg-[#f1f5f9] text-[#64748b]' },
] as const;

// แถวกริยาในคลังกริยา (Figma 580:27868–27890) — สามแถวตามแบบ
const VERB_ROWS: ReadonlyArray<readonly [string, string, string]> = [
  ['go', 'went', 'gone'],
  ['eat', 'ate', 'eaten'],
  ['see', 'saw', 'seen'],
];

// ข้อความ AI แรก เป๊ะตาม Figma 580:27983 — คำกริยาระบุตัวหนา + ขีดเส้นใต้ 18px
function AiSummaryBubble() {
  return (
    <div className="flex w-full items-start gap-[10px]">
      {/* avatar (580:27978) ชิดซ้าย */}
      <div className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] bg-[#c8e6ff]">
        <img src={`${ASSET}/sparkle.svg`} alt="" className="size-[15.8px]" />
      </div>
      {/* ก้อนข้อความ (580:27981-27982) — ก้อนกว้างเต็ม 709 */}
      <div className="flex w-[709px] shrink-0 flex-col items-start gap-[10px]">
        <div className="flex w-full rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] font-medium leading-[25px] text-[#334155]">
          <div className="w-[578px] whitespace-pre-wrap">
            <p>
              จากโจทย์: What{' '}
              <span className="font-bold text-[18px] underline [text-underline-position:from-font]">do</span>
              {' '}they usually{' '}
              <span className="font-bold text-[18px] underline [text-underline-position:from-font]">do</span>
              ...
            </p>
            <p>
              ให้สังเกตว่า พอตัวแรกคือ do&nbsp;&nbsp;ตัวที่สองในช่องว่างก็จะเป็น do (กริยาช่อง 1 ทันที
              ตามหลักการเลย){' '}
              <span className="font-semibold">
                เพราะ หลัง [do/does/did] ต้องตามด้วยกริยาช่อง 1&nbsp;&nbsp;เสมอ
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center px-[10px]">
          <p className="w-[531px] text-[12px] leading-[19px] text-[#536176]">AI Mentor • สรุปสูตร</p>
        </div>
      </div>
    </div>
  );
}

// ก้อนแชทฝั่งผู้เรียน (580:27986–27990)
function UserAnswerBubble() {
  return (
    <div className="flex w-[359px] flex-col items-end gap-[8px]">
      <div className="flex h-[52px] w-[361px] items-center justify-end overflow-clip rounded-[18px] bg-[#c8e6ff] pl-[19px] pr-[16px]">
        <p className="text-right text-[14px] leading-[22px] font-medium whitespace-nowrap text-[#0d6d97]">
          พิมพ์คำถามต่อในเธรดนี้ (เช่น ขอตัวอย่างโจทย์คล้ายกัน)...
        </p>
      </div>
      <div className="flex w-[359px] items-center justify-end px-[10px]">
        <p className="text-[12px] leading-[19px] text-[#536176]">คำถาม 1</p>
      </div>
    </div>
  );
}

// บล็อกตอบของ AI: แถว w-full (742) = avatar + ก้อน 709 (580:27976-27977)
function AiTurn() {
  return <AiSummaryBubble />;
}

export default function FocusFormTutorMock() {
  const [activeQuestion, setActiveQuestion] = useState(7);
  const [chatInput, setChatInput] = useState('');

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* คอนเทนต์กว้าง 1154 = sidebar 295 + 15 + เนื้อหา 844 — ขอบซ้ายขวา 191 ที่ 1536px ตามแบบ */}
      <div className="mx-auto flex w-[1154px] gap-[15px] items-start pt-[17px]">
        {/* ─── Column 1 (Figma 580:27830) ─── */}
        <div className="flex w-[295px] flex-col gap-[15px]">
          {/* ป้ายพาร์ท (580:27831) */}
          <div className="flex h-[45px] w-[295px] items-center justify-center rounded-[12px] border border-[#eaeaea] bg-white px-[20px] py-[12px] drop-shadow-[3px_3px_0px_#d5d3d3]">
            <div className="flex min-w-px flex-1 items-center">
              <p className="text-[15px] font-semibold text-[#638aaa]">Form &amp; Meaning</p>
            </div>
          </div>

          {/* กริดเลขข้อ (580:27835) */}
          <div className="flex h-[147px] w-[295px] flex-col items-start rounded-[16px] bg-white pb-[23px] pl-[26px] pr-[25px] pt-[24px]">
            <div className="flex w-[244px] flex-col gap-[19px]">
              <div className="flex w-full gap-[14px]">
                {NAV_CELLS.slice(0, 5).map((cell) => (
                  <QuestionNavCell key={cell.n} cell={cell} active={activeQuestion === cell.n} onClick={() => setActiveQuestion(cell.n)} />
                ))}
              </div>
              <div className="flex w-full gap-[14px]">
                {NAV_CELLS.slice(5).map((cell) => (
                  <QuestionNavCell key={cell.n} cell={cell} active={activeQuestion === cell.n} onClick={() => setActiveQuestion(cell.n)} />
                ))}
                {/* ปุ่มลูกศรถัดไป (580:27857) */}
                <div className="flex h-[41px] w-[39px] items-center justify-center rounded-[8px] bg-[#f8f8f8]">
                  <img src={`${ASSET}/arrow-forward.svg`} alt="" className="size-[16px]" />
                </div>
              </div>
            </div>
          </div>

          {/* คลังกริยา 3 ช่องจากข้อสอบจริง (580:27861) */}
          <div className="relative h-[343px] w-[295px] rounded-[16px] bg-white">
            {/* หัวข้อ (580:27862) */}
            <div className="absolute left-[19px] top-[16px] flex items-center gap-[8px]">
              <img src={`${ASSET}/verb-icon.png`} alt="" className="size-[24px]" />
              <p className="text-[14px] font-semibold text-[#454545]">คลังกริยา 3 ช่องจากข้อสอบจริง</p>
            </div>
            {/* ช่องค้นหา (580:27865) */}
            <div className="absolute left-[17px] top-[48px] flex h-[40px] w-[261px] items-center rounded-[11px] border border-[#d3dee7] pb-[9px] pl-[16px] pr-[30px] pt-[8px]">
              <p className="text-[13px] text-[#868686]">ค้นหาคำศัพท์</p>
            </div>
            {/* เข็ม V.1/V.2/V.3 (580:27897) */}
            <div className="absolute left-[17.92px] top-[117px] flex items-center gap-[15px]">
              {['V.1', 'V.2', 'V.3'].map((tab) => (
                <div key={tab} className="flex h-[34px] w-[77px] items-center justify-center rounded-[7px] bg-[#f7f1dc]">
                  <p className="text-[11px] font-semibold text-[#2a4246]">{tab}</p>
                </div>
              ))}
            </div>
            {/* แถวกริยา — แถวเว้นช่อง ~20px (580:27867 + แถวกริยา 580:27868–27890) */}
            {VERB_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="absolute left-[17.92px] top-[159.12px] flex" style={{ marginTop: rowIndex * 63 }}>
                {row.map((word, wordIndex) => (
                  <span key={word} className="flex items-center">
                    {wordIndex > 0 && <span className="w-[3.7px]" />}
                    {wordIndex > 0 && <span className="h-[2.18px] w-[7.65px] rounded-full bg-[#d9d9d9]" />}
                    {wordIndex > 0 && <span className="w-[3.7px]" />}
                    <div
                      style={{ width: wordIndex === 0 ? 77 : 78 }}
                      className="flex h-[42.585px] items-center justify-center rounded-[7px] bg-[#f5f5f5]"
                    >
                      <p className="text-[13px] font-medium text-[#3c3c3c]">{word}</p>
                    </div>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Column 2 (Figma 580:27904 + 580:27915) ─── */}
        <div className="flex w-[844px] flex-col gap-[15px]">
          {/* แถบ progress + ปิด (580:27904) */}
          <div className="flex items-center gap-[15px]">
            <div className="flex h-[45px] w-[786px] flex-col items-start justify-center rounded-[13px] bg-white p-[20px]">
              <div className="flex w-full items-center gap-[12px]">
                <div className="relative flex h-[14px] min-w-px flex-1 flex-col items-start justify-center overflow-clip rounded-full">
                  <div className="absolute inset-0 rounded-full bg-[#e3e2e2]" />
                  {/* แถบเริ่มดำเนินการ 251.77px ตามแบบ (580:27908) */}
                  <div className="relative flex w-[251.77px] grow flex-col items-start rounded-full bg-[#58cc02]">
                    <div className="h-[4px] w-full shrink-0 rounded-full bg-[rgba(255,255,255,0.4)]" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]" />
                </div>
                <p className="text-[11px] font-bold tracking-[0.66px] text-[#3f4a36]">ทั้งหมด 20 ข้อ</p>
              </div>
            </div>
            <div className="flex h-[38px] w-[43px] items-center justify-center rounded-[8px] border-b-[2px] border-r-[2px] border-[#c0bfb7] bg-white px-[11px] py-[10px] drop-shadow-[0px_0px_0.3px_rgba(0,0,0,0.25)]">
              <img src={`${ASSET}/close.svg`} alt="ปิด" className="size-[24px]" />
            </div>
          </div>

          {/* การ์ดสอบ (580:27915) */}
          <div className="flex w-full flex-col items-start gap-[19px] rounded-[20px] bg-white px-[26px] pb-[23px] pt-[24px]">
            <div className="flex w-[788px] flex-col items-start gap-[23px]">
              {/* โจทย์ (580:27917) */}
              <div className="flex w-[788px] flex-col items-start rounded-[10px] bg-[#f3f6f9] px-[24px] py-[21px]">
                <div className="relative h-[32.5px] w-[740px] whitespace-nowrap text-[18px] leading-[32.5px] font-medium text-[#334155]">
                  {QUESTION_WORDS.map(([word, left]) => (
                    <p key={word} className="absolute top-[-0.8px]" style={{ left }}>
                      {word}
                    </p>
                  ))}
                </div>
              </div>

              {/* ป้าย + ตัวเลือก (580:27928) */}
              <div className="flex w-full flex-col items-start gap-[23px]">
                <div className="flex items-center gap-[10px]">
                  <img src={`${ASSET}/note-text.svg`} alt="" className="size-[15px]" />
                  <p className="text-[15px] capitalize leading-[18px] font-semibold tracking-[0.35px] text-[#334155]">
                    เติมคำในช่องว่าง
                  </p>
                </div>
                <div className="flex w-full flex-col items-start gap-[16px]">
                  {/* แถวละ 2 ตัวเลือก (580:27934) */}
                  <div className="flex w-full items-center gap-[28px]">
                    {OPTIONS.slice(0, 2).map((option) => (
                      <OptionButton key={option.letter} option={option} />
                    ))}
                  </div>
                  <div className="flex w-full items-center gap-[28px]">
                    {OPTIONS.slice(2).map((option) => (
                      <OptionButton key={option.letter} option={option} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── กรอบ AI Tutor (Figma 580:27961) — content frame 580:27962 อยู่ที่ (23,12) w742 h537 ─── */}
            <div className="relative h-[573px] w-[788px] shrink-0 rounded-[15px] border border-[#e9cd62] bg-[#fffffd]">
              <div className="mx-[22px] mt-[11px] flex w-[742px] flex-col gap-[14px]">
                {/* header (580:27963) 737×46: identity flex-1 + actions ชิดขวาสุดของ 737 */}
                <div className="flex h-[46px] w-[737px] shrink-0 items-start gap-[9px] overflow-clip pt-[2px]">
                  <div className="flex min-w-px flex-1 flex-col overflow-clip">
                    <p className="text-[18px] whitespace-nowrap font-bold leading-[24px] text-[#334155]">โหมด AI</p>
                    <p className="text-[12px] whitespace-nowrap font-semibold leading-[15px] text-[#081425]">
                      ถามแล้ว 0 คำถาม <span className="text-[#6d5b16]">(เหลือโควตา 5 ครั้ง)</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-[22px] pt-[8px]">
                    <img src={`${ASSET}/rotate-cw.svg`} alt="รีเฟรช" className="size-[15px]" />
                    <img src={`${ASSET}/maximize-2.svg`} alt="ขยาย" className="size-[15px]" />
                  </div>
                </div>
                {/* เส้นแบ่ง (580:27973) */}
                <img src={`${ASSET}/line.svg`} alt="" className="w-[742px] shrink-0" />
                {/* Frame 915 (580:27974) 462.5px: แชท 379 + footer 83.5 ติดกัน (ไม่มี gap) */}
                <div className="w-[742px] shrink-0">
                  {/* แชทเลื่อนได้ (580:27975) h-379 — เนื้อหา 446 ล้น คลิปเหลือก้อนบนก้อนล่าง 12px ตามแบบ */}
                  <div className="flex h-[379px] w-full shrink-0 flex-col items-end gap-[12px] overflow-x-clip overflow-y-auto [scrollbar-width:none]">
                    <AiTurn />
                    <UserAnswerBubble />
                    <AiTurn />
                    <UserAnswerBubble />
                  </div>
                  {/* ช่องพิมพ์ (580:28021) — line + ช่อง 65px ห่างกัน 18 */}
                  <div className="flex w-full flex-col gap-[18px] pt-[1px]">
                    <img src={`${ASSET}/line.svg`} alt="" className="w-full" />
                    <div className="flex h-[65px] items-center gap-[16px] overflow-clip rounded-[13px] bg-[#f4f4f4] pl-[26px] pr-[8px]">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="พิมพ์คำถามต่อในเธรดนี้ (เช่น ขอตัวอย่างโจทย์คล้ายกัน)..."
                        className="min-w-px flex-1 bg-transparent text-[14px] leading-[22px] font-medium text-[#334155] outline-none placeholder:text-[#868686]"
                      />
                      {/* ปุ่มส่ง — mock ยังไม่ต่อ AI จึงปิดไว้ (580:28019) */}
                      <button
                        type="button"
                        disabled
                        aria-label="ส่งคำถาม"
                        className="flex size-[34px] cursor-default items-center justify-center rounded-[10px] bg-[#6f9cc1]"
                      >
                        <img src={`${ASSET}/arrow-up.svg`} alt="" className="size-[16px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── แถบล่าง (580:28028) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white pb-[32px] pt-[16px] shadow-[0px_0px_3.3px_rgba(172,172,172,0.25)]">
        <div className="mx-auto flex w-[1144px] justify-end">
          <button
            type="button"
            className="flex h-[49px] w-[216px] items-center justify-center rounded-[14px] border-b-[4px] border-r-[3px] border-[#ffdb40] bg-[#fff0ae] px-[11px] py-[10px] text-[16px] font-semibold text-[#524924]"
          >
            ข้อต่อไป
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ส่วนย่อย ────────────────────────────────────────────────────────────────

// ปุ่มเลขข้อหนึ่งช่อง — active = พื้นน้ำเงินขอบขาวตัวขาว (580:27851)
// สถานะอื่นคงสีเดิมของข้อนั้นตามแบบ: ทำแล้ว = พื้นฟ้าอ่อน (580:27838), ยังไม่ถึงคิว = เทาอ่อน (580:27853)
function QuestionNavCell({
  cell,
  active,
  onClick,
}: {
  cell: (typeof NAV_CELLS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const base = 'flex h-[41px] cursor-pointer items-center justify-center rounded-[8px] text-[13px] font-semibold';
  const skin = active
    ? 'border border-white bg-[#719cc0] text-white'
    : cell.state === 'answered'
      ? 'bg-[#dcefff] text-[#2a4246]'
      : 'bg-[#f8f8f8] text-[#585e5f]';
  return (
    <button
      type="button"
      aria-current={active || undefined}
      onClick={onClick}
      style={{ width: cell.width }}
      className={`${base} ${skin}`}
    >
      {cell.n}
    </button>
  );
}

// ปุ่มตัวเลือกในข้อสอบ (580:27935)
function OptionButton({ option }: { option: (typeof OPTIONS)[number] }) {
  return (
    <div className={`flex h-[78px] w-[380px] items-center gap-[12px] rounded-[16px] border-[1.6px] p-[16px] ${option.box}`}>
      <div className={`flex size-[28px] shrink-0 items-center justify-center rounded-[8px] ${option.badge}`}>
        <p className="text-[14px] leading-[20px]">{option.letter}</p>
      </div>
      <div className="flex w-full flex-col items-start pt-[2px]">
        <div className="relative h-[26px]">
          <p className="absolute left-[2px] top-[-0.2px] whitespace-nowrap text-[16px] leading-[26px] text-[#1e293b]">
            {option.label}
          </p>
        </div>
      </div>
    </div>
  );
}
