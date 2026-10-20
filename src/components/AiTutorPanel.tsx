'use client';

// ─── กรอบ AI Tutor (Figma 580:27960–28021) ───────────────────────────────────
// แยกจาก FocusFormTutorMock เพื่อวางในหน้าข้อสอบจริงเมื่อ feature flag เปิด
// (isAiTutorEnabled → /api/tests/ai-tutor-access) และ mock ที่ /dev/tutor-mock
// ก็ใช้ตัวเดียวกัน เพื่อให้ "ตรง Figma ทุกพิกเซล" ยังคงเป็นความจริงข้อเดียว
//
// ระยะนี้เนื้อหาแชทยังเป็นตัวอย่างวางตามแบบ (สนทนา AI จริงจะต่อในภายหลัง) และ
// ค่า design มาจาก get_metadata / get_design_context(forceCode) ของโหนดที่กำกับ — ห้ามเดา
// ไอคอนเป็น asset ดาวน์โหลดจาก Figma MCP ใน public/tests/tutor-mock/
import { useState } from 'react';

import ExplanationText from './ExplanationText';

const ASSET = '/tests/tutor-mock';

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

/**
 * บทสนทนาแรกโหมดหน้าจริง — คำอธิบายของข้อ (ผู้ใช้กำหนด 2026-10-19: ย้ายคำอธิบาย
 * จากบล็อก "แวะอ่านสักนิด" มาเป็นข้อความ AI แรก) รูปแบบก้อน/อวตาร/ป้ายคงสไตล์
 * ตามแบบ Figma 580:27978-27990 เป๊ะ ต่างแค่เนื้อความเป็นของจริงจากฐานข้อมูล
 */
function AiIntroTurn({ message }: { message: string }) {
  return (
    <div className="flex w-full items-start gap-[10px]">
      {/* avatar (580:27978) ชิดซ้าย */}
      <div className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] bg-[#c8e6ff]">
        <img src={`${ASSET}/sparkle.svg`} alt="" className="size-[15.8px]" />
      </div>
      {/* ก้อนข้อความ (580:27981-27982) — กันล้นด้วย min-w-0 แทนกว้าง 578 คงที่ */}
      <div className="flex min-w-0 w-[709px] shrink-0 flex-col items-start gap-[10px]">
        <div className="flex w-full rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] font-medium leading-[25px] text-[#334155]">
          <div className="w-full whitespace-pre-wrap">
            <ExplanationText text={message} className="w-full" />
          </div>
        </div>
        <div className="flex items-center justify-center px-[10px]">
          <p className="text-[12px] leading-[19px] text-[#536176]">AI Mentor • คำอธิบาย</p>
        </div>
      </div>
    </div>
  );
}

/**
 * @param introMessage คำอธิบายของข้อนี้ — ให้แทนเนื้อหาแชท demo ตามแบบ Figma
 *   (ใช้ในหน้าสอบจริงเป็นบทสนทนาแรก) ไม่ส่ง = โหมด mock คงเนื้อหาตามแบบ Figma
 */
export default function AiTutorPanel({ introMessage }: { introMessage?: string | null } = {}) {
  const [chatInput, setChatInput] = useState('');

  return (
    <div
      className="relative h-[573px] w-[788px] shrink-0 rounded-[15px] border border-[#e9cd62] bg-[#fffffd]"
      aria-label="AI Tutor"
    >
      {/* content frame 580:27962 อยู่ที่ (23,12) w742 h537 */}
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
          {/* แชทเลื่อนได้ (580:27975) h-379 — โหมดหน้าจริง: คำอธิบายเป็นเทิร์นแรก / โหมด mock: เนื้อหา demo ตามแบบ */}
          <div className="flex h-[379px] w-full shrink-0 flex-col items-end gap-[12px] overflow-x-clip overflow-y-auto [scrollbar-width:none]">
            {introMessage ? <AiIntroTurn message={introMessage} /> : (
              <>
                <AiTurn />
                <UserAnswerBubble />
                <AiTurn />
                <UserAnswerBubble />
              </>
            )}
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
              {/* ปุ่มส่ง — AI จริงยังไม่ต่อ จึงปิดไว้ (580:28019) */}
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
  );
}
