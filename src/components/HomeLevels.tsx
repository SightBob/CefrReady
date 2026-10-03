/**
 * Section ระดับคะแนน A1 - C2 — design Figma node 42:1657 (การ์ดครีม) + 42:2093-42:2129
 * การ์ดครีม #F7F1DC มุมโค้ง 30px / หัวข้อ #6C5F2D 26px bold
 * แถวละ 2 คอลัมน์ เส้นขาวคั่นบน-ล่าง / ชิปคะแนน #F8F5FF ขอบขาว ป้อม 144×39
 */
const LEVELS = [
  { code: 'A1', name: 'พื้นฐาน', score: '1-20 คะแนน' },
  { code: 'A2', name: 'ขั้นต้น', score: '21-40 คะแนน' },
  { code: 'B1', name: 'ขั้นกลาง', score: '41-60 คะแนน' },
  { code: 'B2', name: 'กลาง - สูง', score: '61-80 คะแนน' },
  { code: 'C1', name: 'ขั้นสูง', score: '81-100 คะแนน' },
  { code: 'C2', name: 'เชี่ยวชาญ', score: '101-120 คะแนน' },
];

export default function HomeLevels() {
  return (
    <section className="px-4 translate-y-[-7px]" id="levels">

{/* แถบเหลืองอ่อนคั่นเหนือหัวข้อ (Figma 42:1948 — #FDF2C3 26px โค้ง 14px) */}
      <div aria-hidden="true" className="mx-auto h-[26px] max-w-[1329px] bg-[#FDF2C3] rounded-full" />

      <div className="mx-auto max-w-[1251px] rounded-bl-[30px] rounded-br-[30px]  translate-y-[-7px] bg-[#F2F2F2] px-6 py-10 sm:px-12 sm:py-12">

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

        <h2 className="text-center text-[26px] font-bold text-[#63717C] sm:text-[26px]">
          ระดับคะแนน&ensp;A1 - C2
        </h2>

        <div className="mx-auto mt-8 grid max-w-[1000px] grid-cols-1 md:grid-cols-2 md:gap-x-14">
          {LEVELS.map(({ code, name, score }) => (
            <div
              key={code}
                          className="
              flex items-center justify-center
              gap-[57px]
              border-b-2 border-white
              py-[28px]
              first:border-t-2
              [&:nth-child(2)]:border-t-2
            "
            >
              <div className="flex w-[130px] shrink-0 items-center gap-[11px] text-[#787878]">
                <p className="text-[24px] font-bold">{code}</p>
                <p className="text-[20px] font-bold">{name}</p>
              </div>
              <div className="flex h-[39px] w-[144px] shrink-0 items-center justify-center rounded-[10px] border-2 border-white bg-[#F8F5FF] px-[40px] text-center">
                <p className="whitespace-nowrap text-[18px] font-medium text-[#585858]">
                  {score}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
