'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Images } from 'lucide-react';

/**
 * Section "เราจะช่วยให้เพื่อนๆสอบผ่านได้อย่างไร?" — design Figma node 42:1656
 * การ์ดใหญ่พื้นครีมขาว #FDFBF4 ขอบเหลืองประ #FDF2C3 4px มุมบนโค้ง 30px
 * Rule card + drill quiz + ทริกสำคัญ 2 ใบ + otter มาสู้ๆ
 */

// Rule card: Present Perfect (Figma 42:1949) — แถว: กฎ → ตัวอย่าง (คำ highlight ขาว)
const RULE_ROWS = [
  {
    rule: 'อยู่มาตั้งแต่อดีตจนถึงตอนนี้ ใช้ have + V.3',
    tokens: [
      { text: 'I', chip: false },
      { text: 'have', chip: true },
      { text: 'lived', chip: true },
      { text: 'here', chip: false },
      { text: 'for', chip: true },
      { text: '5 years.', chip: false },
    ],
  },
  {
    rule: 'ยังทำไม่เสร็จจนถึงวินาทีนี้ ใช้ has + V.3',
    tokens: [
      { text: 'She', chip: false },
      { text: "hasn't", chip: true },
      { text: 'finished', chip: true },
      { text: 'her report', chip: false },
      { text: 'yet.', chip: true },
    ],
  },
];

const TRICK_HIGHLIGHTS = ['Did ( ใช้กับอดีต )', 'he work', '( ไม่เติม s / ed เด็ดขาด )', 'watch'];

const DRILL_OPTIONS = ["hasn't finished", "didn't finish", "doesn't finish"];
const CORRECT = 0;

