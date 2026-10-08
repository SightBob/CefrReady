'use client';

import type { CoverageQuestionState, ExplainCoverage } from '@/lib/explain-coverage';
import { explainCoverageSummary, explainCoverageWarning } from '@/lib/explain-coverage';

const STATE_TONE: Record<ExplainCoverage['state'], string> = {
  covered: 'text-emerald-600',
  partial: 'text-amber-600',
  unverifiable: 'text-slate-500',
  'empty-topic': 'text-slate-400',
};

/** สัญลักษณ์หน้าข้อ — เทียบกับหัวข้อย่อยที่บทอธิบายไว้ */
const QUESTION_MARK: Record<CoverageQuestionState, { icon: string; className: string; label: string }> = {
  covered: { icon: '✓', className: 'text-emerald-600', label: 'อธิบายแล้ว' },
  missing: { icon: '⚠', className: 'text-amber-600', label: 'ยังไม่มีหัวข้อย่อยนี้ในบท' },
  untagged: { icon: '?', className: 'text-slate-400', label: 'ข้อยังไม่ระบุหัวข้อย่อย' },
};

const QUESTION_ROW_CLASS: Record<CoverageQuestionState, string> = {
  covered: 'border-emerald-100 bg-emerald-50/40',
  missing: 'border-amber-200 bg-amber-50/60',
  untagged: 'border-slate-200 bg-slate-50',
};

/**
 * การ์ดตรวจความครอบคลุมของบท Explain — เทียบข้อสอบทุกข้อในหัวข้อกับหัวข้อย่อยที่บทมี
 *
 * เป็น **คำเตือนเท่านั้น** ไม่ได้เอาไปกั้นการเผยแพร่ (ต่างจาก validationWarnings ที่
 * กันการเผยแพร่จริง) เพราะเนื้อหาที่ไม่ครบก็ยังมีประโยชน์กว่าการไม่มีเนื้อหาเลย
 */
export default function ExplainCoveragePanel({
  coverage,
  loading = false,
}: {
  coverage: ExplainCoverage;
  loading?: boolean;
}) {
  const warning = explainCoverageWarning(coverage);
  const missing = coverage.questions.filter((question) => question.state === 'missing');
  const untagged = coverage.questions.filter((question) => question.state === 'untagged');
  const covered = coverage.questions.filter((question) => question.state === 'covered');

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-extrabold text-slate-800">ความครอบคลุมของเนื้อหา</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          เตือนเท่านั้น ไม่บล็อกการเผยแพร่
        </span>
      </div>

      {loading ? (
        <p className="mt-2 text-xs font-semibold text-slate-400">กำลังโหลดข้อสอบของหัวข้อนี้…</p>
      ) : (
        <>
          <p className={`mt-2 text-xs font-bold ${STATE_TONE[coverage.state]}`}>{explainCoverageSummary(coverage)}</p>

          {coverage.lessonLabels.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-bold text-slate-600">หัวข้อย่อยในบทนี้ ({coverage.lessonLabels.length}):</span>{' '}
              {coverage.lessonLabels.join(' · ')}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-bold text-slate-600">บทนี้ยังไม่มีหัวข้อย่อย:</span> ใส่ช่อง “หัวข้อย่อย” ของการ์ดกฎให้ตรงกับหัวข้อย่อยของข้อ เพื่อให้ระบบเทียบได้
            </p>
          )}

          {warning && (
            <p className="mt-3 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              ⚠ {warning}
            </p>
          )}

          {coverage.questions.length > 0 && (
            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {[...missing, ...untagged, ...covered].map((question) => {
                const mark = QUESTION_MARK[question.state];
                return (
                  <div
                    key={question.id}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${QUESTION_ROW_CLASS[question.state]}`}
                  >
                    <span className={`mt-px shrink-0 font-black ${mark.className}`} title={mark.label}>
                      {mark.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-700">{question.questionText}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {question.subTopic ? `หัวข้อย่อยของข้อ: ${question.subTopic}` : 'ข้อยังไม่ระบุหัวข้อย่อย (ตรวจไม่ได้)'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">#{question.id}</span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-2 text-[11px] text-slate-400">
            เทียบด้วยหัวข้อย่อยของข้อ (<code>sub_topic_grammar</code>) กับหัวข้อย่อย/หัวข้อที่บทใช้ — ไม่สนตัวพิมพ์และช่องว่างซ้อน
          </p>
        </>
      )}
    </section>
  );
}
