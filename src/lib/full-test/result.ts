import type { DbQuestion } from '@/db/schema';
import { parseStructuredAnswer } from '@/lib/score-utils';
import {
  calculateRawScore,
  calculateMaxPossibleScore,
  calculateConfidence,
  normalizeScore,
  normalizedScoreToCefr,
} from './algorithm';
import type { CefrLevel } from './constants';
import type { AttemptPathEntry } from './state';

/**
 * ผลสอบ Full Test
 *
 * หน่วยการนับ: "1 ข้อ" = 1 ช่องใน FULL_TEST_PART_DISTRIBUTION (45 ข้อ)
 * บทความ Cloze (Form & Meaning) มีหลายช่องแต่ยังนับเป็น 1 ข้อ ให้ตรงกับ
 * ตัวนับระหว่างสอบ ("ข้อ 30/45") และจำนวนที่หน้า intro โฆษณา
 * ข้อ Cloze ได้คะแนนเต็มเมื่อเติมถูกทุกช่อง — เก็บรายละเอียดช่องไว้ใน
 * perPart[].blanksTotal/blanksCorrect เพื่อโชว์ "x/y ข้อ (a/b ช่อง)"
 *
 * ระดับ CEFR ที่คืนมาอิงช่วงคะแนนของ normalizedScore เสมอ (CEFR_SCORE_RANGES)
 * เพื่อไม่ให้หน้าผลสอบแสดงระดับที่ขัดกับตัวเลข "nnn / 120" ที่อยู่ข้างกัน
 * (เดิมใช้ระดับที่ทำความแม่นได้ ซึ่งทำให้เห็น A1 คู่กับ 29/120 ทั้งที่ตารางบอก A2)
 */
export function calculateFullTestResult(path: AttemptPathEntry[], legacyQuestions: DbQuestion[] = []) {
  const outcomes: Array<{ cefrLevel: CefrLevel; wasCorrect: boolean; reused?: boolean }> = [];
  const perPart: Record<
    string,
    { total: number; correct: number; blanksTotal?: number; blanksCorrect?: number }
  > = {};

  for (const entry of path) {
    const question = entry.questionSnapshot ?? legacyQuestions.find((row) => row.id === entry.questionId);
    const article = question?.article as { blanks?: Array<{ id: number; correctAnswer: string }> } | null | undefined;
    const blanks = entry.testTypeId === 'form-meaning' ? article?.blanks ?? [] : [];
    const stats = perPart[entry.testTypeId] ??= { total: 0, correct: 0 };

    let wasCorrect = entry.wasCorrect;
    if (blanks.length) {
      const answers = parseStructuredAnswer(entry.selectedAnswer) ?? {};
      const correctBlanks = blanks.filter((blank) => {
        const given = answers[String(blank.id)]?.trim();
        return !!given && given.toLowerCase() === blank.correctAnswer.trim().toLowerCase();
      }).length;
      stats.blanksTotal = (stats.blanksTotal ?? 0) + blanks.length;
      stats.blanksCorrect = (stats.blanksCorrect ?? 0) + correctBlanks;
      wasCorrect = correctBlanks === blanks.length;
    }

    outcomes.push({ cefrLevel: entry.cefrLevel, wasCorrect, reused: entry.reused });
    stats.total += 1;
    if (wasCorrect) stats.correct += 1;
  }

  const correctAnswers = outcomes.filter((outcome) => outcome.wasCorrect).length;
  const totalQuestions = outcomes.length;
  const normalizedScore = normalizeScore(
    calculateRawScore(outcomes),
    calculateMaxPossibleScore(outcomes)
  );

  return {
    score: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 10_000) / 100 : 0,
    correctAnswers,
    totalQuestions,
    normalizedScore,
    cefrLevel: normalizedScoreToCefr(normalizedScore),
    confidence: calculateConfidence(path.length),
    reusedCount: path.filter((entry) => entry.reused).length,
    perPart,
  };
}
