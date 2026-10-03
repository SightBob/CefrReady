import React from "react";
import { ArrowRight, ArrowRightIcon, ArrowRightToLine, Lightbulb, MoveLeft, MoveRight } from "lucide-react";
import type {
  LessonPracticeQuestion,
  ReviewTopic,
} from "@/lib/lesson-sections";
import { normalizeLessonSections } from "@/lib/lesson-sections";
import RichText from "./RichText";
import Image from "next/image";
import { ArrowArcRightIcon } from "@phosphor-icons/react";

const C = {
  card: "#E6F0F8",
  cardBorder: "#E6F0F8",
  pill: "#F5F5F5",
  pillBorder: "#E8E8E8",
  result: "#FFF8D9",
  chip: "#FFF5CF",
  chipText: "#6D5B16",
  arrow: "#555555",
  tipBg: "#E7F3FD",
  tipText: "#2B6CB0",
  heading: "#404040",
  body: "#404040",
};

function SentenceBlank({ sentence }: { sentence: string }) {
  const parts = sentence.split("____");
  return (
    <p className="text-base font-bold leading-relaxed text-slate-800 sm:text-lg">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <span
              aria-hidden="true"
              className="mx-1.5 inline-block rounded-xl bg-[#F2F2F2] px-4 py-0.5 align-middle font-bold text-[#5F5F5F]"
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
}: {
  questions: LessonPracticeQuestion[];
  title: string;
}) {
  const [active, setActive] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
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
  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
  aria-label={title}
>
  {/* Header */}
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 text-base font-bold text-[#2B6C00] sm:text-lg">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5 shrink-0"
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

    <nav className="flex flex-wrap gap-2" aria-label="เลือกข้อ Mini Quiz">
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
            className={`grid size-7 place-items-center rounded-md text-xs font-bold transition-colors ${
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
  <div className="mb-5 text-base font-bold text-slate-700">
    <SentenceBlank sentence={question.sentence} />
  </div>

  {/* Choices */}
  <div
    className="grid gap-3 sm:grid-cols-3"
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
         className={`flex min-h-16 items-center gap-4 rounded-[9px] ring-[1.6px] ring-inset ring-[#E2E8F0] px-4 py-3 text-left text-base font-medium transition-colors outline-none disabled:cursor-default ${stateClass}`}  >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#F1F5F9] text-sm font-bold text-[#64748B]">
            {String.fromCharCode(65 + index)}
          </span>
          <span>{option}</span>
        </button>
      );
    })}
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
    <div className="flex w-full flex-col items-center justify-center gap-1 rounded-[0.4375rem] bg-[#F5F5F5] px-2 py-[0.4125rem] text-center">
      <p
        className={`text-sm font-medium leading-relaxed ${ok === false ? "text-slate-600" : "text-slate-800"}`}
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