export default function HomeHelp() {
  const [picked, setPicked] = useState<number | null>(null);

  return (
 <section className="px-4 pt-[4.25rem] mt-[40px]" id="features">
  <div className="relative mx-auto max-w-[1251px] rounded-t-[30px] bg-[#FDFBF4] px-6 pt-10 sm:px-10">
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      style={{ clipPath: "inset(-4px -4px 0 -4px)" }} // เผื่อ ซ้าย/ขวา/บน ให้เส้นล้นออกได้ ตัดล่างที่ขอบการ์ด
      aria-hidden="true"
    >f
      <rect
        x="0"
        y="0"
        rx="30"
        style={{
          width: "100%",
          height: "calc(100% + 60px)", // ดันขอบล่างลงไปให้ถูกตัดทิ้ง
        }}
        fill="none"
        stroke="#FDF2C3"
        strokeWidth="4"
        strokeDasharray="4 8 12 16"
        strokeLinecap="round"
      />
    </svg>

    {/* เนื้อหาการ์ด */}

          {/* หัวข้อ section: ribbon เขียว */}
      <div className="relative mx-auto -mt-[112px] mb-10 flex w-fit items-end">
        {/* Otter อยู่ด้านหน้า */}
        <div className="relative z-20">
          <Image
            src="/logo-otter/otter-flag1.png"
            alt=""
            width={102}
            height={67}
          />
        </div>

        {/* Ribbon อยู่ด้านหลัง และซ้อนเข้าไปใต้ Otter */}
        <div className="relative z-10 -ml-[20px] flex h-[43px] items-center rounded-[16px] bg-[#8FC16A] pl-7 pr-[25px] text-[20px] font-semibold text-white sm:text-[24px]">
          เราจะช่วยให้เพื่อนๆสอบผ่านได้อย่างไร?
        </div>
      </div>

        {/* แถว 1: Rule card ซ้าย + ข้อความขวา */}
        <div className="grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Rule card (Figma 42:1949) */}
          <div className="rounded-[22px] bg-[#F1F1F1] p-[10px]">
            <div className="rounded-[14px] bg-white px-5 py-[17px]">
              {/* หัวการ์ด */}
              <div className="flex flex-wrap items-center gap-[9px]">
                <div className="flex h-[24px] items-center rounded-[7px] bg-[#F7F7F7] px-[6px] text-[13px] font-semibold text-[#6D5B16]">
                  Present Perfect: Has/Have + V.3
                </div>
                <p className="text-[13px] font-semibold text-[#404040]">
                  เหตุการณ์เกิดขึ้นตั้งแต่อดีตและยังมีผลต่อเนื่องมาจนถึงตอนนี้
                </p>
              </div>

              {/* แถวกฎ → ตัวอย่าง */}
              <div className="mt-3 flex flex-col gap-[13px]">
                {RULE_ROWS.map(({ rule, tokens }) => (
                  <div key={rule} className="flex flex-wrap items-center gap-[15px]">
                    <div className="flex h-[39px] items-center rounded-[7px] bg-[#F5F5F5] px-[21px] text-[13px] font-medium text-[#555]">
                      {rule}
                    </div>
                    <div className="flex h-[39px] items-center justify-center rounded-[7px] bg-[#F5F5F5] px-[7px] text-[13px] font-medium text-[#555]">
                      →
                    </div>
                    <div className="flex h-[39px] items-center gap-[5px] rounded-[7px] bg-[#EBF3F9] px-[12px]">
                      {tokens.map((t, i) =>
                        t.chip ? (
                          <span key={i} className="rounded-[5px] bg-white px-[4px] text-[13px] font-semibold text-[#555]">
                            {t.text}
                          </span>
                        ) : (
                          <span key={i} className="text-[13px] font-semibold text-[#555]">
                            {t.text}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* บรรทัดทริก */}
              <div className="mt-3 flex items-center gap-[7px] text-[13px] font-medium text-[#555]">
                <span className="flex size-[17px] shrink-0 items-center justify-center rounded-[4px] bg-[#C8E6FF] text-[11px]">
                  💡
                </span>
                <p>
                  ถ้าเจอคำว่า <span className="text-[#BDA857]">since, for, already, yet</span>{' '}
                  (ทำตั้งแต่เดิมจนถึงตอนนี้) ต้อง<span className="text-[#BDA857]">ใช้ Has/Have + V.3</span> เสมอ!
                </p>
              </div>
            </div>
          </div>

          {/* ข้อความประกอบขวา (Figma 42:1943) */}
          <div className="flex flex-col items-center gap-[4px] text-center">
            <div className="flex items-center gap-[11px]">
              <span className="size-[18px] rounded-[50px] bg-[#99DC65]" />
              <p className="text-[20px] font-bold text-[#6C6134] sm:text-[22px]">
                รวมหลักการและเนื้อหาที่ออกสอบจริงให้
              </p>
            </div>
            <p className="max-w-[325px] text-[18px] font-medium leading-[normal] text-[#706848]">
              แก้ปัญหาทำข้อสอบไม่ได้ เพราะไม่รู้ หลักการสำคัญที่ออกสอบแบบตรงจุด
            </p>
          </div>
        </div>

        {/* แถว 2: ข้อความซ้าย + Drill quiz ขวา */}
        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1fr_1.5fr]">
          <div className="flex flex-col items-center gap-[4px] text-center">
            <div className="flex items-center gap-[11px]">
              <span className="size-[18px] rounded-[50px] bg-[#99DC65]" />
              <p className="text-[20px] font-bold text-[#6C6134] sm:text-[22px]">
                ติวสอบจำลองเพื่อทบทวนความเข้าใจ
              </p>
            </div>
            <p className="max-w-[300px] text-[18px] font-medium leading-[normal] text-[#706848]">
              การอ่านสอบจะได้ผลดีที่สุด เมื่อได้ลงมือทำซ้ำๆ จนเข้าใจและทำได้จริง
            </p>
          </div>

          {/* Drill quiz (Figma 42:1996) */}
          <div className="rounded-[22px] bg-[#F1F1F1] p-[10px]">
            <div className="rounded-[13px] bg-white p-[16px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[4px]">
                  <span className="size-[15px] text-[13px]">📝</span>
                  <p className="text-[14px] font-semibold uppercase tracking-[0.35px] text-[#2B6C00]">
                    ลองทำโจทย์เพื่อทบทวนความเข้าใจ
                  </p>
                </div>
                <div className="flex items-center gap-[6px]">
                  {['1', '2', '3'].map((n) => (
                    <span
                      key={n}
                      className="flex size-[19px] items-center justify-center rounded-[4px] bg-[#F2F2F2] pt-[2px] text-[11px] font-semibold text-[#5C5C5C]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <p className="mt-6 text-[18px] font-semibold text-[#404040]">
                &quot;She{' '}
                <span className="inline-flex h-[24px] items-center rounded-[6px] bg-[#EFEFEF] px-[8px] text-[18px] font-normal text-[#5F5F5F]">
                  ______
                </span>{' '}
                her report yet.&quot;
              </p>

              <div className="mt-7 flex flex-wrap gap-[18px]">
                {DRILL_OPTIONS.map((opt, i) => {
                  const isPicked = picked === i;
                  const isCorrect = i === CORRECT;
                  const showState = picked !== null;
                  return (
                    <button
                      key={opt}
                      onClick={() => setPicked(i)}
                      className={`flex h-[52px] min-w-[176px] flex-1 items-center gap-[12px] rounded-[9px] border-[1.6px] px-[16px] text-left transition-colors ${
                        showState && isCorrect
                          ? 'border-[#8FC16A] bg-[#F0F9E8]'
                          : showState && isPicked && !isCorrect
                            ? 'border-[#E8A0A0] bg-[#FDF0F0]'
                            : 'border-[#E2E8F0] bg-white hover:border-[#8FC16A]'
                      }`}
                    >
                      <span className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] bg-[#F1F5F9] text-[14px] font-bold text-[#64748B]">
                        A
                      </span>
                      <span className="text-[16px] font-medium text-[#1E293B]">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* แถว 3: ทริกสำคัญ 2 ใบซ้าย + ข้อความขวา */}
        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* ทริก 2 ใบ (Figma 42:2036) */}
          <div className="flex flex-col gap-[10px] rounded-[22px] bg-[#F1F1F1] p-[10px]">
            <div className="rounded-[12px] bg-white px-[16px] py-[8px]">
              <p className="text-[14px] font-semibold text-[#6C5F2D]">💡 ทริกสำคัญ</p>
              <p className="mt-1 pl-[20px] text-[13px] font-medium leading-[22px] text-[#6C5F2D]">
                เมื่อ Do/Does/Did เป็นประธาน กริยาตัวถัดไปต้องเป็นรูปปกติทันที เช่น{' '}
                <span className="text-[#7372DF]">Did ( ใช้กับอดีต )</span> he{' '}
                <span className="text-[#7372DF]">work</span>{' '}
                <span className="text-[#7372DF]">( ไม่เติม s / ed เด็ดขาด )</span> = Did she{' '}
                <span className="text-[#7372DF]">watch</span> the movie?
              </p>
            </div>
            <div className="rounded-[12px] border border-white bg-[#FFFEFA] px-[16px] py-[8px]">
              <p className="text-[14px] font-semibold text-[#6C5F2D]">💡 ทริกสำคัญ</p>
              <ul className="mt-1 list-disc pl-[39px] text-[13px] font-medium leading-[22px] text-[#6C5F2D]">
                <li>เห็น than → นึกถึง ขั้นกว่า (เติม er หรือ more)</li>
                <li>
                  พูดถึง ที่สุดในกลุ่ม → นึกถึง ขั้นที่สุด ต้องมี the นำหน้าเสมอ (the ...est หรือ the most)
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center gap-[4px] text-center">
            <div className="flex items-center gap-[11px]">
              <span className="size-[18px] rounded-[50px] bg-[#99DC65]" />
              <p className="text-[20px] font-bold text-[#6C6134] sm:text-[22px]">
                สอบได้อย่างเข้าใจ ด้วยทริกสรุปต่างๆ
              </p>
            </div>
            <p className="max-w-[301px] text-[18px] font-medium leading-[normal] text-[#706848]">
              แก้ปัญหาจำทฤษฎียาวๆไม่ได้ เข้าห้องสอบทีไรเป็นต้องลืมทุกครั้ง
            </p>
          </div>
        </div>

        {/* Otter มาสู้ๆ (Figma 42:2049) */}
        <div className="mt-6 flex justify-end pb-5">
          <div className="relative w-[160px] translate-x-[107px]">
            <Image
              src="/logo-otter/otter-chear1.png"
              alt=""
              width={278}
              height={278}
              className="w-full h-auto"
            />
            <div className="absolute -top-10 left-1/2 flex h-[32px] w-[147px] -translate-x-1/2 items-center justify-center rounded-[30px] bg-[#FFF0AE] px-[17px] text-[14px] font-semibold text-[#6C5F2D]">
              มาสู้ๆไปด้วยกันน้า !
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
