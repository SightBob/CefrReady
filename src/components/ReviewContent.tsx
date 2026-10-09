import React from "react";
import type {
  FormulaCase,
  FormulaColumn,
  LessonPracticeQuestion,
  ReviewTopic,
  TypeBreakdownCase,
} from "@/lib/lesson-sections";
import { TYPE_BREAKDOWN_DEFAULT_COLOR, normalizeLessonSections } from "@/lib/lesson-sections";
import RichText from "./RichText";
import Image from "next/image";

// สียังคงเดิมตามโค้ดปัจจุบัน — โครงสร้าง/สัดส่วนเทียบตาม Figma (Tutor - Testing)
const C = {
  card: "#E6F0F8",
  cardBorder: "#E6F0F8",
  // Core Formula breakdown (Figma 419:56249)
  formulaDivider: "#F4F4F4",
  formulaLabelBg: "#F2F2F0",
  formulaLabelText: "rgba(85,73,29,0.68)",
  formulaExampleText: "#6D5B16",
  formulaLeftBar: "#E6E6FC",
  formulaRightBar: "#FFF5CF",
  formulaNoteBg: "#F8F8F8",
  formulaNoteText: "#555555",
  // Type Breakdown (Figma 419:56446)
  typeHeading: "#3B3B3B",
  typeSubtitle: "#404040",
  typePillBg: "#F5F5F5",
  typePillText: "#555555",
  typeExampleBg: "#FFF5CF",
  typeExampleText: "#6D5B16",
  typeNoteBg: "#C8E6FF",
  typeNoteText: "#555555",
  pill: "#F5F5F5",
  pillBorder: "#E8E8E8",
  result: "#FFF8D9",
  chip: "#FFF5CF",
  chipText: "#6D5B16",
  arrow: "#555555",
  heading: "#404040",
  body: "#404040",
};

/**
 * คลาสของ “กล่องขาวที่คุม” เนื้อหาของแต่ละกลุ่ม (การ์ด + quiz/tip ที่อยู่ด้วยกัน)
 *
 * px-[22.5px]: เดิม padding ซ้าย-ขวาเป็น 0 การ์ด Mini Quiz “ลองทำโจทย์เพื่อทบทวนความเข้าใจ”
 * (w-full) จึงชิดขอบกล่องขาวดูติดกันเกินไป — เพิ่มระยะให้เยื้องเข้าในเท่ากับการ์ดเนื้อหา 668px
 * พอดี: lesson review กว้าง 735px − padding 11px ต่อข้าง = 713px → (713 − 668) / 2 = 22.5px
 * การ์ดเนื้อหาและกล่องทริกมีความกว้างคงที่ (668/667px) จึงไม่ถูกกระทบ
 * จอเล็ก (≤767px) ยังใช้ max-md:px-[15px] เดิม
 */
const GROUP_BOX_CLASS =
  "flex w-full flex-col items-center gap-4 rounded-[28px] bg-white px-[22.5px] py-6 max-md:rounded-[18px] max-md:gap-[10px] max-md:py-0 max-md:pt-[10px] max-md:pb-[22px] max-md:px-[15px]";

/**
 * กลุ่มการ์ดที่เรนเดอร์เป็นกล่องสีขาวก้อนเดียวกัน
 *
 * ลำดับการแสดงยึดตามลำดับที่แอดมินวางไว้จริง (เรียงบน→ล่าง) ไม่สลับที่:
 *  - การ์ดเนื้อหาทุกใบที่วางติดกันอยู่ "กล่องขาวใบเดียวกัน" เว้นระยะด้วย gap-4 (16px)
 *    ตาม Figma — เดิมการ์ดใหม่เปิดกล่องใหม่ทุกใบจนดูเป็นการ์ดคนละกล่อง
 *  - กล่องทริกสำคัญ (importantNote) และการ์ด “ลองทำโจทย์เพื่อทบทวนความเข้าใจ”
 *    (practice) ที่ตามหลังการ์ดเนื้อหา จะอยู่ในกล่องสีขาวเดียวกับกฎนั้น
 *    — ตาม design ล่าสุด: กฎ + ทริก + Mini Quiz อยู่ในกรอบเดียวกัน
 *  - Mini Quiz ที่ฝังมากับตัวการ์ดเอง (section.practice — ตั้งค่าในหน้าแอดมิน
 *    “เพิ่ม Mini Quiz ท้ายการ์ดนี้”) แสดงต่อจากเนื้อหาการ์ดในกล่องเดียวกันเสมอ
 *    ไม่ต้องพึ่งลำดับของ section
 *  - ถ้าโน้ต/quiz มาก่อนการ์ดเนื้อหาตัวแรก จะได้กล่องของตัวเอง
 */
