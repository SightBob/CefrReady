'use client';

import SelectableText from './SelectableText';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

export interface FormMeaningFillArticle {
  title: string;
  text: string;
  blanks: Blank[];
}

interface FormMeaningFillCardProps {
  article: FormMeaningFillArticle;
  /** blankId -> คำตอบที่ผู้เรียนพิมพ์ (lowercase แล้ว) */
  answers: Record<number, string>;
  /** พิมพ์ในช่องกรอก — ผู้ใช้เก็บ state เอง (per-blank เพื่อให้ชุดข้อสอบใช้ functional update ได้) */
  onInputChange: (blankId: number, value: string) => void;
  /** true = เฉลยแล้ว — แสดงสีถูก/ผิด + chip คำตอบที่ถูกใต้ช่อง */
  revealed?: boolean;
  /** blankId -> คำตอบที่ถูก (Full Test ได้จาก /api/tests/full/check · ชุดปกติคำนวณจาก article เอง) */
  correctAnswers?: Record<number, string> | null;
  disabled?: boolean;
  /** เนื้อหาเพิ่มเติมในการ์ด (เช่น ปุ่มดูผลของ FormMeaningQuiz) */
  children?: React.ReactNode;
}

/**
 * การ์ดบทความเติมคำของ Form and Meaning — UI จาก Figma ที่ชุดข้อสอบใช้อยู่
 * (Figma 172:11331 การ์ด 840×505 r20 · หัวข้อ 172:11404 · เนื้อหา 172:11407
 *  · ช่องกรอก 172:11412 — 128×40.45 r8 ขอบ 1.6px #BCD8F0)
 * แยกออกจาก FormMeaningQuiz เพื่อให้หน้าสอบ Full Test ใช้ UI เดียวกัน
 * โดยไม่ต้องผูกกับ submit flow ของชุดข้อสอบ
 */
export default function FormMeaningFillCard({
  article,
  answers,
  onInputChange,
  revealed = false,
  correctAnswers,
  disabled = false,
  children,
}: FormMeaningFillCardProps) {
  const renderArticle = () => {
    let text = article.text;
    const parts: React.ReactNode[] = [];
    let key = 0;
    article.blanks.forEach((blank) => {
      const ph = `{{${blank.id}}}`;
      const idx = text.indexOf(ph);
      if (idx !== -1) {
        parts.push(
          <span key={key++}>
            <SelectableText text={text.substring(0, idx)} contextSentence={article.text} inline={true} />
          </span>
        );

        const userAnswer = (answers[blank.id] ?? '').toLowerCase().trim();
        const correctRaw = correctAnswers?.[blank.id] ?? blank.correctAnswer;
        const isCorrect = revealed && userAnswer !== '' && userAnswer === correctRaw.toLowerCase().trim();
        const isWrong = revealed && !isCorrect && userAnswer !== '';
        const isEmpty = revealed && userAnswer === '';

        parts.push(
          // Figma 172:11412 — ช่องกรอก 128×40.45 r8 ขอบ 1.6px #BCD8F0 พื้นขาว ตัวอักษร 18px #9CA3AF กึ่งกลาง
          <span key={key++} className="inline-flex flex-col items-start align-middle">
            <input
              type="text"
              className={`h-[40.45px] w-32 shrink-0 rounded-lg border-[1.6px] bg-white px-2 py-1 text-center align-middle text-[1.125rem] leading-normal focus:outline-none ${isCorrect
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : isWrong
                  ? 'border-red-500 bg-red-50 text-red-700 line-through'
                  : isEmpty
                    ? 'border-amber-400 bg-amber-50 text-amber-600'
                    : 'border-[#BCD8F0] text-[#9CA3AF] placeholder:text-[#9CA3AF] focus:border-[#BCD8F0]'
                }`}
              placeholder={blank.hint?.split(' - ')[0] || 'Answer'}
              value={answers[blank.id] || ''}
              onChange={(e) =>
                !revealed && !disabled && onInputChange(blank.id, e.target.value.toLowerCase().trim())
              }
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              disabled={revealed || disabled}
            />
            {isWrong && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  <SelectableText text={correctRaw} contextSentence={correctRaw} />
                </span>
              </span>
            )}
            {isEmpty && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                  Answer: <SelectableText text={correctRaw} contextSentence={correctRaw} />
                </span>
              </span>
            )}
          </span>
        );
        text = text.substring(idx + ph.length);
      }
    });
    parts.push(
      <span key={key}>
        <SelectableText text={text} contextSentence={article.text} inline={true} />
      </span>
    );
    return parts;
  };

  return (
    // Figma 172:11331 — การ์ด 840×505 r20 พื้นขาว ไม่มีเงา/เส้นขอบ
    <div className="w-full rounded-[20px] bg-white pt-[25px] pb-[35px]">
      {/* 172:11404 — หัวบทความ 16px SemiBold #404040 uppercase tracking 0.35px leading 18px */}
      <h2 className="px-[30px] text-[1rem] font-semibold uppercase leading-[18px] tracking-[0.35px] text-[#404040]">
        <SelectableText text={article.title} contextSentence={article.title} inline />
      </h2>

      {/* 172:11407 — เส้นคั่น 1px #E9E9E9 · เนื้อหา · เส้นคั่น (gap 9px รอบแถว)
          172:11409 — แต่ละบรรทัดสูง 40.45px (ช่องกรอก) เว้นกัน 24px
          → ใน flow ข้อความเดียว ใช้ line-height 64.45px = 40.45 + 24 และช่องกรอก align-middle */}
      <div className="mt-[19px] px-[33px]">
        <div className="h-px w-full rounded-[29px] bg-[#E9E9E9]" />

        <div className="mt-[9px] px-2 text-[1.125rem] font-medium leading-[64.45px] text-[#334155]">
          {renderArticle()}
        </div>

        <div className="mt-[9px] h-px w-full rounded-[29px] bg-[#E9E9E9]" />
      </div>

      {children}
    </div>
  );
}
