/**
 * Section "ระดับคะแนน A1 - C2" — design Figma 249:3507 (หัวข้อ) + 249:3508-249:3539 (การ์ด)
 *
 * การ์ดระดับ: พื้น #F5F5F5 ขอบขาว 2px มุม 18px padding 28 gap 57
 * โค้ด 22px bold + ชื่อ 18px semibold #63717C / ชิปคะแนน #EFF9FF ขอบขาว 2px r10 39×144 ข้อความ 16px #585858
 * การ์ด A2 ไฮไลต์พิเศษ: พื้น #FDFBF4 + ป้าย "(ผ่านเกณฑ์ มทส.)" 13px #64748B
 * เรียง 2 คอลัมน์ × 3 แถว: A1/B1/C1 | A2/B2/C2
 * แถบเหลืองเหนือหัวข้อ Figma 348:837 — #FDF2C3 สูง 26px กว้างสูงสุด 1329px (ทับขอบบนกล่อง 9px)
 *
 * กล่องครอบ section — Figma 348:836: bg #F2F2F2 + border 4px dashed #E2E8F0 +
 * มุมบนโค้ง 30px กว้าง 1251px (เดสก์ท็อป) ครอบหัวข้อและตารางทั้งหมด
 *
 * หมายเหตุ: การ์ดเทา #F2F2F2 + เส้นประ #E2E8F0 เคยถูกถอดออกไปเป็นพื้นหลัง section FAQ
 * ใน src/app/page.tsx แล้วเพิ่มกลับมาที่นี่ตามคำสั่งผู้ใช้ (อ้างอิง Figma 348:573)
 *
 * ข้อมูลระดับ/ช่วงคะแนนใช้ค่าจริงที่ถูกต้อง ไม่ใช่ค่าในไฟล์ดีไซน์ซึ่งมี B1/C1 ซ้ำกัน
 */

// แถวที่ 1 = A1, A2 · แถวที่ 2 = B1, B2 · แถวที่ 3 = C1, C2 (อ่านตามลำดับซ้าย-ขวา)
const LEVEL_ROWS: {
  code: string;
  name: string;
  score: string;
  note?: string;
}[][] = [
  [
    { code: "A1", name: "พื้นฐาน", score: "1-20 คะแนน" },
    {
      code: "A2",
      name: "ขั้นต้น",
      score: "21-40 คะแนน",
      note: "(ผ่านเกณฑ์ มทส.)",
    },
  ],
  [
    { code: "B1", name: "ขั้นกลาง", score: "41-60 คะแนน" },
    { code: "B2", name: "กลาง - สูง", score: "61-80 คะแนน" },
  ],
  [
    { code: "C1", name: "ขั้นสูง", score: "81-100 คะแนน" },
    { code: "C2", name: "เชี่ยวชาญ", score: "101-120 คะแนน" },
  ],
];

const ALL_LEVELS = LEVEL_ROWS.flat();

