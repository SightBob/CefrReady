'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { TapExerciseData } from '@/lib/test-set-slots';
import { parseTapExerciseStatus } from '@/lib/tap-visibility';
import ExplainStatusSelect from '@/components/admin/ExplainStatusSelect';

export default function TapExerciseEditor({
  value,
  onChange,
}: {
  value: TapExerciseData;
  onChange: (value: TapExerciseData) => void;
}) {
  const updateItem = (index: number, patch: Partial<TapExerciseData['items'][number]>) => {
    onChange({ ...value, items: value.items.map((item, i) => i === index ? { ...item, ...patch } : item) });
  };

  return (
    <div className="space-y-4">
      {/* สถานะของกิจกรรม: ผู้เรียนเห็นเฉพาะ “เผยแพร่” — แอดมินเห็นทุกสถานะในหน้าสอบจริง
          ที่เปิดด้วยโหมดพรีวิว (?preview=1) และในหน้าจัดชุดข้อสอบนี้ */}
      <ExplainStatusSelect
        label="สถานะกิจกรรม"
        value={parseTapExerciseStatus(value.status)}
        onChange={status => onChange({ ...value, status })}
      />
      <label className="block text-sm font-medium text-slate-700">
        ชื่อกิจกรรม
        <input
          value={value.title}
          onChange={event => onChange({ ...value, title: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          placeholder="เช่น เลือกประโยคที่ถูกต้อง"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        คำแนะนำสำหรับข้อนี้
        <textarea
          value={value.hint ?? ''}
          onChange={event => onChange({ ...value, hint: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          rows={3}
          placeholder="คำอธิบายหรือหลักไวยากรณ์ที่ช่วยทำกิจกรรมนี้"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">รายการฝึก ({value.items.length})</h3>
        <button
          type="button"
          onClick={() => onChange({ ...value, items: [...value.items, { prompt: '', choiceA: '', choiceB: '', correct: 0 }] })}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          <Plus size={16} /> เพิ่ม item
        </button>
      </div>

      {value.items.map((item, index) => (
        <section key={index} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">ข้อย่อย {index + 1}</span>
            <button
              type="button"
              onClick={() => onChange({ ...value, items: value.items.filter((_, i) => i !== index) })}
              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
              aria-label={`ลบ item ${index + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            โจทย์ / ประโยค
            <textarea
              value={item.prompt}
              onChange={event => updateItem(index, { prompt: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              rows={2}
              
            />
          </label>
          <div className="space-y-2">
            {([0, 1] as const).map(choice => {
              const key = choice === 0 ? 'choiceA' : 'choiceB';
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`tap-correct-${index}`}
                    checked={item.correct === choice}
                    onChange={() => updateItem(index, { correct: choice })}
                    aria-label={`คำตอบถูกข้อ ${choice === 0 ? 'A' : 'B'}`}
                  />
                  <span className="w-5 font-bold text-slate-600">{choice === 0 ? 'A' : 'B'}</span>
                  <input
                    value={item[key]}
                    onChange={event => updateItem(index, { [key]: event.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2"
                    placeholder={`ตัวเลือก ${choice === 0 ? 'A' : 'B'}`}
                    required
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {value.items.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">เพิ่ม item อย่างน้อยหนึ่งข้อ</p>}
    </div>
  );
}
