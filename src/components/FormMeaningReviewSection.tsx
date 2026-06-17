'use client';

import React, { useMemo } from 'react';
import { FileText, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import SelectableText from './SelectableText';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface Article {
  title: string;
  text: string;
  blanks: Blank[];
}

interface ReviewItem {
  questionId: number;
  question: {
    id: number;
    testTypeId: string;
    article: Article | null;
  } | null;
  userAnswer: string;
  isCorrect: boolean;
}

interface FormMeaningReviewSectionProps {
  items: ReviewItem[];
}

function combineItems(items: ReviewItem[]) {
  const allBlanks: Blank[] = [];
  let combinedText = '';
  let combinedTitle = '';
  let globalBlankId = 1;
  const answers: Record<number, string> = {};

  items.forEach((item, index) => {
    if (!item.question?.article) return;
    const art = item.question.article;
    if (index === 0) combinedTitle = art.title;

    let text = art.text;
    art.blanks.forEach((blank) => {
      text = text.replace(`{{${blank.id}}}`, `{{${globalBlankId}}}`);
      allBlanks.push({ id: globalBlankId, correctAnswer: blank.correctAnswer, hint: blank.hint });
      globalBlankId++;
    });
    if (index > 0) combinedText += ' ';
    combinedText += text;
  });

  // Parse user answers: each item stores {"originalBlankId": "value"}
  let gId = 1;
  items.forEach((item) => {
    if (!item.question?.article) return;
    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(item.userAnswer); } catch {}
    item.question.article.blanks.forEach((blank) => {
      answers[gId] = parsed[String(blank.id)] || '';
      gId++;
    });
  });

  const correctCount = allBlanks.filter(
    (b) => answers[b.id]?.toLowerCase().trim() === b.correctAnswer.toLowerCase().trim()
  ).length;

  return {
    article: { title: combinedTitle || 'Fill in the blanks', text: combinedText, blanks: allBlanks },
    answers,
    totalBlanks: allBlanks.length,
    correctCount,
  };
}

export default function FormMeaningReviewSection({ items }: FormMeaningReviewSectionProps) {
  const { article, answers, totalBlanks, correctCount } = useMemo(() => combineItems(items), [items]);

  // No items or no articles found — can't display review
  if (items.length === 0 || article.blanks.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">ไม่สามารถแสดงเฉลยได้ — ข้อมูลบทความหรือคำตอบไม่ถูกบันทึก</p>
          <p className="text-slate-400 text-xs mt-1">ลองทำข้อสอบชุดใหม่อีกครั้งเพื่อบันทึกข้อมูลอย่างสมบูรณ์</p>
        </div>
      </div>
    );
  }

  let text = article.text;
  const parts: React.ReactNode[] = [];
  let key = 0;

  article.blanks.forEach((blank) => {
    const ph = `{{${blank.id}}}`;
    const idx = text.indexOf(ph);
    if (idx === -1) return;

    parts.push(
      <span key={key++}>
        <SelectableText text={text.substring(0, idx)} contextSentence={article.text} inline={true} />
      </span>
    );

    const userVal = answers[blank.id] || '';
    const isCorrect = userVal.toLowerCase().trim() === blank.correctAnswer.toLowerCase().trim();
    const isWrong = userVal && !isCorrect;

    parts.push(
      <span key={key++} className="inline-flex flex-col items-start mx-1">
        <input
          type="text"
          readOnly
          className={`w-24 sm:w-32 px-2 py-1 rounded border-2 text-center ${
            isCorrect
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : isWrong
                ? 'border-red-500 bg-red-50 text-red-700 line-through'
                : 'border-amber-400 bg-amber-50 text-amber-600'
          }`}
          value={userVal}
        />
        {isWrong && (
          <span className="flex items-center gap-1 mt-1">
            <ArrowRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              <SelectableText text={blank.correctAnswer} contextSentence={blank.correctAnswer} />
            </span>
          </span>
        )}
        {!userVal && (
          <span className="flex items-center gap-1 mt-1">
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              Answer: <SelectableText text={blank.correctAnswer} contextSentence={blank.correctAnswer} />
            </span>
          </span>
        )}
      </span>
    );

    text = text.substring(idx + ph.length);
  });

  parts.push(
    <span key={key}>
      <SelectableText text={text} contextSentence={article.text} inline={true} />
    </span>
  );

  const pct = totalBlanks > 0 ? Math.round((correctCount / totalBlanks) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-purple-600" />
        <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-6">
        <SelectableText text={article.title} contextSentence={article.title} />
      </h2>

      <div className="text-lg text-slate-700 leading-relaxed">{parts}</div>

      <div className={`mt-6 p-4 rounded-xl ${
        correctCount === totalBlanks
          ? 'bg-emerald-50 border border-emerald-200'
          : correctCount >= totalBlanks * 0.7
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {correctCount === totalBlanks ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-600" />
          )}
          <p className="font-medium text-slate-800">
            {correctCount === totalBlanks
              ? 'ถูกต้องทั้งหมด!'
              : `คะแนน: ${correctCount} จาก ${totalBlanks} (${pct}%)`}
          </p>
        </div>
        {correctCount < totalBlanks && (
          <p className="text-sm text-slate-600 ml-7">
            {correctCount >= totalBlanks * 0.7
              ? 'ใกล้จะถูกแล้ว! ทบทวนช่องที่มีสีแดง'
              : 'ทบทวนคำตอบที่ถูกต้อง (สีเขียว) ใต้แต่ละช่อง'}
          </p>
        )}
      </div>
    </div>
  );
}