export default function ReviewContent({
  title: _title,
  topics,
  intro,
  tip: _tip,
}: {
  title?: string;
  topics: ReviewTopic[];
  intro?: string;
  tip?: string;
}) {
  // ลำดับการแสดงผล: การ์ดเนื้อหา → ทริกสำคัญ/เคล็ดลับ → "ลองทำโจทย์เพื่อทบทวน
  // ความเข้าใจ" (practice) — ย้าย importantNote ทุกอัน (รวม tip เคล็ดลับท้ายหน้า
  // จาก legacy field ที่ normalize แล้ว append ท้ายสุด) ไปไว้เหนือ practice
  // section แรก ไม่ว่าลำดับที่บันทึกใน DB จะเป็นอย่างไร
  const sections = React.useMemo(() => {
    const list = normalizeLessonSections(topics, { intro, tip: _tip });
    if (!list.some((section) => section.type === "practice")) return list;
    const notes = list.filter((section) => section.type === "importantNote");
    const rest = list.filter((section) => section.type !== "importantNote");
    const practiceIndex = rest.findIndex((section) => section.type === "practice");
    return [...rest.slice(0, practiceIndex), ...notes, ...rest.slice(practiceIndex)];
  }, [topics, intro, _tip]);

  // Node title (e.g. "Node 1: Do / Don't — ลูกมือสายลุย") is intentionally NOT
  // rendered on the explain page — the layout chip already shows the lesson name.
  return (
    <div className="space-y-4 sm:space-y-5 bg-white p-[1.75rem] rounded-[1.75rem]">
      {sections.map((section, sectionIndex) => {
        const heading = section.heading?.trim();
        if (section.type === "practice")
          return section.practice?.questions.length ? (
            <MiniQuiz
              key={sectionIndex}
              questions={section.practice.questions}
              title={heading || "ลองทำโจทย์เพื่อทบทวนความเข้าใจ"}
            />
          ) : null;
        if (section.type === "importantNote")
          return (
            <aside
              key={sectionIndex}
              className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-3 shadow-sm"
              aria-label={heading || "ทริกสำคัญ"}
            >
              <Lightbulb
                size={19}
                className="mt-0.5 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-amber-950">
                  <RichText text={"ทริกสำคัญ"} highlightTextColor="#7372DF" highlightBackground="transparent" as="span" />
                </h2>
                {(section.body || section.tip)?.trim() && (
                  <p className="mt-1 text-sm leading-relaxed text-amber-950">
                    <RichText
                      text={section.body || section.tip || ""}
                      highlightTextColor="#7372DF"
                      highlightBackground="transparent"
                      as="span"
                    />
                  </p>
                )}
              </div>
            </aside>
          );

        const detailed = section.type === "detailedRule";
        return (
          <section
            key={sectionIndex}
            className="rounded-[20px] p-4 sm:p-5"
            style={{ background: C.card, borderColor: C.cardBorder }}
          >
            {heading && (
              <h2 className="text-[1.0625rem] font-semibold text-[#3B3B3B] sm:text-base">
                <RichText text={heading} highlightColor="#FFFFFF" highlightTextColor={C.body} as="span" />
              </h2>
            )}
          <div className="mt-2 space-y-3 rounded-xl bg-white p-[1.0625rem]">
            {(section.chip?.trim() || section.description?.trim()) && (
                <div className="flex flex-wrap items-center gap-2.5">
                {section.chip?.trim() && (
                  <span
                className="inline-flex min-h-8 items-center justify-center rounded-lg w-[5.5rem] px-3 py-1.5 text-[0.8125rem] font-semibold sm:text-sm text-[#6D5B16]"
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
                    className="min-w-0 flex-1 pt-0.5 text-[0.875rem] font-semibold leading-relaxed sm:text-base"
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
              <div className="grid gap-2 sm:grid-cols-3">
                {section.examples.map((example, index) => (
                  <ExampleCard key={index} {...example} />
                ))}
              </div>
            ) : null}
            {(section.rows ?? []).map((row, rowIndex) => {
              const left = row.left?.trim() ?? "";
              const right = row.right?.trim() ?? "";
              if (!left && !right) return null;
              if (!detailed && !right)
                return (
                  <div
                    key={rowIndex}
                    className="w-fit max-w-full rounded-xl border px-3.5 py-2.5"
                    style={{ background: C.pill, borderColor: C.pillBorder }}
                  >
                    <span
                      className="text-xs font-medium leading-relaxed sm:text-sm"
                      style={{ color: C.body }}
                    >
                      <RichText
                        text={left}
                        highlightColor="#FFFFFF"
                        highlightTextColor={C.body}
                        as="span"
                      />
                    </span>
                  </div>
                );
              return (
                <div
                  key={rowIndex}
                  className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3"
                >
                  <div
                    className="flex min-w-0 items-center rounded-xl border px-3.5 py-2.5"
                    style={{ background: C.pill, borderColor: C.pillBorder }}
                  >
                    <span
                      className="text-[12px] font-medium leading-relaxed sm:text-sm"
                      style={{ color: C.body }}
                    >
                      <RichText
                        text={left}
                        highlightColor="#FFFFFF"
                        highlightTextColor={C.body}
                        as="span"
                      />
                    </span>
                  </div>
                  <div className="bg-[#f5f5f5] w-[40px] h-[40px] flex items-center justify-center rounded-[7px]">
                    <span
                    className="self-center justify-self-center text-lg font-bold"
                    style={{ color: C.arrow }}
                    aria-hidden="true"
                  >
                    <MoveRight height={15} width={15} />
                  </span>
                  </div>
                  <div
                    className="flex min-w-0 items-center rounded-xl px-3.5 py-2.5"
                    style={{ background: C.result }}
                  >
                    <span
                      className="text-xs font-semibold leading-relaxed sm:text-sm text-[#555555]"
                      
                    >
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
            {section.type === "detailedRule" && section.examples?.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {section.examples.map((example, index) => (
                  <ExampleCard key={index} {...example} />
                ))}
              </div>
            ) : null}
            {(section.type === "rule" || section.type === "detailedRule") &&
              section.tip?.trim() && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2"
                >
               <div className="flex size-[17px] shrink-0 items-center justify-center rounded-[4px] bg-[#C8E6FF] p-1">
                  <Image
                  src="/logo-otter/star.png"
                  alt=""
                  width={13}
                  height={13}
                />
                    </div>
                  <p
                    className="text-xs font-semibold leading-relaxed sm:text-sm text-[#555555]"
                  >
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
          </section>
        );
        
      })}
    </div>
  );
}
