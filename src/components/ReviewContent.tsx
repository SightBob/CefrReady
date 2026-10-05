import React from "react";
import type {
  LessonPracticeQuestion,
  ReviewTopic,
} from "@/lib/lesson-sections";
import { normalizeLessonSections } from "@/lib/lesson-sections";
import RichText from "./RichText";
import Image from "next/image";

// สียังคงเดิมตามโค้ดปัจจุบัน — โครงสร้าง/สัดส่วนเทียบตาม Figma (Tutor - Testing)
const C = {
  card: "#E6F0F8",
  cardBorder: "#E6F0F8",
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
 * กลุ่มการ์ดที่เรนเดอร์เป็นก้อนเดียว: การ์ดกฎ (rule/detailedRule) + กล่องทริกสำคัญ
 * ที่ตามมาในลำดับเดียวกันจะอยู่ในการ์ดสีขาวก้อนเดียวกันตาม design
 */
type CardGroup =
  | { kind: "practice"; sections: ReviewTopic[] }
  | { kind: "note"; sections: ReviewTopic[] }
  | { kind: "rule"; rule: ReviewTopic; notes: ReviewTopic[] };

function groupSections(sections: ReviewTopic[]): CardGroup[] {
  const groups: CardGroup[] = [];
  sections.forEach((section) => {
    const type = section.type ?? "detailedRule";
    if (type === "practice") {
      groups.push({ kind: "practice", sections: [section] });
      return;
    }
    if (type === "importantNote") {
      const last = groups[groups.length - 1];
      if (last && last.kind === "rule") last.notes.push(section);
      else groups.push({ kind: "note", sections: [section] });
      return;
    }
    groups.push({ kind: "rule", rule: section, notes: [] });
  });
  // การ์ด “ลองทำโจทย์เพื่อทบทวนความเข้าใจ” อยู่บนสุดตาม design
  // ตามด้วยการ์ดกฎ แล้วปิดท้ายด้วยกล่องทริกที่ไม่ได้ผูกกับการ์ดกฎใด
  const practice = groups.filter((group) => group.kind === "practice");
  const rules = groups.filter((group) => group.kind === "rule");
  const notes = groups.filter((group) => group.kind === "note");
  return [...practice, ...rules, ...notes];
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
      className="flex w-full flex-col items-center gap-[13px] rounded-2xl border border-slate-200 bg-white p-4 max-md:rounded-[14px] max-md:border-0"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-1 text-[14px] font-semibold uppercase tracking-[0.35px] text-[#2B6C00] max-md:text-[12px] max-md:text-[#497293]">
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
                className={`grid size-[19px] place-items-center rounded-[4px] text-[11px] font-bold transition-colors ${
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
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F1F5F9] text-[14px] font-bold text-[#64748B] max-md:size-6 max-md:rounded-[6px] max-md:text-[12px]">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 break-words">{option}</span>
              </button>
            );
          })}
        </div>
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
        <p className="pl-5 text-[13px] leading-[22px] text-amber-950 max-md:pl-0 max-md:text-[12px] max-md:text-[#6C5F2D]">
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
}: {
  title?: string;
  topics: ReviewTopic[];
  intro?: string;
  tip?: string;
}) {
  // ลำดับการแสดงผลถูกจัดการใน groupSections(): การ์ด “ลองทำโจทย์เพื่อทบทวน
  // ความเข้าใจ” บนสุด → การ์ดกฎ (ตามด้วยกล่องทริกของการ์ดนั้น) → กล่องทริกที่ไม่ผูกกับกฎ
  const groups = React.useMemo(
    () => groupSections(normalizeLessonSections(topics, { intro, tip: _tip })),
    [topics, intro, _tip],
  );

  // Node title (e.g. "Node 1: Do / Don't — ลูกมือสายลุย") is intentionally NOT
  // rendered on the explain page — the layout chip already shows the lesson name.
  return (
    <div className="flex w-full flex-col items-center gap-3.5 max-md:gap-[7px]">
      {groups.map((group, groupIndex) => {
        if (group.kind === "practice") {
          const section = group.sections[0];
          const questions = section.practice?.questions ?? [];
          if (!questions.length) return null;
          return (
            <MiniQuiz
              key={groupIndex}
              questions={questions}
              title={section.heading?.trim() || "ลองทำโจทย์เพื่อทบทวนความเข้าใจ"}
            />
          );
        }

        if (group.kind === "note") {
          return (
            <div
              key={groupIndex}
              className="flex w-full flex-col items-center gap-4 rounded-[28px] bg-white py-6 max-md:rounded-[18px] max-md:gap-[10px] max-md:py-0 max-md:pt-[10px] max-md:pb-[22px] max-md:px-[15px]"
            >
              {group.sections.map((section, noteIndex) => (
                <TipBubble
                  key={noteIndex}
                  heading={section.heading?.trim() || "ทริกสำคัญ"}
                  body={section.body || section.tip || ""}
                />
              ))}
            </div>
          );
        }

        const section = group.rule;
        const detailed = section.type === "detailedRule";
        return (
          <div
            key={groupIndex}
            className="flex w-full flex-col items-center gap-4 rounded-[28px] bg-white py-6 max-md:rounded-[18px] max-md:gap-[10px] max-md:py-0 max-md:pt-[10px] max-md:pb-[22px] max-md:px-[15px]"
          >
            {/* การ์ดกฎ: พื้นหลังอ่อน + เนื้อหาสีขาวด้านใน */}
            <section
              className="flex w-[668px] max-w-full flex-col rounded-2xl p-4 max-md:w-full max-md:rounded-[16px]"
              style={{ background: C.card, borderColor: C.cardBorder }}
            >
              <div className="flex w-full flex-col rounded-xl bg-white py-[17px] pl-5 pr-[19px] max-md:gap-[10px] max-md:px-[10px]">
                {/* แถวหัว: chip + คำอธิบาย */}
                {(section.chip?.trim() || section.description?.trim()) && (
                  <div className="flex w-full flex-wrap items-center gap-[9px]">
                    {section.chip?.trim() && (
                      <span
                        className="inline-flex h-6 w-[88px] shrink-0 items-center justify-center rounded-[7px] px-1.5 py-1 text-[13px] font-semibold text-[#6D5B16] max-md:h-6 max-md:w-auto max-md:max-w-[120px] max-md:px-[6px] max-md:text-[12px]"
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
                          <span className="text-[12px] font-medium leading-[22px]" style={{ color: C.body }}>
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
                          <span className="text-[12px] font-medium leading-[22px]" style={{ color: C.body }}>
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

            {group.notes.map((note, noteIndex) => (
              <TipBubble
                key={noteIndex}
                heading={note.heading?.trim() || "ทริกสำคัญ"}
                body={note.body || note.tip || ""}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
