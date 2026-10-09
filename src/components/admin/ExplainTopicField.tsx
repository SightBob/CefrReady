'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  explainTopicsSummary,
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
  /** หัวข้อทั้งหมดที่เนื้อหานี้เชื่อมไว้ (หลายหัวข้อได้ — ตัวแรกคือหัวข้อหลัก) */
  topics: string[];
  options: QuestionTopicOption[];
  /** true = กำลังเปิดช่องพิมพ์หัวข้อใหม่ (หัวข้อที่ยังไม่มีข้อสอบ) */
  customTopic: boolean;
  onChangeTopics: (topics: string[]) => void;
  onCustomTopicChange: (custom: boolean) => void;
}

/**
 * ช่องเชื่อมเนื้อหา Explain เข้ากับข้อสอบ — เลือกได้ **หลายหัวข้อ** (หลาย grammarTopic)
 * ข้อสอบที่หัวข้อตรงกับหัวข้อใดหัวข้อหนึ่งในนี้จะใช้เนื้อหานี้ทั้งหมด และบอกทันทีว่า
 * เชื่อมติดกับข้อสอบรวมกี่ข้อในชุดไหน ถ้าหัวข้อไหนไม่มีข้อสอบใช้ ระบบจะเตือน
 * (และหน้าหลักกันการเผยแพร่)
 */
export default function ExplainTopicField({ topics, options, customTopic, onChangeTopics, onCustomTopicChange }: Props) {
  // ค่าเดิมที่อาจถูกส่งมาเป็น string เดียว — ปรับเป็น array ให้เอง
  const selected = useMemo(() => {
    const list = (topics ?? []).map((topic) => topic.trim()).filter(Boolean);
    return [...new Set(list)];
  }, [topics]);

  const [newTopicText, setNewTopicText] = useState('');

  const linkTone = useMemo(() => {
    const tones = selected.map((topic) => explainTopicTone(linkExplainTopic(topic, options)));
    if (!selected.length) return 'muted' as const;
    if (tones.includes('warn')) return 'warn' as const;
    return 'ok' as const;
  }, [selected, options]);

  // หัวข้อที่โหลดมาจาก DB แล้วไม่มีในรายการข้อสอบ (เนื้อหาเก่า) ต้องคงอยู่ในลิสต์ ไม่ให้ค่าหลุด
  const addable = useMemo(() => {
    const known = options.map((option) => option.grammarTopic);
    const extras = selected.filter((topic) => !known.includes(topic));
    return [...extras, ...known.filter((topic) => !selected.includes(topic))];
  }, [options, selected]);

  const addTopic = (topic: string) => {
    const value = topic.trim();
    if (!value) return;
    if (selected.includes(value)) return;
    onChangeTopics([...selected, value]);
    setNewTopicText('');
  };

  const removeTopic = (topic: string) => {
    onChangeTopics(selected.filter((item) => item !== topic));
  };

  return (
    <div className="block text-sm font-bold text-slate-700">เชื่อมกับ grammarTopic ของข้อสอบ (เลือกได้หลายหัวข้อ)
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((topic, index) => (
            <span
              key={topic}
              className={`inline-flex items-center gap-1.5 rounded-full border-[1.4px] px-3 py-1 text-xs font-semibold ${
                index === 0
                  ? 'border-sky-300 bg-sky-50 text-sky-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {index === 0 && <span className="text-[10px] font-black uppercase tracking-wide text-sky-500">หลัก</span>}
              {topic}
              <button
                type="button"
                onClick={() => removeTopic(topic)}
                aria-label={`เอาหัวข้อ ${topic} ออก`}
                className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      {customTopic ? (
        <div className="mt-1.5 flex items-start gap-2">
          <input
            value={newTopicText}
            onChange={(event) => setNewTopicText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTopic(newTopicText);
                onCustomTopicChange(false);
              }
            }}
            maxLength={200}
            placeholder="พิมพ์ชื่อ grammarTopic (ใช้เมื่อยังไม่มีข้อสอบ)"
            className={`w-full rounded-xl border px-3.5 py-2.5 font-normal focus:outline-none focus:ring-2 ${linkTone === 'warn' ? 'border-amber-300 bg-amber-50/40 focus:border-amber-400 focus:ring-amber-300' : 'border-slate-200 focus:border-sky-400 focus:ring-sky-400'}`}
          />
          <button
            type="button"
            onClick={() => {
              addTopic(newTopicText);
              onCustomTopicChange(false);
            }}
            className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            เพิ่มหัวข้อ
          </button>
          <button
            type="button"
            onClick={() => { onCustomTopicChange(false); setNewTopicText(''); }}
            className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <select
          value=""
          onChange={(event) => {
            if (event.target.value === NEW_TOPIC_VALUE) {
              onCustomTopicChange(true);
              setNewTopicText('');
              return;
            }
            addTopic(event.target.value);
          }}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-normal focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">— เพิ่ม grammarTopic จากข้อสอบ —</option>
          {addable.map((option) => {
            const meta = options.find((topic) => topic.grammarTopic === option);
            return (
              <option key={option} value={option}>
                {meta ? `${option} · ${meta.questionCount} ข้อ` : `⚠ ${option} — ไม่มีข้อสอบข้อใดใช้`}
              </option>
            );
          })}
          <option value={NEW_TOPIC_VALUE}>＋ พิมพ์หัวข้อใหม่ (ยังไม่มีข้อสอบ)</option>
        </select>
      )}
      <span className={`mt-1.5 block text-xs font-semibold ${TONE_CLASS[linkTone]}`}>
        {explainTopicsSummary(selected, options)}
      </span>
    </div>
  );
}
