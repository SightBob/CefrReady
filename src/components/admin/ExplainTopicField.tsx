'use client';

import { useMemo } from 'react';
import {
  explainTopicSummary,
  explainTopicTone,
  linkExplainTopic,
  type QuestionTopicOption,
} from '@/lib/test-explain-topics';

/** ค่าของ option พิเศษ — ใช้เมื่อยังไม่มีข้อสอบที่ใช้หัวข้อนั้น */
const NEW_TOPIC_VALUE = '__new-topic__';

const TONE_CLASS = {
  ok: 'text-emerald-600',
  warn: 'text-amber-600',
  muted: 'text-slate-400',
} as const;

interface Props {
  grammarTopic: string;
  topics: QuestionTopicOption[];
  /** true = พิมพ์หัวข้อเอง (หัวข้อที่ยังไม่มีข้อสอบ) */
  customTopic: boolean;
  onChange: (topic: string) => void;
  onCustomTopicChange: (custom: boolean) => void;
}

/**
 * ช่องเชื่อมเนื้อหา Explain เข้ากับข้อสอบ — เลือกได้เฉพาะหัวข้อที่ดึงมาจาก
 * `questions.grammar_topic` จริง และบอกทันทีว่าเชื่อมติดกับข้อสอบกี่ข้อในชุดไหน
 * ถ้าเลือกหัวข้อที่ไม่มีข้อสอบใช้ ระบบจะเตือน (และหน้าหลักกันการเผยแพร่)
 */
export default function ExplainTopicField({ grammarTopic, topics, customTopic, onChange, onCustomTopicChange }: Props) {
  const link = linkExplainTopic(grammarTopic, topics);

  // หัวข้อที่โหลดมาจาก DB แล้วไม่มีในรายการข้อสอบ (เนื้อหาเก่า) ต้องคงอยู่ในลิสต์ ไม่ให้ค่าหลุด
  const options = useMemo(() => {
    const list = topics.map((topic) => topic.grammarTopic);
    const current = grammarTopic.trim();
    return current && !list.includes(current) ? [current, ...list] : list;
  }, [topics, grammarTopic]);

  return (
    <label className="block text-sm font-bold text-slate-700">เชื่อมกับ grammarTopic ของข้อสอบ
      {customTopic ? (
        <div className="mt-1.5 flex items-start gap-2">
          <input
            value={grammarTopic}
            onChange={(event) => onChange(event.target.value)}
            maxLength={200}
            placeholder="พิมพ์ชื่อ grammarTopic (ใช้เมื่อยังไม่มีข้อสอบ)"
            className={`w-full rounded-xl border px-3.5 py-2.5 font-normal focus:outline-none focus:ring-2 ${link.state === 'unknown' ? 'border-amber-300 bg-amber-50/40 focus:border-amber-400 focus:ring-amber-300' : 'border-slate-200 focus:border-sky-400 focus:ring-sky-400'}`}
          />
          <button
            type="button"
            onClick={() => { onCustomTopicChange(false); onChange(''); }}
            className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            เลือกจากรายการ
          </button>
        </div>
      ) : (
        <select
          value={grammarTopic.trim()}
          onChange={(event) => {
            if (event.target.value === NEW_TOPIC_VALUE) {
              onCustomTopicChange(true);
              onChange('');
              return;
            }
            onChange(event.target.value);
          }}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-normal focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">— เลือก grammarTopic จากข้อสอบ —</option>
          {options.map((option) => {
            const meta = topics.find((topic) => topic.grammarTopic === option);
            return (
              <option key={option} value={option}>
                {meta ? `${option} · ${meta.questionCount} ข้อ` : `⚠ ${option} — ไม่มีข้อสอบข้อใดใช้`}
              </option>
            );
          })}
          <option value={NEW_TOPIC_VALUE}>＋ พิมพ์หัวข้อใหม่ (ยังไม่มีข้อสอบ)</option>
        </select>
      )}
      <span className={`mt-1.5 block text-xs font-semibold ${TONE_CLASS[explainTopicTone(link)]}`}>
        {explainTopicSummary(link)}
      </span>
    </label>
  );
}
