import Image from 'next/image';
import HomeDrillOptions from './HomeDrillOptions';

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

export default function HomeHelp() {

  return (
 <section className="px-4 max-md:px-[17px] pt-[4.25rem] max-md:pt-0 mt-[40px] max-md:mt-[65px]" id="features">
  <div className="relative mx-auto max-w-[1251px] rounded-t-[30px] bg-[#FDFBF4] px-6 max-md:px-[14px] pt-10 max-md:pt-[65px] sm:px-10">
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      style={{ clipPath: "inset(-4px -4px 0 -4px)" }} // เผื่อ ซ้าย/ขวา/บน ให้เส้นล้นออกได้ ตัดล่างที่ขอบการ์ด
      aria-hidden="true"
    >
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
      <div className="relative mx-auto -mt-[112px] max-md:-mt-[108px] mb-10 max-md:mb-[24px] flex w-fit max-md:w-full items-end max-md:justify-center">
        {/* Otter อยู่ด้านหน้า */}
        <div className="relative z-20 max-md:shrink-0">
          <Image
            src="/logo-otter/otter-flag1.png"
            alt=""
            width={102}
            height={67}
            className="max-md:w-[56px] max-md:h-auto"
          />
        </div>

        {/* Ribbon อยู่ด้านหลัง และซ้อนเข้าไปใต้ Otter — Figma 249:3503 (464×43, padding ซ้าย 76, ข้อความ 24px) */}
        <div className="relative z-10 -ml-[20px] flex h-[43px] max-md:h-auto max-md:min-h-[30px] max-md:py-[5px] items-center rounded-[16px] bg-[#8FC16A] pl-[76px] max-md:pl-[36px] pr-[25px] max-md:pr-[16px] text-[24px] max-md:text-[12px] max-md:leading-[20px] font-semibold text-white max-sm:text-[14px]">
          จะช่วยให้เพื่อนๆสอบผ่านได้อย่างไร?
        </div>
      </div>

        {/* แถว 1: Rule card ซ้าย + ข้อความขวา — tablet/มือถือเรียงหัวข้อก่อนการ์ด (249:4691) */}
        <div className="grid items-center gap-8 max-md:gap-[16px] lg:grid-cols-[1.5fr_1fr]">
          {/* Rule card (Figma 42:1949) */}
          <div className="max-lg:order-2 rounded-[22px] max-md:rounded-[16px] bg-[#F1F1F1] max-md:bg-[#E0EDD7] p-[10px] max-md:p-[12px]">
            <div className="rounded-[14px] max-md:rounded-[12px] bg-white px-5 max-md:px-[10px] py-[17px] max-md:py-[11px]">
              {/* หัวการ์ด */}
              <div className="flex flex-wrap items-center gap-[9px]">
                <div className="flex h-[24px] max-md:h-auto items-center rounded-[7px] bg-[#F7F7F7] max-md:bg-[#FFF5CF] px-[6px] max-md:py-[4px] text-[13px] max-md:text-[12px] max-md:leading-[24px] font-semibold text-[#6D5B16]">
                  Present Perfect: Has/Have + V.3
                </div>
                <p className="max-md:min-w-0 text-[13px] max-md:text-[12px] max-md:leading-[22px] font-semibold text-[#404040]">
                  เหตุการณ์เกิดขึ้นตั้งแต่อดีตและยังมีผลต่อเนื่องมาจนถึงตอนนี้
                </p>
              </div>

              {/* แถวกฎ → ตัวอย่าง */}
              <div className="mt-3 max-md:mt-[10px] flex flex-col gap-[13px] max-md:gap-[10px] max-md:border-y max-md:border-[#E9E9E9] max-md:py-[18px]">
                {RULE_ROWS.map(({ rule, tokens }) => (
                  <div key={rule} className="flex flex-wrap items-center max-md:flex-col max-md:items-stretch gap-[15px] max-md:gap-[10px]">
                    <div className="flex min-h-[39px] max-md:w-full items-center rounded-[7px] bg-[#F5F5F5] px-[21px] max-md:px-[10px] max-md:py-[5px] max-md:text-[12px] max-md:leading-[22px] text-[13px] font-medium text-[#555]">
                      {rule}
                    </div>

                    {/*
                      wrapper ของ "→ ตัวอย่าง" ให้สองส่วนนี้ไม่ถูก wrap แยกกันอีก
                      - ≥391px : อยู่บรรทัดเดียวกันเสมอ (ตัวอย่างขยายเต็มที่เหลือ)
                      - ≤390px : max-[390px]:contents → โครงสร้างเท่าเดิม (คง layout 390px)
                    */}
                    <div className="flex items-center gap-[15px] max-md:w-full max-md:gap-[10px] max-[390px]:contents">
                      <div className="flex h-[39px] max-md:h-[23px] max-md:w-[24px] shrink-0 items-center justify-center rounded-[7px] bg-[#F5F5F5] px-[7px] max-[390px]:self-start text-[13px] font-medium text-[#555]">
                        →
                      </div>
                      <div className="flex min-h-[39px] max-md:min-w-0 max-[390px]:w-full min-[391px]:max-md:flex-1 max-md:flex-wrap items-center gap-[5px] rounded-[7px] bg-[#EBF3F9] max-md:bg-[#FFF5CF] px-[12px] max-md:px-[10px] min-[391px]:max-md:py-[4px]">
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
                  </div>
                ))}
              </div>

              {/* บรรทัดทริก */}
              <div className="mt-3 flex items-center max-md:items-start gap-[7px] text-[13px] max-md:text-[11px] max-md:leading-[22px] font-medium text-[#555]">
                <span className="flex size-[17px] shrink-0 items-center justify-center rounded-[4px] bg-[#C8E6FF] max-md:bg-[#F1F1F1] text-[11px]">
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
          <div className="max-lg:order-1 max-md:items-start max-md:text-left flex flex-col items-center gap-[4px] text-center">
            <div className="flex items-center gap-[11px]">
              <span className="size-[18px] max-md:size-[16px] rounded-[50px] max-md:border-[5px] max-md:border-[#D4FFB2] bg-[#99DC65]" />
              <p className="text-[20px] max-md:text-[15px] font-bold text-[#6C6134] sm:text-[22px]">
                รวมหลักการและเนื้อหาที่ออกสอบจริงให้
              </p>
            </div>
            <p className="max-w-[325px] max-md:w-full max-md:pl-[27px] max-md:pr-[10px] text-[18px] max-md:text-[14px] font-medium leading-[normal] text-[#706848]">
              แก้ปัญหาทำข้อสอบไม่ได้ เพราะไม่รู้ หลักการสำคัญที่ออกสอบแบบตรงจุด
            </p>
          </div>
        </div>

        {/* แถว 2: ข้อความซ้าย + Drill quiz ขวา */}
        <div className="mt-10 max-md:mt-[24px] grid items-center gap-8 max-md:gap-[16px] lg:grid-cols-[1fr_1.5fr]">
          <div className="max-lg:order-1 max-md:items-start max-md:text-left flex flex-col items-center gap-[4px] text-center">
            {/* Figma 249:3328 — จุดเขียวอยู่ขวาของหัวข้อ (มือถือยังอยู่ซ้ายตาม Figma 249:4518) */}
            <div className="flex items-center justify-end gap-[11px] max-md:flex-row-reverse max-md:justify-start">
              <p className="text-[20px] max-md:text-[15px] font-bold text-[#6C6134] sm:text-[22px]">
                ติวสอบจำลองเพื่อทบทวนความเข้าใจ
              </p>
              <span className="size-[18px] max-md:size-[16px] shrink-0 rounded-[50px] max-md:border-[5px] max-md:border-[#D4FFB2] bg-[#99DC65]" />
            </div>
            <p className="max-w-[300px] max-md:w-full max-md:pl-[27px] max-md:pr-[10px] text-[18px] max-md:text-[14px] font-medium leading-[normal] text-[#706848]">
              การอ่านสอบจะได้ผลดีที่สุด เมื่อได้ลงมือทำซ้ำๆ จนเข้าใจและทำได้จริง
            </p>
          </div>

          {/* Drill quiz (Figma 42:1996) — มือถือ 249:4739: การ์ดขาวขอบ #E0EDD7 */}
          <div className="max-lg:order-2 rounded-[22px] max-md:rounded-[14px] bg-[#F1F1F1] max-md:border-[7px] max-md:border-[#E0EDD7] max-md:bg-white p-[10px] max-md:p-[16px]">
            <div className="rounded-[13px] bg-white p-[16px] max-md:rounded-none max-md:bg-transparent max-md:p-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[4px]">
                  <span className="size-[15px] text-[13px]">📝</span>
                  <p className="text-[14px] max-md:text-[11px] font-semibold uppercase tracking-[0.35px] text-[#2B6C00] max-md:text-[#497293]">
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

              <p className="mt-6 max-md:mt-[16px] max-md:text-[12px] max-md:leading-[24px] text-[18px] font-semibold text-[#404040]">
                &quot;She{' '}
                <span className="inline-flex h-[24px] items-center rounded-[6px] bg-[#EFEFEF] px-[8px] text-[18px] max-md:text-[13px] font-normal text-[#5F5F5F]">
                  ______
                </span>{' '}
                her report yet.&quot;
              </p>

              <HomeDrillOptions />
            </div>
          </div>
        </div>

        {/* แถว 3: ทริกสำคัญ 2 ใบซ้าย + ข้อความขวา */}
        <div className="mt-10 max-md:mt-[24px] grid items-center gap-8 max-md:gap-[16px] lg:grid-cols-[1.5fr_1fr]">
          {/* ทริก 2 ใบ (Figma 42:2036) — มือถือ 249:4788 */}
          <div className="max-lg:order-2 flex flex-col gap-[10px] rounded-[22px] max-md:bg-[#E0EDD7] bg-[#F1F1F1] p-[10px] max-md:p-[12px]">
            <div className="rounded-[12px] bg-white px-[16px] py-[8px]">
              <p className="text-[14px] max-md:text-[13px] max-md:leading-[24px] font-semibold text-[#6C5F2D]">💡 ทริกสำคัญ</p>
              <p className="mt-1 pl-[20px] text-[13px] max-md:text-[12px] font-medium leading-[22px] text-[#6C5F2D]">
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

          <div className="max-lg:order-1 max-md:items-start max-md:text-left flex flex-col items-center gap-[4px] text-center">
            <div className="flex items-center gap-[11px]">
              <span className="size-[18px] max-md:size-[16px] rounded-[50px] max-md:border-[5px] max-md:border-[#D4FFB2] bg-[#99DC65]" />
              <p className="text-[20px] max-md:text-[15px] font-bold text-[#6C6134] sm:text-[22px]">
                สอบได้อย่างเข้าใจ ด้วยทริกสรุปต่างๆ
              </p>
            </div>
            <p className="max-w-[301px] max-md:w-full max-md:pl-[27px] max-md:pr-[10px] text-[18px] max-md:text-[14px] font-medium leading-[normal] text-[#706848]">
              แก้ปัญหาจำทฤษฎียาวๆไม่ได้ เข้าห้องสอบทีไรเป็นต้องลืมทุกครั้ง
            </p>
          </div>
        </div>

        {/* Otter มาสู้ๆ (Figma 42:2049) */}
        <div className="mt-6 max-md:mt-[16px] flex justify-end pb-5">
          <div className="relative md:w-[160px] max-md:w-[88px] max-[1024px]:translate-x-0 translate-x-[107px] max-md:translate-x-[23px] max-[1415px]:translate-x-[10px]">
            <Image
              src="/logo-otter/otter-chear1.png"
              alt=""
              width={278}
              height={278}
              className="w-full h-auto"
            />
            <div className="absolute -top-10 left-1/2 flex h-[32px] max-md:h-[26px] w-[147px] max-md:w-[131px] max-md:left-0 -translate-x-1/2 items-center justify-center rounded-[30px] bg-[#FFF0AE] px-[17px] max-md:px-[8px] text-[14px] max-md:text-[12px] font-semibold text-[#6C5F2D]">
              มาสู้ๆไปด้วยกันน้า !
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}