type CardGroup =
  /** quiz/tip ที่มาก่อนการ์ดเนื้อหาตัวแรก — ได้กล่องของตัวเอง */
  | { kind: "extras"; items: ReviewTopic[] }
  /** การ์ดเนื้อหา + quiz/tip ที่คั่นกลาง — อยู่ "กล่องขาวใบเดียวกัน" เรียงตามลำดับที่วางจริง */
  | { kind: "cards"; items: ReviewTopic[] };

function groupSections(sections: ReviewTopic[]): CardGroup[] {
  const groups: CardGroup[] = [];
  sections.forEach((section) => {
    const type = section.type ?? "detailedRule";
    const last = groups[groups.length - 1];
    const isExtra = type === "practice" || type === "importantNote";
    if (isExtra) {
      if (last) last.items.push(section);
      else groups.push({ kind: "extras", items: [section] });
      return;
    }
    // การ์ดเนื้อหาที่วางติดกันอยู่ "กล่องขาวใบเดียวกัน" — เว้นระยะด้วย gap-4 (16px) เหมือน Figma
    // (เดิมการ์ดใหม่เปิดกล่องใหม่ทุกใบ ทำให้มีกล่องขาว + ช่องว่างคั่นกลางจนดูเป็นการ์ดคนละกล่อง)
    if (last?.kind === "cards") last.items.push(section);
    else groups.push({ kind: "cards", items: [section] });
  });
  return groups;
}

function SentenceBlank({ sentence }: { sentence: string }) {
  const parts = sentence.split("____");
  return (
    <p className="text-[16px] font-semibold leading-6 text-slate-800 max-md:text-[13px]">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (<span aria-hidden="true"
              className="mx-1 inline-flex h-6 items-center rounded-md bg-[#F2F2F2] px-2 align-middle font-normal text-[18px] leading-6 text-[#5F5F5F] max-md:bg-[#EFEFEF] max-md:text-[13px]"
            >
              ______
            </span>
          )}
        </React.Fragment>
      ))}
    </p>
  );
}