function LevelCard({
  code,
  name,
  score,
  note,
  className = "",
}: {
  code: string;
  name: string;
  score: string;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-[57px] max-lg:gap-[16px] rounded-[18px] border-2 border-white px-[28px] py-[28px] max-lg:px-[16px] ${
        note ? "bg-[#FFF5CF]" : "bg-[#F5F5F5]"
      } ${className}`}
    >
      <div className="flex shrink-0 items-center gap-[11px] text-[#63717C]">
        <p className="text-[22px] font-bold">{code}</p>
        {note ? (
          <p className="text-[13px] font-semibold text-[#64748B]">{note}</p>
        ) : (
          <p className="text-[18px] font-semibold">{name}</p>
        )}
      </div>
      <div className="flex h-[39px] w-[144px] shrink-0 items-center justify-center rounded-[10px] border-2 border-white bg-[#EFF9FF] px-[10px]">
        <p className="whitespace-nowrap text-center text-[16px] font-semibold text-[#585858]">
          {score}
        </p>
      </div>
    </div>
  );
}

export default function HomeLevels() {
  return (
    <section
      className="px-4 max-md:px-0 pb-[44px] max-md:pb-[13px]"
      id="levels"
    >
      {/* แถบเหลืองเหนือหัวข้อ — Figma 348:837 (ทับขอบบนกล่องเส้นปะ 9px จึงต้องวาดทับกล่อง) */}
      <div
        aria-hidden="true"
        className="relative z-10 mx-auto h-[26px] max-md:h-[18px] max-w-[1329px] rounded-[14px] bg-[#FDF2C3]"
      />

      {/* กล่องพื้นเทา + เส้นปะ — Figma 348:836: กว้าง 1251px, ขอบบนถึงหัวข้อ 38px, แถวสุดท้ายถึงขอบล่าง 53px */}
      <div className="relative mx-auto max-w-[1251px] rounded-b-[30px] bg-white px-6 pb-10 sm:px-10">
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    style={{ clipPath: "inset(0 -4px -4px -4px)" }} // ตัดบนที่ขอบการ์ด เผื่อ ซ้าย/ขวา/ล่าง ให้เส้นล้นได้
    aria-hidden="true"
  >
    <rect
      x="0"
      y="-60"
      rx="30"
      style={{
        width: "100%",
        height: "calc(100% + 60px)", // ขอบบนถูกดันขึ้นไปนอกกรอบ ส่วนขอบล่างยังอยู่ที่ 100%
      }}
      fill="none"
      stroke="#E2E8F0"
      strokeWidth="4"
      strokeDasharray="4 8 12 16"
      strokeLinecap="round"
    />
  </svg>
    <h2 className="max-md:px-[17px] text-center text-[26px] max-md:text-[20px] font-bold text-[#63717C] pt-[29px]">
          ระดับคะแนน&ensp;A1 - C2
        </h2>

        {/* มือถือ (Figma 249:4913): ชิป 3 คอลัมน์ + แถวคำอธิบายระดับแรก */}
        <div className="mx-auto mt-8 max-md:mt-[24px] hidden max-md:block max-w-[321px]">
          <div className="grid grid-cols-3 gap-[9px]">
            {ALL_LEVELS.map((level, i) => (
              <div
                key={level.code}
                className={`flex h-[54px] items-center justify-center rounded-[12px] border-[1.6px] text-[15px] font-bold text-[#63717C] ${
                  i === 0
                    ? "border-white bg-[#FFF5CF]"
                    : "border-[#E9E9E9] bg-white"
                }`}
              >
                <span aria-hidden="true">{level.code}</span>
                <span className="sr-only">
                  {level.code} {level.name} {level.score}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-[12px] flex items-center justify-between gap-[10px] rounded-[15px] border-[1.6px] border-white bg-[#FFF5CF] py-[13px] pl-[14px] pr-[16px]">
            <div className="flex items-center gap-[11px] text-[#63717C]">
              <p className="text-[15px] font-bold">{ALL_LEVELS[0].code}</p>
              <p className="text-[13px] font-semibold">{ALL_LEVELS[0].name}</p>
            </div>
            <div className="flex h-[33px] shrink-0 items-center justify-center rounded-[10px] border-[1.6px] border-white bg-[#EFF9FF] px-[12px]">
              <p className="whitespace-nowrap text-[13px] font-semibold text-[#585858]">
                {ALL_LEVELS[0].score}
              </p>
            </div>
          </div>
        </div>

        {/* เดสก์ท็อป (Figma 249:3508-249:3539): การ์ด 2 คอลัมน์ × 3 แถว
          แท็บเล็ต 768-1023px ยังไม่พอสำหรับการ์ด 2 ช่อง จึงเรียง 1 คอลัมน์ก่อน */}
        <div className="mx-auto mt-[41px] max-md:hidden grid max-w-[970px] grid-cols-1 gap-y-[20px] gap-x-[58px] lg:grid-cols-2">
          {LEVEL_ROWS.flat().map((level) => (
            <LevelCard
              key={level.code}
              {...level}
              className="lg:min-h-[89px]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
