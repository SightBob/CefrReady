import React from "react";
import { ArrowRight, ArrowRightIcon, ArrowRightToLine, Lightbulb, MoveLeft, MoveRight } from "lucide-react";
import type {
  LessonPracticeQuestion,
  ReviewTopic,
} from "@/content/units-path-lessons";
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
  chip: "#FFF0B8",
  chipText: "#6D5B16",
  arrow: "#555555",
  tipBg: "#E7F3FD",
  tipText: "#2B6CB0",
  heading: "#404040",
  body: "#555555",
};

function SentenceBlank({ sentence }: { sentence: string }) {
  const parts = sentence.split("____");
  return (
    <p className="text-base sm:text-lg font-bold leading-relaxed text-slate-800">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-16 rounded-sm border-b-[3px] border-slate-400 align-bottom" />
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
  const [selectedOptions, setSelectedOptions] = React.useState<
    Record<number, number>
  >({});
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const question = questions[active];
  if (!question) return null;
  const selected = answers[active];
  const selectedOption = selectedOptions[active];
  const isCorrect = selected === question.answerIndex;
  const choose = (optionIndex: number) =>
    setSelectedOptions((current) =>
      current[active] === undefined && answers[active] === undefined
        ? { ...current, [active]: optionIndex }
        : current,
    );

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      aria-label={title}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-emerald-700 sm:text-base">
          {title}
        </h2>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          {active + 1} / {questions.length}
        </span>
      </div>
      <nav
        className="mb-4 flex flex-wrap gap-2"
        aria-label="เลือกข้อ Mini Quiz"
      >
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
              className={`grid size-9 place-items-center rounded-full border text-xs font-extrabold transition-colors ${active === index ? "border-emerald-600 bg-emerald-600 text-white" : answered && correct ? "border-emerald-200 bg-emerald-50 text-emerald-700" : answered ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500 hover:border-emerald-400 hover:bg-emerald-50"}`}
            >
              {index + 1}
            </button>
          );
        })}
      </nav>
      <div className="mb-4 rounded-xl bg-slate-50 p-4">
        <SentenceBlank sentence={question.sentence} />
      </div>
      <div
        className="grid gap-2.5 sm:grid-cols-2"
        role="group"
        aria-label="เลือกคำตอบ"
      >
        {question.options.map((option, index) => {
          const chosen = selectedOption === index;
          const answer = question.answerIndex === index;
          const hasAnswered = selected !== undefined;
          const stateClass =
            hasAnswered && answer
              ? "border-emerald-400 bg-emerald-50 text-emerald-900"
              : hasAnswered && selected === index
                ? "border-rose-400 bg-rose-50 text-rose-900"
                : chosen
                  ? "border-sky-400 bg-sky-50 text-sky-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50";
          return (
            <button
              key={`${index}-${option}`}
              type="button"
              onClick={() => choose(index)}
              disabled={hasAnswered}
              aria-pressed={chosen}
              className={`flex min-h-12 items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors disabled:cursor-default ${stateClass}`}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/80 text-xs font-extrabold text-slate-500">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {selected !== undefined && (
        <p
          className={`mt-3 text-sm font-semibold leading-relaxed ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}
          role="status"
        >
          {isCorrect ? "ถูกต้อง! " : "ยังไม่ถูก คำตอบที่ถูกไฮไลต์ไว้แล้ว · "}
          {question.explanation}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActive((index) => Math.max(0, index - 1))}
          disabled={active === 0}
          className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← ก่อนหน้า
        </button>
        {selected === undefined && (
          <button
            type="button"
            onClick={() => {
              if (selectedOption !== undefined)
                setAnswers((current) => ({
                  ...current,
                  [active]: selectedOption,
                }));
            }}
            disabled={selectedOption === undefined}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ตรวจคำตอบ
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            setActive((index) => Math.min(questions.length - 1, index + 1))
          }
          disabled={active === questions.length - 1}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ข้อถัดไป →
        </button>
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
    <div
      className={`rounded-[0.4375rem] py-[0.4125rem] bg-[#F5F5F5] flex justify-center items-center`}
    >
      <p
        className={`text-sm font-medium leading-relaxed ${ok === false ? "text-slate-600" : "text-slate-800"}`} style={{ color: C.body }}
      >
        <RichText text={en} highlightColor="#FFFFFF" highlightTextColor={C.body} as="span" />
      </p>
      {th && (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: C.body }}>
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
  const sections = normalizeLessonSections(topics, { intro, tip: _tip });

  // Node title (e.g. "Node 1: Do / Don't — ลูกมือสายลุย") is intentionally NOT
  // rendered on the explain page — the layout chip already shows the lesson name.
  return (
    <div className="space-y-4 sm:space-y-5 p-[1.5rem] bg-white rounded-[28px]">
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
              aria-label={heading || "จุดสำคัญที่ควรจำ"}
            >
              <Lightbulb
                size={19}
                className="mt-0.5 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-amber-950">
                  <RichText text={heading || "จุดสำคัญที่ควรจำ"} highlightTextColor="#7372DF" highlightBackground="transparent" as="span" />
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
            className="rounded-2xl p-4 sm:p-5"
            style={{ background: C.card, borderColor: C.cardBorder }}
          >
            {heading && (
              <h2 className="text-[1.0625rem] font-semibold text-[#555555] sm:text-base" style={{ color: C.body }}>
                <RichText text={heading} highlightColor="#FFFFFF" highlightTextColor={C.body} as="span" />
              </h2>
            )}
          <div className="p-4 bg-white space-y-3 mt-[0.5rem] rounded-[12px]">
            {(section.chip?.trim() || section.description?.trim()) && (
                <div className="flex flex-wrap items-center gap-2.5">
                {section.chip?.trim() && (
                  <span
                className="inline-flex justify-center items-center rounded-lg w-[88px] py-1.5 text-[0.8125rem] font-semibold sm:text-sm"
                style={{ background: C.chip, color: C.body }}
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
                    className="min-w-[180px] flex-1 pt-0.5 text-[0.875rem] font-semibold leading-relaxed sm:text-base"
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
                      className="text-xs font-semibold leading-relaxed sm:text-sm"
                      style={{ color: C.body }}
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
                  className="flex items-start gap-1 rounded-xl"
                >
               <div className="bg-[#C8E6FF] w-[17px] h-[17px] p-1 flex items-center justify-center rounded-[4px]">
                  <Image
                  src="/logo-otter/star.png"
                  alt=""
                  width={13}
                  height={13}
                />
                    </div>
                  <p
                    className="text-xs font-semibold leading-relaxed sm:text-sm"
                    style={{ color: C.body }}
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
