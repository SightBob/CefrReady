'use client';

// ─── กรอบ AI Tutor (Figma 580:27960–28021) ───────────────────────────────────
// แยกจาก FocusFormTutorMock เพื่อวางในหน้าข้อสอบจริงเมื่อ feature flag เปิด
// (isAiTutorEnabled → /api/tests/ai-tutor-access) และ mock ที่ /dev/tutor-mock
// ก็ใช้ตัวเดียวกัน เพื่อให้ "ตรง Figma ทุกพิกเซล" ยังคงเป็นความจริงข้อเดียว
//
// ระยะนี้เนื้อหาแชทยังเป็นตัวอย่างวางตามแบบ (สนทนา AI จริงจะต่อในภายหลัง) และ
// ค่า design มาจาก get_metadata / get_design_context(forceCode) ของโหนดที่กำกับ — ห้ามเดา
// ไอคอนเป็น asset ดาวน์โหลดจาก Figma MCP ใน public/tests/tutor-mock/
//
// RESPONSIVE (ผู้ใช้กำหนด 2026-10-20):
// - ≥890px ยึดเรขาคณิตตาม Figma เดิมทุกพิกเซล (788/742/737/379/46/65)
// - <890px ยืดหยุ่น: กรอบเต็มความกว้าง (w-full + max-w-788) ความสูงแชทเป็น
//   clamp(220px, 38vh, 379px) ช่องพิมพ์ไม่กินความกว้าง และเธรดเลื่อนไปข้อความล่าสุดเอง
import { useEffect, useRef, useState } from 'react';

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
      {/* ก้อนข้อความ (580:27981-27982) — กว้างเต็ม 709 (ว่างในแถว 742 ลบ avatar+gap) */}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px]">
        <div className="flex w-full rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] font-medium leading-[25px] text-[#334155]">
          {/* กว้างเนื้อความ 578 ตามแบบ — ย่ออัตโนมัติเมื่อจอแคบ */}
          <div className="w-full max-w-[578px] whitespace-pre-wrap">
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
          <p className="w-full max-w-[531px] text-[12px] leading-[19px] text-[#536176]">AI Mentor • สรุปสูตร</p>
        </div>
      </div>
    </div>
  );
}

// ก้อนแชทฝั่งผู้เรียน (580:27986–27990)
function UserAnswerBubble() {
  return (
    <div className="flex w-full max-w-[361px] flex-col items-end gap-[8px]">
      <div className="flex h-auto min-h-[52px] w-full items-center justify-end overflow-clip rounded-[18px] bg-[#c8e6ff] pl-[19px] pr-[16px] min-[890px]:h-[52px]">
        <p className="text-right text-[14px] leading-[22px] font-medium whitespace-normal text-[#0d6d97] min-[890px]:whitespace-nowrap">
          พิมพ์คำถามต่อในเธรดนี้ (เช่น ขอตัวอย่างโจทย์คล้ายกัน)...
        </p>
      </div>
      <div className="flex w-full items-center justify-end px-[10px]">
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
      {/* ก้อนข้อความ (580:27981-27982) — กันล้นด้วย min-w-0 แทนกว้าง 709 คงที่ */}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px]">
        <div className="flex w-full rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] font-medium leading-[25px] text-[#334155]">
          <div className="w-full max-w-[578px] whitespace-pre-wrap">
            <ExplanationText text={message} className="w-full" />
          </div>
        </div>
        <div className="flex items-center justify-center px-[10px]">
          <p className="w-full max-w-[531px] text-[12px] leading-[19px] text-[#536176]">AI Mentor • คำอธิบาย</p>
        </div>
      </div>
    </div>
  );
}

interface AiTutorPanelProps {
  /** คำอธิบายของข้อนี้ — ให้แทนเนื้อหาแชท demo ตามแบบ Figma
   *  (ใช้ในหน้าสอบจริงเป็นบทสนทนาแรก) ไม่ส่ง = โหมด mock คงเนื้อหาตามแบบ Figma */
  introMessage?: string | null;
  /** รหัสข้อ — ใช้แยกสถานะเธรด/ตัวนับของแต่ละข้อ เปลี่ยนข้อแล้วเริ่มเธรดใหม่ */
  threadKey?: string | number;
  /** โหมดหน้าจริง: แสดงป้าย "ทดลองใช้ (Beta)" + ข้อความกันเหตุ (หน้า mock ไม่แสดง) */
  showBetaLabels?: boolean;
}