function MiniQuiz({
  questions,
  title,
  /** ใช้ตอน render แบบ static/demo เพื่อลองสถานะ “ตอบแล้ว” ได้ (ปกติเริ่มว่าง) */
  initialAnswers = {},
}: {
  questions: LessonPracticeQuestion[];
  title: string;
  initialAnswers?: Record<number, number>;
}) {
  const [active, setActive] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, number>>(initialAnswers);
  const question = questions[active];
  if (!question) return null;
  const selected = answers[active];
  const isCorrect = selected === question.answerIndex;
  // Click an option → check instantly and reveal the answer. One shot per question.
  const choose = (optionIndex: number) =>
    setAnswers((current) =>
      current[active] === undefined ? { ...current, [active]: optionIndex } : current,
    );

  return (
    <section
      className="flex w-full flex-col items-center gap-[13px] rounded-2xl border border-slate-200 bg-white p-4 max-md:rounded-[14px] max-md:border-0"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-1 text-[14px] font-semibold uppercase leading-[18px] tracking-[0.35px] text-[#2B6C00] max-md:text-[12px] max-md:text-[#497293]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[15px] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7v12a2 2 0 0 0 2 2h12" />
            <rect x="7" y="3" width="14" height="14" rx="2" />
            <path d="M11.5 8.5a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.5" />
            <path d="M14 14h.01" />
          </svg>
          {title}
        </h2>

        <nav className="flex flex-wrap gap-1.5" aria-label="เลือกข้อ Mini Quiz">
          {questions.map((item, index) => {
            const answered = answers[index] !== undefined;
            const correct = answers[index] === item.answerIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActive(index)}
                aria-current={active === index ? "step" : undefined}
                aria-label={`ข้อ ${index + 1}${answered ? (correct ? " ตอบถูก" : " ตอบผิด") : ""}`}
                className={`grid size-[19px] place-items-center rounded-[4px] text-[11px] font-semibold leading-[18px] tracking-[0.35px] transition-colors ${
                  active === index
                    ? "bg-[#F2F2F2] text-[#5C5C5C]"
                    : answered && correct
                      ? "bg-emerald-100 text-emerald-700"
                      : answered
                        ? "bg-rose-100 text-rose-700"
                        : "bg-[#F2F2F2] text-[#5C5C5C] hover:bg-slate-200"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Question */}
      <div className="flex w-full flex-col items-start gap-4">
        <div className="w-full text-[16px] font-semibold leading-6 text-slate-700 max-md:text-[13px]">
          <SentenceBlank sentence={question.sentence} />
        </div>

        <div
          className="grid w-full grid-cols-3 gap-[18px] max-md:gap-[9px] sm:grid-cols-3"
          role="group"
          aria-label="เลือกคำตอบ"
        >
          {question.options.map((option, index) => {
            const chosen = selected === index;
            const answer = question.answerIndex === index;
            const hasAnswered = selected !== undefined;
            const stateClass =
              hasAnswered && answer
                ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                : hasAnswered && selected === index
                  ? "border-rose-400 bg-rose-50 text-rose-900"
                  : chosen
                    ? "border-[#2B6C00] bg-[#2B6C00]/5 text-slate-800"
                    : "border-[#E2E8F0] bg-white text-slate-800 hover:border-[#2B6C00]/50";
            return (
              <button
                key={`${index}-${option}`}
                type="button"
                onClick={() => choose(index)}
                disabled={hasAnswered}
                aria-pressed={chosen}
                className={`flex h-[52px] items-center gap-3 rounded-[9px] ring-[1.6px] ring-inset ring-[#E2E8F0] px-4 text-left text-[16px] font-medium leading-[26px] transition-colors outline-none disabled:cursor-default max-md:h-auto max-md:min-h-[41px] max-md:gap-[12px] max-md:px-[5px] max-md:text-[13px] ${stateClass}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F1F5F9] text-[14px] font-bold leading-5 text-[#64748B] max-md:size-6 max-md:rounded-[6px] max-md:text-[12px]">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 break-words">{option}</span>
              </button>
            );
          })}
        </div>

        {/* เฉลย — โผล่หลังตอบ (ถูก/ผิด) ตาม design 249:1099 */}
        {selected !== undefined && question.explanation?.trim() && (
          <ExplanationBar explanation={question.explanation.trim()} />
        )}
      </div>
    </section>
  );
}

function ExampleCard({
  en,
  th,
  ok,
}: {
  en: string;
  th?: string;
  ok?: boolean;
}) {
  return (
    <div className="flex min-h-[39px] w-full flex-col items-center justify-center gap-1 rounded-[7px] bg-[#F5F5F5] px-2.5 py-[5px] text-center max-md:px-[10px]">
      <p
        className={`text-[13px] font-medium leading-[22px] ${ok === false ? "text-slate-600" : "text-slate-800"} max-md:text-[12px]`}
        style={{ color: C.body }}
      >
        <RichText text={en} highlightColor="#FFFFFF" highlightTextColor={C.body} as="span" />
      </p>
      {th && (
        <p className="text-xs leading-relaxed" style={{ color: C.body }}>
          <RichText text={th} highlightColor="#FFFFFF" highlightTextColor={C.body} as="span" />
        </p>
      )}
    </div>
  );
}

/**
 * แถบเฉลยหลังตอบข้อสอบ Mini Quiz — ตาม Figma node 337:11 (design 249:1099):
 * พื้น #FFFEFA border #E9CD62 มุมโค้ง 15px, badge ไอคอนพื้น #C8E6FF ขนาด 23px,
 * ข้อความเฉลยสี #76641C ขนาด 14px (SemiBold ตาม design)
 */
function ExplanationBar({ explanation }: { explanation: string }) {
  return (
    <div
      className="flex min-h-[59px] w-full items-center rounded-[15px] border border-[#E9CD62] bg-[#FFFEFA] px-5 py-4 max-md:px-4 max-md:py-3"
      aria-label="เฉลยลองทำโจทย์"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-[23px] shrink-0 place-items-center rounded-[6px] bg-[#C8E6FF]"
        >
          <Image src="/logo-otter/explain-spark.svg" alt="" width={15.8} height={15.8} />
        </span>
        <p className="text-[14px] font-semibold leading-[21px] text-[#76641C] max-md:text-[13px]">
          {explanation}
        </p>
      </div>
    </div>
  );
}

/**
 * แถบประโยคของ Core Formula breakdown (Figma 419:56268 / 419:56278)
 * สีพื้นมาจากข้อมูลก่อน (`column.tone`) เพราะ Figma สลับสีระหว่างการ์ด:
 * 419:56107 = ซ้าย #FFF5CF (เหลือง) / ขวา #E6E6FC (ม่วง), 419:56249 = กลับกัน
 * ไม่ระบุ = ตามตำแหน่งคอลัมน์เหมือนเดิม: ซ้าย #E6E6FC (ม่วง) ขวา #FFF5CF (เหลือง)
 * คำที่ห่อด้วย ==...== แสดงเป็นชิปพื้นขาวในประโยค
 */
function FormulaBar({ column, tone }: { column: FormulaColumn; tone: "left" | "right" }) {
  const barTone = column.tone ?? (tone === "left" ? "purple" : "yellow");
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        className="flex min-h-[39px] w-full items-center justify-center rounded-t-[7px] px-[26px] py-1 max-sm:px-[12px]"
        style={{ background: barTone === "purple" ? C.formulaLeftBar : C.formulaRightBar }}
      >
        <p className="text-center text-[14px] font-semibold leading-[22px]" style={{ color: C.formulaExampleText }}>
          <RichText
            text={column.sentence}
            highlightColor="#FFFFFF"
            highlightTextColor={C.formulaExampleText}
            as="span"
          />
        </p>
      </div>
      {column.note.trim() && (
        <div
          className="flex min-h-9 w-full items-center justify-center rounded-b-[7px] px-[42px] py-[5px] max-sm:px-[14px]"
          style={{ background: C.formulaNoteBg }}
        >
          <p className="text-[12px] font-medium leading-[22px]" style={{ color: C.formulaNoteText }}>
            <span aria-hidden="true">• </span>
            {column.note}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * การ์ด “Core Formula breakdown” (Figma node 419:56249)
 * โครง: หัวเรื่อง → เส้นคั่น → เคสละแถว (ป้ายเคส + ตัวอย่าง แล้วเทียบ 2 คอลัมน์)
 */
function FormulaBreakdownCard({ heading, cases }: { heading?: string; cases: FormulaCase[] }) {
  return (
    <section
      className="flex w-[668px] max-w-full flex-col rounded-2xl p-4 max-sm:w-full"
      style={{ background: C.card, borderColor: C.cardBorder }}
    >
      <div className="flex w-full flex-col gap-[11px] rounded-xl bg-white py-[17px] pl-5 pr-[19px] max-sm:gap-[10px] max-sm:px-[10px]">
        {heading?.trim() && (
          <h2 className="text-[16px] font-semibold leading-6 max-sm:text-[14px]" style={{ color: C.heading }}>
            <RichText
              text={heading}
              highlightColor="#FFFFFF"
              highlightTextColor={C.body}
              as="span"
            />
          </h2>
        )}

        <div className="h-px w-[576px] max-w-full shrink-0 rounded-[29px]" style={{ background: C.formulaDivider }} />

        <div className="flex w-full flex-col gap-[17px] max-sm:gap-[13px]">
          {cases.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <div className="h-px w-[576px] max-w-full shrink-0 rounded-[29px]" style={{ background: C.formulaDivider }} />
              )}
              <div className="flex w-full flex-col gap-[11px]">
                {/* ป้ายเคส + ประโยคตัวอย่าง */}
                <div className="flex flex-wrap items-center gap-[11px]">
                  {item.label.trim() && (
                    <span
                      className="flex h-6 shrink-0 items-center rounded-[7px] px-1.5 text-[12px] font-semibold leading-6 max-sm:h-auto max-sm:min-h-6 max-sm:min-w-0 max-sm:shrink max-sm:py-[3px] max-sm:leading-[18px]"
                      style={{ background: C.formulaLabelBg, color: C.formulaLabelText }}
                    >
                      {item.label}
                    </span>
                  )}
                  {item.example.trim() && (
                    <p className="min-w-0 text-[14px] font-semibold leading-[22px]" style={{ color: C.formulaExampleText }}>
                      <RichText
                        text={item.example}
                        highlightColor="#FFFFFF"
                        highlightTextColor={C.formulaExampleText}
                        as="span"
                      />
                    </p>
                  )}
                </div>

                {/* เทียบสูตร 2 คอลัมน์ — จอเล็กมาก (<640px) ค่อยเรียงบน-ล่าง */}
                <div className="flex w-full items-stretch gap-[15px] max-sm:flex-col max-sm:gap-[9px]">
                  <FormulaBar column={item.left} tone="left" />
                  <FormulaBar column={item.right} tone="right" />
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * การ์ด “Type Breakdown” (Figma node 419:56446)
 * โครง: หัวการ์ด (อยู่บนพื้นฟ้า) → กล่องขาว [คำโปรย → เส้นคั่น → เคสละ 3 แถว]
 * แต่ละเคส: ป้าย Type (สีตามเคส) + คำอธิบาย → ช่องโครงสร้าง → ประโยคตัวอย่าง → บรรทัดสรุปพร้อมไอคอน
 */
function TypeBreakdownCard({
  heading,
  description,
  cases,
}: {
  heading?: string;
  description?: string;
  cases: TypeBreakdownCase[];
}) {
  return (
    <section
      className="flex w-[668px] max-w-full flex-col gap-2 rounded-2xl bg-[#E6F0F8] p-4 max-sm:w-full max-sm:gap-[6px]"
      aria-label={heading?.trim() || undefined}
    >
      {heading?.trim() && (
        <h2 className="text-[16px] font-semibold leading-6 max-sm:text-[14px]" style={{ color: C.typeHeading }}>
          <RichText
            text={heading}
            highlightColor="#FFFFFF"
            highlightTextColor={C.typeHeading}
            as="span"
          />
        </h2>
      )}

      <div className="flex w-full flex-col gap-[11px] rounded-xl bg-white py-[17px] pl-5 pr-[19px] max-sm:gap-[10px] max-sm:px-[10px]">
        {description?.trim() && (
          <p className="text-[14px] font-semibold leading-[22px]" style={{ color: C.typeSubtitle }}>
            <RichText
              text={description}
              highlightColor="#FFFFFF"
              highlightTextColor={C.typeSubtitle}
              as="span"
            />
          </p>
        )}

        <div className="h-px w-[576px] max-w-full shrink-0 rounded-[29px]" style={{ background: C.formulaDivider }} />

        <div className="flex w-full flex-col gap-[17px] max-sm:gap-[13px]">
          {cases.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <div className="h-px w-[576px] max-w-full shrink-0 rounded-[29px]" style={{ background: C.formulaDivider }} />
              )}
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full flex-col gap-[11px]">
                  {/* ป้าย Type + คำอธิบายสั้น */}
                  <div className="flex flex-wrap items-start gap-[11px]">
                    {item.label.trim() && (
                      <span
                        className="flex h-6 shrink-0 items-center rounded-[7px] px-1.5 py-1 text-[12px] font-medium leading-6 text-white max-sm:h-auto max-sm:min-h-6 max-sm:min-w-0 max-sm:shrink max-sm:py-[3px] max-sm:leading-[18px]"
                        style={{ background: item.color?.trim() || TYPE_BREAKDOWN_DEFAULT_COLOR }}
                      >
                        {item.label}
                      </span>
                    )}
                    {item.description.trim() && (
                      <p className="min-w-0 text-[14px] font-semibold leading-[22px]" style={{ color: C.typeSubtitle }}>
                        <RichText
                          text={item.description}
                          highlightColor="#FFFFFF"
                          highlightTextColor={C.typeSubtitle}
                          as="span"
                        />
                      </p>
                    )}
                  </div>

                  {/* ช่องโครงสร้าง → ประโยคตัวอย่าง (จอเล็กมากเรียงบน-ล่าง) */}
                  <div className="flex w-full items-center gap-[15px] max-sm:flex-col max-sm:items-stretch max-sm:gap-[9px]">
                    <div
                      className="flex min-h-[39px] w-[269px] max-w-full shrink-0 items-center justify-center rounded-[7px] px-[30px] py-[5px] max-sm:w-full max-sm:px-[14px]"
                      style={{ background: C.typePillBg }}
                    >
                      <span className="w-full text-center text-[14px] font-medium leading-[22px]" style={{ color: C.typePillText }}>
                        <RichText
                          text={item.structure}
                          highlightColor="#FFFFFF"
                          highlightTextColor={C.typePillText}
                          as="span"
                        />
                      </span>
                    </div>
                    <div
                      className="flex h-[39px] w-10 shrink-0 items-center justify-center rounded-[7px] max-sm:w-full"
                      style={{ background: C.typePillBg }}
                    >
                      <span
                        className="text-[13px] font-medium leading-[22px]"
                        style={{ color: C.typePillText }}
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </div>
                    <div
                      className="flex min-h-[39px] min-w-0 flex-1 items-center justify-center rounded-[7px] px-[26px] py-1 max-sm:w-full max-sm:px-[12px]"
                      style={{ background: C.typeExampleBg }}
                    >
                      <p className="text-center text-[13px] font-medium leading-[22px]" style={{ color: C.typeExampleText }}>
                        <RichText
                          text={item.example}
                          highlightColor="#FFFFFF"
                          highlightTextColor={C.typeExampleText}
                          highlightRadius={5}
                          highlightPaddingX={4}
                          as="span"
                        />
                      </p>
                    </div>
                  </div>
                </div>

                {item.note.trim() && (
                  <div className="flex w-full items-center gap-[7px]">
                    <span
                      aria-hidden="true"
                      className="grid size-[17px] shrink-0 place-items-center rounded-[4px]"
                      style={{ background: C.typeNoteBg }}
                    >
                      <Image src="/logo-otter/explain-spark.svg" alt="" width={11} height={11} />
                    </span>
                    <p className="min-w-0 flex-1 text-[12px] font-semibold leading-[22px]" style={{ color: C.typeNoteText }}>
                      <RichText
                        text={item.note}
                        highlightColor="#FFFFFF"
                        highlightTextColor={C.typeNoteText}
                        as="span"
                      />
                    </p>
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/** กล่อง “ทริกสำคัญ” (importantNote) — โครงตาม design: หัวเรื่อง + ข้อความเยื้องซ้าย 20px */
function TipBubble({ heading, body }: { heading?: string; body: string }) {
  return (
    <aside
      className="flex min-h-[90px] w-[667px] max-w-full flex-col rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-2 shadow-sm max-md:w-full max-md:min-h-0 max-md:rounded-[15px] max-md:border-[#E9CD62] max-md:bg-[#FFFEFA] max-md:px-4 max-md:pb-4 max-md:pt-3 max-md:shadow-none"
      aria-label={heading || "ทริกสำคัญ"}
    >
      <h2 className="text-[14px] font-semibold leading-6 text-amber-950 max-md:text-[13px] max-md:text-[#6C5F2D]">
        <RichText
          text={heading?.trim() ? `💡 ${heading}` : "💡 ทริกสำคัญ"}
          highlightTextColor="#7372DF"
          highlightBackground="transparent"
          as="span"
        />
      </h2>
      {body.trim() && (
        <p className="whitespace-pre-line pl-5 text-[13px] font-medium leading-[22px] text-amber-950 max-md:pl-0 max-md:text-[12px] max-md:text-[#6C5F2D]">
          <RichText
            text={body}
            highlightTextColor="#7372DF"
            highlightBackground="transparent"
            as="span"
          />
        </p>
      )}
    </aside>
  );
}

export default function ReviewContent({
  title: _title,
  topics,
  intro,
  tip: _tip,
  initialPracticeAnswers,
}: {
  title?: string;
  topics: ReviewTopic[];
  intro?: string;
  tip?: string;
  /** สถานะเริ่มต้นของ Mini Quiz (static/demo render) — ปกติไม่ส่ง = ยังไม่ตอบ */
  initialPracticeAnswers?: Record<number, number>;
}) {
  // ลำดับการแสดงผลถูกจัดการใน groupSections(): เรียงตามลำดับที่แอดมินวางไว้
  // และ quiz/tip ที่ตามหลังการ์ดกฎจะอยู่ในกล่องสีขาวเดียวกับกฎนั้น
  const groups = React.useMemo(
    () => groupSections(normalizeLessonSections(topics, { intro, tip: _tip })),
    [topics, intro, _tip],
  );

  /** เนื้อหาที่ต่อท้ายการ์ดกฎในกล่องเดียวกัน — กล่องทริกหรือการ์ด Mini Quiz */
  const renderExtra = (section: ReviewTopic, key: string) => {
    if ((section.type ?? "") === "practice") {
      const questions = section.practice?.questions ?? [];
      if (!questions.length) return null;
      return (
        <MiniQuiz
          key={key}
          questions={questions}
          title={section.heading?.trim() || "ลองทำโจทย์เพื่อทบทวนความเข้าใจ"}
          initialAnswers={initialPracticeAnswers}
        />
      );
    }
    return (
      <TipBubble
        key={key}
        heading={section.heading?.trim() || "ทริกสำคัญ"}
        body={section.body || section.tip || ""}
      />
    );
  };

  /**
   * การ์ดเนื้อหาหนึ่งใบ (rule / detailedRule / formulaBreakdown / typeBreakdown)
   * รวม Mini Quiz ที่ฝังมากับการ์ดนั้นไว้ใน Fragment เดียวกัน
   * การ์ดที่วางติดกันจะถูกเรนเดอร์ต่อกันใน "กล่องขาวใบเดียว" (ดู groupSections)
   */
  const renderCard = (section: ReviewTopic, key: string) => {
    const detailed = section.type === "detailedRule";
    const formulaCases = section.formula?.cases ?? [];
    const isFormula = section.type === "formulaBreakdown" && formulaCases.length > 0;
    const typeCases = section.typeBreakdown?.cases ?? [];
    const isTypeBreakdown = section.type === "typeBreakdown" && typeCases.length > 0;
    // Mini Quiz ที่ฝังมากับการ์ดเอง (ไม่ใช่ section type "practice" แยกต่างหาก)
    const ownQuizQuestions = (section.practice?.questions ?? []).filter((question) => question.sentence.trim());
    return (
      <React.Fragment key={key}>
        {isFormula ? (
          <FormulaBreakdownCard heading={section.heading} cases={formulaCases} />
        ) : isTypeBreakdown ? (
          <TypeBreakdownCard heading={section.heading} description={section.description} cases={typeCases} />
        ) : (
        /* การ์ดกฎ: พื้นหลังอ่อน + เนื้อหาสีขาวด้านใน */
        <section
          className="flex w-[668px] max-w-full flex-col rounded-2xl p-4 max-md:w-full max-md:rounded-[16px]"
          style={{ background: C.card, borderColor: C.cardBorder }}
        >
          {(section.type === "rule" || section.type === "detailedRule") && section.heading?.trim() && (
            <h2 className="mb-2 text-[16px] font-semibold leading-6 max-sm:text-[14px]" style={{ color: C.typeHeading }}>
              <RichText
                text={section.heading}
                highlightColor="#FFFFFF"
                highlightTextColor={C.typeHeading}
                as="span"
              />
            </h2>
          )}
          <div className="flex w-full flex-col rounded-xl bg-white py-[17px] pl-5 pr-[19px] max-md:gap-[10px] max-md:px-[10px]">
            {/* แถวหัว: chip + คำอธิบาย */}
            {(section.chip?.trim() || section.description?.trim()) && (
              <div className="flex w-full flex-wrap items-center gap-[9px]">
                {section.chip?.trim() && (
                  <span
                    className="inline-flex h-6 w-auto min-w-[88px] shrink-0 items-center justify-center rounded-[7px] px-1.5 py-1 text-[13px] font-semibold text-[#6D5B16] max-md:h-auto max-md:min-h-6 max-md:w-auto max-md:min-w-0 max-md:max-w-[120px] max-md:px-[6px] max-md:text-[12px]"
                    style={{ background: C.chip }}
                  >
                    <RichText
                      text={section.chip}
                      highlightColor="#FFFFFF"
                      highlightTextColor={C.body}
                      as="span"
                    />
                  </span>
                )}
                {section.description?.trim() && (
                  <p
                    className="min-w-0 flex-1 text-[14px] font-semibold leading-[22px] max-md:text-[13px]"
                    style={{ color: C.body }}
                  >
                    <RichText
                      text={section.description}
                      highlightColor="#FFFFFF"
                      highlightTextColor={C.body}
                      as="span"
                    />
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex w-full flex-col gap-[13px] max-md:mt-0 max-md:gap-[10px]">
              {section.body?.trim() && (
                <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: C.body }}>
                  <RichText
                    text={section.body}
                    highlightColor="#FFFFFF"
                    highlightTextColor={C.body}
                    as="span"
                  />
                </p>
              )}

              {section.type === "rule" && section.examples?.length ? (
                <div className="grid w-full gap-[10px] sm:grid-cols-3">
                  {section.examples.map((example, index) => (
                    <ExampleCard key={index} {...example} />
                  ))}
                </div>
              ) : null}

              {(section.rows ?? []).length > 0 && (
              <div className="flex w-full flex-col gap-[13px] max-md:gap-0">
              {(section.rows ?? []).map((row, rowIndex) => {
                const left = row.left?.trim() ?? "";
                const right = row.right?.trim() ?? "";
                if (!left && !right) return null;
                if (!detailed && !right) {
                  return (
                    <div
                      key={rowIndex}
                      className="inline-flex min-h-[39px] w-fit max-w-full items-center rounded-[7px] px-2.5 py-[5px]"
                      style={{ background: C.pill, borderColor: C.pillBorder }}
                    >
                      <span className="text-[14px] font-medium leading-[22px] max-md:text-[12px]" style={{ color: C.body }}>
                        <RichText
                          text={left}
                          highlightColor="#FFFFFF"
                          highlightTextColor={C.body}
                          as="span"
                        />
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                      key={rowIndex}
                      className="flex w-full items-center gap-[15px] max-md:grid max-md:grid-cols-[24px_1fr] max-md:gap-x-[6px] max-md:gap-y-[10px] max-md:border-b max-md:border-[#E9E9E9] max-md:py-[18px] max-md:last:border-b-0"
                    >
                    <div
                      className="flex min-h-[39px] w-[269px] max-w-full items-center rounded-[7px] px-2.5 py-[5px] max-md:w-full max-md:col-span-2 max-md:px-[10px]"
                      style={{ background: C.pill, borderColor: C.pillBorder }}
                    >
                      <span className="text-[14px] font-medium leading-[22px] max-md:text-[12px]" style={{ color: C.body }}>
                        <RichText
                          text={left}
                          highlightColor="#FFFFFF"
                          highlightTextColor={C.body}
                          as="span"
                        />
                      </span>
                    </div>
                    <div className="flex h-[39px] w-10 shrink-0 items-center justify-center rounded-[7px] bg-[#f5f5f5] max-md:h-[23px] max-md:w-6 max-md:rounded-[7px]">
                      <span
                        className="text-[13px] font-medium leading-[22px]"
                        style={{ color: C.arrow }}
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </div>
                    <div
                      className="flex min-h-[39px] min-w-0 flex-1 items-center rounded-[7px] px-[26px] py-[5px] max-md:px-[15px] max-md:min-h-[39px] max-md:w-full"
                      style={{ background: C.result }}
                    >
                      <span className="text-[13px] font-medium leading-[22px] text-[#555555]">
                        <RichText
                          text={right || left}
                          highlightColor="#FFFFFF"
                          highlightTextColor={C.body}
                          as="span"
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>
              )}

              {section.type === "detailedRule" && section.examples?.length ? (
                <div className="grid w-full gap-[10px] sm:grid-cols-2">
                  {section.examples.map((example, index) => (
                    <ExampleCard key={index} {...example} />
                  ))}
                </div>
              ) : null}

              {(section.type === "rule" || section.type === "detailedRule") &&
                section.tip?.trim() && (
                  <div className="flex w-full items-center gap-[7px] max-md:gap-[14px]">
                    <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[4px] bg-[#C8E6FF] p-[3px]">
                      <Image src="/logo-otter/star.png" alt="" width={11} height={11} />
                    </div>
                    <p className="min-w-0 flex-1 text-[13px] font-medium leading-[22px] text-[#555555] max-md:text-[11px]">
                      <RichText
                        text={section.tip}
                        highlightColor="#FFFFFF"
                        highlightTextColor="#B39B3F"
                        as="span"
                      />
                    </p>
                  </div>
                )}
            </div>
          </div>
        </section>

        )}

        {ownQuizQuestions.length > 0 && (
          <MiniQuiz
            questions={ownQuizQuestions}
            title={section.quizHeading?.trim() || "ลองทำโจทย์เพื่อทบทวนความเข้าใจ"}
            initialAnswers={initialPracticeAnswers}
          />
        )}
      </React.Fragment>
    );
  };

  // Node title (e.g. "Node 1: Do / Don't — ลูกมือสายลุย") is intentionally NOT
  // rendered on the explain page — the layout chip already shows the lesson name.
  return (
    <div className="flex w-full flex-col items-center gap-3.5 font-ibm max-md:gap-[7px]">
      {groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className={GROUP_BOX_CLASS}
        >
          {group.items.map((item, itemIndex) => {
            const type = item.type ?? "detailedRule";
            return type === "practice" || type === "importantNote"
              ? renderExtra(item, `${groupIndex}-item-${itemIndex}`)
              : renderCard(item, `${groupIndex}-item-${itemIndex}`);
          })}
        </div>
      ))}
    </div>
  );
}