export default function AiTutorPanel({
  introMessage,
  threadKey,
  showBetaLabels = false,
}: AiTutorPanelProps = {}) {
  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // สถานะแยกต่อข้อ: เปลี่ยนข้อ → ล้างช่องพิมพ์/เธรดของข้อเดิม (ตัวนับคำถามจะผูกกับ
  // threadKey เดียวกันตอนต่อ AI จริง) ไม่ให้สถานะข้อก่อนหน้าปนกับข้อใหม่
  useEffect(() => {
    setChatInput('');
  }, [threadKey]);

  // เธรดเลื่อนไปข้อความล่าสุดอัตโนมัติทุกครั้งที่มีข้อความใหม่
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [introMessage, threadKey]);

  return (
    <div
      className="relative w-full max-w-[788px] shrink-0 rounded-[15px] border border-[#e9cd62] bg-[#fffffd] px-[14px] pt-[11px] pb-[16px] min-[890px]:h-[573px] min-[890px]:px-[22px] min-[890px]:pb-[22px]"
      aria-label="AI Tutor"
    >
      {/* content frame 580:27962 อยู่ที่ (23,12) w742 — padding ของกรอบทำให้ได้ 742 เป๊ะ */}
      <div className="flex w-full flex-col gap-[14px]">
        {/* header (580:27963) 737×46: identity flex-1 + actions ชิดขวาสุดของ 737
            จอแคบ (<890px) ให้ส่วนหัวสูงตามเนื้อหา เพื่อไม่ให้ข้อความกันเหตุถูกตัด */}
        <div className="flex h-auto min-h-[46px] w-full max-w-[737px] shrink-0 items-start gap-[9px] overflow-clip pt-[2px] min-[890px]:h-[46px]">
          <div className="flex min-w-px flex-1 flex-col overflow-clip">
            <div className="flex items-center gap-[6px]">
              <p className="text-[18px] whitespace-nowrap font-bold leading-[24px] text-[#334155]">โหมด AI</p>
              {showBetaLabels && (
                <span className="shrink-0 rounded-full bg-[#f6ecc4] px-[7px] py-[1px] text-[10px] leading-[14px] font-semibold whitespace-nowrap text-[#6d5b16]">
                  ทดลองใช้ (Beta)
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[2px]">
              <p className="text-[12px] whitespace-nowrap font-semibold leading-[15px] text-[#081425]">
                ถามแล้ว 0 คำถาม <span className="text-[#6d5b16]">(เหลือโควตา 5 ครั้ง)</span>
              </p>
              {showBetaLabels && (
                <p className="ml-auto shrink-0 text-[11px] leading-[15px] whitespace-nowrap text-[#8a7a4e]">
                  AI อาจตอบผิดได้
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-[22px] pt-[8px]">
            <img src={`${ASSET}/rotate-cw.svg`} alt="รีเฟรช" className="size-[15px]" />
            <img src={`${ASSET}/maximize-2.svg`} alt="ขยาย" className="size-[15px]" />
          </div>
        </div>
        {/* เส้นแบ่ง (580:27973) */}
        <img src={`${ASSET}/line.svg`} alt="" className="w-full shrink-0" />
        {/* Frame 915 (580:27974) 462.5px: แชท 379 + footer 83.5 ติดกัน (ไม่มี gap) */}
        <div className="w-full shrink-0">
          {/* แชทเลื่อนได้ (580:27975) h-379 — มือถือใช้ clamp ตามความสูงจอ */}
          <div
            ref={chatRef}
            className="flex h-[clamp(220px,38vh,379px)] w-full shrink-0 flex-col items-end gap-[12px] overflow-x-clip overflow-y-auto [scrollbar-width:none] min-[890px]:h-[379px]"
          >
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
            <div className="flex h-[65px] items-center gap-[16px] overflow-clip rounded-[13px] bg-[#f4f4f4] pl-[14px] pr-[8px] min-[890px]:gap-[16px] min-[890px]:pl-[26px]">
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="พิมพ์คำถามต่อในเธรดนี้ (เช่น ขอตัวอย่างโจทย์คล้ายกัน)..."
                /* scroll-mb เผื่อแถบล่างแบบ fixed ของหน้าสอบไม่ทับช่องพิมพ์ตอนคีย์บอร์ดเปิด */
                className="min-w-px flex-1 scroll-mb-[96px] bg-transparent text-[16px] leading-[22px] font-medium text-[#334155] outline-none placeholder:text-[#868686] min-[890px]:text-[14px]"
              />
              {/* ปุ่มส่ง — AI จริงยังไม่ต่อ จึงปิดไว้ (580:28019) */}
              <button
                type="button"
                disabled
                aria-label="ส่งคำถาม"
                className="flex size-[34px] shrink-0 cursor-default items-center justify-center rounded-[10px] bg-[#6f9cc1]"
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
