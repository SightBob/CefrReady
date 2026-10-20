'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw, Search } from 'lucide-react';

import { aiTutorSaveRequestSchema, type AiTutorSettingsKey } from '@/lib/ai-tutor/settings-schema';
import {
  AI_TUTOR_RANGES,
  checkCrossFieldRules,
  type AiTutorRangeKey,
} from '@/lib/ai-tutor/ranges';

import ConfirmModal from './ConfirmModal';
import type { AdminAuditRow, AdminConfigResponse, AdminModel, ModelTestResult } from './types';

const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-primary-500';

/** ดึงเฉพาะขอบเขตจากแหล่งเดียว (ไม่เอา hint มาด้วย — หน้านี้ใช้คำอธิบายของตัวเอง) */
const rangeOf = (key: AiTutorRangeKey) => {
  const range = AI_TUTOR_RANGES[key];
  return { min: range.min, max: range.max, step: range.step };
};

/**
 * คีย์ที่ตั้งค่าได้ + คำอธิบายสั้น
 * ขอบเขต (min/max/step) ดึงจาก src/lib/ai-tutor/ranges.ts — แหล่งเดียวกับที่ server ตรวจตอนบันทึก
 */
const NUMERIC_FIELDS: Array<{
  key: AiTutorRangeKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'questionQuota', label: 'โควตาต่อข้อ (ครั้ง/วัน)', hint: 'จำนวนคำถามที่ถาม AI ได้ต่อข้อหนึ่งในหนึ่งวัน (ตามเวลาไทย)', ...rangeOf('questionQuota') },
  { key: 'userDailyLimit', label: 'เพดานต่อผู้เรียน (ครั้ง/วัน)', hint: 'จำนวนคำถามรวมของผู้เรียนหนึ่งคนต่อวัน (ซ่อนจากผู้เรียน) · ต้องไม่น้อยกว่าโควตาต่อข้อ', ...rangeOf('userDailyLimit') },
  { key: 'systemDailyLimit', label: 'เพดานรวมทั้งระบบ (ครั้ง/วัน)', hint: 'จำนวนคำถามรวมทั้งระบบต่อวัน (เพดานต้นทุน) · ค่า 0 ไม่ได้หมายถึงปิดทุกคน — ให้ใช้สวิตช์ชั่วคราวแทน', ...rangeOf('systemDailyLimit') },
  { key: 'rolloutPercent', label: 'Rollout (%)', hint: 'เปอร์เซ็นต์ของผู้เรียนที่จะได้ใช้ฟีเจอร์แบบสุ่มแบบคงที่ (คนเดิมได้กลุ่มเดิม)', ...rangeOf('rolloutPercent') },
  { key: 'maxTokens', label: 'เพดาน token คำตอบ', hint: 'รวม reasoning + คำตอบ', ...rangeOf('maxTokens') },
  { key: 'timeoutMs', label: 'เวลารอสูงสุด (มิลลิวินาที)', hint: 'เวลารอโมเดลต่อครั้ง (หลัก/สำรอง) — ต้องไม่เกินเพดานของ maxDuration', ...rangeOf('timeoutMs') },
  { key: 'firstTokenTimeoutMs', label: 'เวลารอเนื้อหาชิ้นแรก (มิลลิวินาที)', hint: 'ถ้าโมเดลยังไม่ตอบภายในเวลานี้ ระบบจะสลับไปใช้โมเดลสำรอง · ต้องไม่เกินเวลารอสูงสุด', ...rangeOf('firstTokenTimeoutMs') },
];

type FormState = Record<string, string | boolean | null>;

function toFormState(config: AdminConfigResponse['config']): FormState {
  return {
    runtimeEnabled: config.runtimeEnabled,
    primaryModel: config.primaryModel,
    fallbackModel: config.fallbackModel,
    primaryEffort: config.primaryEffort,
    fallbackEffort: config.fallbackEffort,
    maxTokens: String(config.maxTokens),
    timeoutMs: String(config.timeoutMs),
    firstTokenTimeoutMs: String(config.firstTokenTimeoutMs),
    questionQuota: String(config.questionQuota),
    userDailyLimit: String(config.userDailyLimit),
    systemDailyLimit: String(config.systemDailyLimit),
    rolloutPercent: String(config.rolloutPercent),
    promptCache: config.promptCache,
  };
}

export default function ConfigTab() {
  const [data, setData] = useState<AdminConfigResponse | null>(null);
  const [models, setModels] = useState<AdminModel[]>([]);
  const [audit, setAudit] = useState<AdminAuditRow[]>([]);
  const [form, setForm] = useState<FormState>({});
  const [resetKeys, setResetKeys] = useState<string[]>([]);
  const [modelQuery, setModelQuery] = useState('');
  const [fallbackQuery, setFallbackQuery] = useState('');
  const [testedModel, setTestedModel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'ok' | 'error'>('ok');
  const [confirmDisable, setConfirmDisable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // แยกแต่ละส่วนด้วย allSettled: ประวัติ (audit) ล้มได้โดยไม่ทำให้ทั้งหน้าล้ม
    const [configResult, modelsResult, auditResult] = await Promise.allSettled([
      fetch('/api/admin/ai-tutor/config'),
      fetch('/api/admin/ai-tutor/models'),
      fetch('/api/admin/ai-tutor/audit?limit=20'),
    ]);

    const problems: string[] = [];

    // ─── ค่าตั้ง (สำคัญ: ถ้าล้ม = หน้านี้ใช้ไม่ได้จริง) ───
    if (configResult.status === 'rejected') {
      problems.push('โหลดค่าตั้งไม่สำเร็จ');
    } else {
      const configRes = configResult.value;
      const configBody = await configRes.json().catch(() => null);
      if (!configRes.ok || !configBody?.success) {
        problems.push(configBody?.error || 'โหลดค่าตั้งไม่สำเร็จ');
      } else {
        setData(configBody.data);
        setForm(toFormState(configBody.data.config));
        setResetKeys([]);
      }
    }

    // ─── รายการโมเดล (เสริม) ───
    if (modelsResult.status === 'fulfilled' && modelsResult.value.ok) {
      const modelsBody = await modelsResult.value.json().catch(() => null);
      if (modelsBody?.success) setModels(modelsBody.data ?? []);
    }

    // ─── ประวัติการเปลี่ยนค่า (เสริม: ล้มได้ ไม่ทำให้ทั้งหน้าล้ม) ───
    if (auditResult.status === 'rejected' || !auditResult.value.ok) {
      problems.push('โหลดประวัติการเปลี่ยนค่าไม่สำเร็จ (ส่วนอื่นยังใช้ได้)');
      setAudit([]);
    } else {
      const auditBody = await auditResult.value.json().catch(() => null);
      if (auditBody?.success) setAudit(auditBody.data ?? []);
      else problems.push('โหลดประวัติการเปลี่ยนค่าไม่สำเร็จ (ส่วนอื่นยังใช้ได้)');
    }

    if (problems.length > 0) {
      setNotice(problems.join(' · '));
      setNoticeKind('error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setField = (key: string, value: string | boolean | null) => {
    setForm((current) => ({ ...current, [key]: value }));
    // เปลี่ยนโมเดล = ต้องทดสอบใหม่ก่อนบันทึก
    if (key === 'primaryModel' || key === 'fallbackModel') {
      setTestedModel(null);
      setTestResult(null);
    }
  };

  const primaryModel = String(form.primaryModel ?? '');
  const fallbackModel = typeof form.fallbackModel === 'string' ? form.fallbackModel : null;

  /** ปุ่มบันทึกปิดไว้ถ้าเปลี่ยนโมเดลหลักแต่ยังไม่ได้ทดสอบโมเดลนั้นในหน้านี้ */
  const modelChanged = Boolean(data && primaryModel !== data.config.primaryModel);
  const needsModelTest = modelChanged && testedModel !== primaryModel;
  const busy = saving || testBusy;

  /** ค่าที่อยู่นอกช่วง (หรือผิดความสัมพันธ์) → ปิดปุ่มบันทึก + บอกเหตุผล */
  const rangeProblems = useMemo(() => {
    const problems: string[] = [];
    const numeric: Partial<Record<AiTutorRangeKey, number>> = {};

    for (const field of NUMERIC_FIELDS) {
      const raw = form[field.key];
      if (raw === undefined || raw === null || raw === '') continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        problems.push(`${field.label} ต้องเป็นตัวเลข (ช่วง ${field.min}–${field.max})`);
        continue;
      }
      numeric[field.key] = value;
      if (!Number.isInteger(value)) {
        problems.push(`${field.label} ต้องเป็นจำนวนเต็ม (ช่วง ${field.min}–${field.max})`);
      } else if (value < field.min || value > field.max) {
        problems.push(`${field.label} ต้องอยู่ในช่วง ${field.min}–${field.max} (ตอนนี้คือ ${value})`);
      }
    }

    const crossField = checkCrossFieldRules(numeric);
    if (crossField) problems.push(crossField);

    return problems;
  }, [form]);

  const canSave = Boolean(data) && !busy && !needsModelTest && rangeProblems.length === 0;

  const primaryModelInfo = models.find((model) => model.id === primaryModel);
  const fallbackModelInfo = models.find((model) => model.id === fallbackModel);

  const filteredModels = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();
    const list = query
      ? models.filter((model) => model.id.toLowerCase().includes(query) || model.name.toLowerCase().includes(query))
      : models;
    return list.slice(0, 60);
  }, [models, modelQuery]);

  const filteredFallbackModels = useMemo(() => {
    const query = fallbackQuery.trim().toLowerCase();
    const list = query
      ? models.filter((model) => model.id.toLowerCase().includes(query) || model.name.toLowerCase().includes(query))
      : models;
    return list.slice(0, 60);
  }, [models, fallbackQuery]);

  const runTest = async (model: string) => {
    if (!model) {
      setNotice('เลือกโมเดลก่อนทดสอบ');
      setNoticeKind('error');
      return;
    }
    setTestBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/ai-tutor/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'ทดสอบโมเดลไม่สำเร็จ');
      setTestResult(body.data);
      setTestedModel(model);
      setNotice('ทดสอบโมเดลสำเร็จ');
      setNoticeKind('ok');
    } catch (error) {
      setTestedModel(null);
      setTestResult(null);
      setNotice(error instanceof Error ? error.message : 'ทดสอบโมเดลไม่สำเร็จ');
      setNoticeKind('error');
    } finally {
      setTestBusy(false);
    }
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setNotice('');
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(form)) {
        const original = (data.config as unknown as Record<string, unknown>)[key];
        const current = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
        if (JSON.stringify(current) !== JSON.stringify(original)) payload[key] = current;
      }
      if (resetKeys.length > 0) payload.reset = resetKeys;

      const parsed = aiTutorSaveRequestSchema.safeParse(payload);
      if (!parsed.success) {
        setNotice(parsed.error.issues[0]?.message ?? 'ค่าไม่ถูกต้อง');
        setNoticeKind('error');
        return;
      }

      const response = await fetch('/api/admin/ai-tutor/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'บันทึกไม่สำเร็จ');
      setNotice('บันทึกแล้ว — ค่าจะมีผลภายในราว 30 วินาที');
      setNoticeKind('ok');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ');
      setNoticeKind('error');
    } finally {
      setSaving(false);
    }
  };

  const sourceBadge = (key: string) => {
    const source = data?.sources?.[key];
    return source === 'db'
      ? <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">ตั้งในหน้านี้</span>
      : <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">ค่าจาก env</span>;
  };

  const resetField = (key: string) => {
    setResetKeys((current) => (current.includes(key) ? current : [...current, key]));
    // ค่าที่แสดง = ค่าจาก env
    const envValue = data?.envDefaults?.[key as keyof AdminConfigResponse['envDefaults']];
    setForm((current) => ({
      ...current,
      [key]: typeof envValue === 'boolean' ? envValue : envValue === null ? null : String(envValue),
    }));
    setNotice(`กำลังคืนค่า "${key}" เป็นค่าจาก env — กดบันทึกเพื่อยืนยัน`);
    setNoticeKind('ok');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-10 text-slate-500">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> กำลังโหลดการตั้งค่า…
      </div>
    );
  }

  if (!data) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {notice || 'โหลดการตั้งค่าไม่สำเร็จ'}
        <button type="button" onClick={() => void load()} className="btn-secondary mt-4 min-h-11">ลองใหม่</button>
      </div>
    );
  }

  const masterOff = !data.envStatus.masterEnabled;
  // ระบบจะใช้งานไม่ได้เลยถ้าไม่มี secret (ผู้เรียนกดถาม AI แล้วขึ้นว่าระบบยังไม่พร้อม)
  const proofSecretMissing = !data.envStatus.proofSecret;
  const openRouterKeyMissing = !data.envStatus.openrouterKey;

  return (
    <div className="space-y-6">
      {notice && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${noticeKind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          {notice}
        </p>
      )}
      {data.warnings.length > 0 && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mr-1 inline size-4 align-text-bottom" aria-hidden="true" />
          {data.warnings.join(' · ')}
        </p>
      )}
      {rangeProblems.length > 0 && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mr-1 inline size-4 align-text-bottom" aria-hidden="true" />
          <span className="font-bold">ค่าบางตัวอยู่นอกช่วงที่อนุญาต — ปุ่มบันทึกถูกปิดไว้</span>
          <ul className="mt-1 list-disc space-y-0.5 pl-6">
            {rangeProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </p>
      )}
      {(proofSecretMissing || openRouterKeyMissing) && (
        <div role="alert" className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 sm:p-5">
          <p className="flex items-start gap-2 text-base font-bold">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            AI Tutor ใช้งานไม่ได้ในตอนนี้
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {proofSecretMissing && (
              <li>
                ยังไม่ได้ตั้ง <code className="font-mono">AI_TUTOR_PROOF_SECRET</code> — ผู้เรียนจะกด
                &quot;ตรวจคำตอบ&quot; แล้วถาม AI ไม่ได้ (ข้อความจะบอกว่าระบบยังไม่พร้อมใช้งาน)
                <br />
                วิธีตั้ง: สร้างค่าสุ่มอย่างน้อย 32 ตัวอักษร เช่น{' '}
                <code className="font-mono">openssl rand -base64 32</code> แล้วใส่ใน env ของ
                Vercel (ต้อง restart/deploy ใหม่)
              </li>
            )}
            {openRouterKeyMissing && (
              <li>
                ยังไม่ได้ตั้ง <code className="font-mono">OPENROUTER_API_KEY</code> — โมเดลจะเรียกไม่ได้
              </li>
            )}
          </ul>
          <p className="mt-2 text-rose-700">
            ค่าพวกนี้ต้องตั้งใน env เท่านั้น (แก้ในหน้านี้ไม่ได้) และต้องไม่ใช่ระบบตั้งค่าแบบ
            NEXT_PUBLIC_* เพราะจะถูกฝังใน bundle ฝั่งผู้ใช้
          </p>
        </div>
      )}

      {/* ─── สถานะ ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">สถานะ</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="text-xs font-semibold text-slate-500">env AI_TUTOR_ENABLED</dt>
            <dd className={`mt-1 text-sm font-bold ${data.envStatus.masterEnabled ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.envStatus.masterEnabled ? 'เปิดอยู่' : 'ปิดอยู่'}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="text-xs font-semibold text-slate-500">OPENROUTER_API_KEY</dt>
            <dd className={`mt-1 text-sm font-bold ${data.envStatus.openrouterKey ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.envStatus.openrouterKey ? 'ตั้งแล้ว' : 'ยังไม่ได้ตั้ง'}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="text-xs font-semibold text-slate-500">AI_TUTOR_PROOF_SECRET</dt>
            <dd className={`mt-1 text-sm font-bold ${data.envStatus.proofSecret ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.envStatus.proofSecret ? 'ตั้งแล้ว' : 'ยังไม่ได้ตั้ง'}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="text-xs font-semibold text-slate-500">AI_TUTOR_EXPORT_SALT</dt>
            <dd className={`mt-1 text-sm font-bold ${data.envStatus.exportSalt ? 'text-emerald-700' : 'text-rose-600'}`}>
              {data.envStatus.exportSalt ? 'ตั้งแล้ว' : 'ยังไม่ได้ตั้ง'}
            </dd>
          </div>
        </dl>

        {masterOff && (
          <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            <AlertTriangle className="mr-1 inline size-4 align-text-bottom" aria-hidden="true" />
            env <code className="font-mono">AI_TUTOR_ENABLED</code> ปิดอยู่ — สวิตช์ชั่วคราวในหน้านี้จึงไม่มีผล
            (ระบบจะเปิดใช้งานเมื่อ env เปิดเท่านั้น และ DB เปิดทับ env ที่ปิดไม่ได้)
          </p>
        )}

        <label className="mt-5 flex min-h-11 items-center gap-3 text-base text-slate-700">
          <input
            type="checkbox"
            aria-label="สวิตช์เปิดใช้งาน AI Tutor"
            checked={Boolean(form.runtimeEnabled)}
            disabled={busy || masterOff}
            onChange={(event) => {
              if (!event.target.checked) {
                setConfirmDisable(true); // ต้องยืนยันก่อนปิด
                return;
              }
              setField('runtimeEnabled', true);
            }}
            className="h-5 w-5"
          />
          เปิดใช้งาน AI Tutor (สวิตช์ชั่วคราว)
          {sourceBadge('runtimeEnabled')}
        </label>
        {masterOff && (
          <p className="mt-1 text-sm text-slate-500">ปิดสวิตช์นี้ไม่ได้ขณะที่ env AI_TUTOR_ENABLED ปิดอยู่</p>
        )}
      </section>

      {/* ─── โมเดล ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">โมเดล</h2>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              โมเดลหลัก {sourceBadge('primaryModel')}
            </label>
            <input
              value={modelQuery}
              onChange={(event) => setModelQuery(event.target.value)}
              placeholder="ค้นหาโมเดล (id หรือชื่อ)"
              aria-label="ค้นหาโมเดลหลัก"
              className={inputClass}
            />
            <select
              aria-label="เลือกโมเดลหลัก"
              value={primaryModel}
              disabled={busy}
              onChange={(event) => setField('primaryModel', event.target.value)}
              className={inputClass}
            >
              {filteredModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id} · ${model.pricing.prompt}/1M · ${model.pricing.completion}/1M
                  {model.overPriceLimit ? ' · เกินเพดานราคา' : ''}
                </option>
              ))}
            </select>
            {primaryModelInfo && (
              <p className="mt-2 text-sm text-slate-500">
                {primaryModelInfo.reasoningMandatory
                  ? 'โมเดลนี้บังคับให้คิด (reasoning) ปิดไม่ได้ — ใช้ effort ต่ำแทน'
                  : 'โมเดลนี้ปิด reasoning ได้'}
                {primaryModelInfo.overPriceLimit && (
                  <span className="ml-2 font-semibold text-rose-600">ราคาเกินเพดาน (input ${data.limits.maxModelPriceInPerMtok} / output ${data.limits.maxModelPriceOutPerMtok})</span>
                )}
              </p>
            )}

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Reasoning effort ของโมเดลหลัก {sourceBadge('primaryEffort')}
            </label>
            <select
              aria-label="เลือก reasoning effort ของโมเดลหลัก"
              value={String(form.primaryEffort ?? '')}
              disabled={busy}
              onChange={(event) => setField('primaryEffort', event.target.value)}
              className={inputClass}
            >
              {(primaryModelInfo?.supportedEfforts?.length
                ? primaryModelInfo.supportedEfforts
                : ['low', 'medium', 'high']
              ).map((effort) => (
                <option key={effort} value={effort}>{effort}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              โมเดลสำรอง {sourceBadge('fallbackModel')}
            </label>
            <input
              value={fallbackQuery}
              onChange={(event) => setFallbackQuery(event.target.value)}
              placeholder="ค้นหาโมเดลสำรอง"
              aria-label="ค้นหาโมเดลสำรอง"
              className={inputClass}
            />
            <select
              aria-label="เลือกโมเดลสำรอง"
              value={fallbackModel ?? ''}
              disabled={busy}
              onChange={(event) => setField('fallbackModel', event.target.value === '' ? null : event.target.value)}
              className={inputClass}
            >
              <option value="">ไม่ใช้โมเดลสำรอง</option>
              {filteredFallbackModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id} · ${model.pricing.prompt}/1M · ${model.pricing.completion}/1M
                  {model.overPriceLimit ? ' · เกินเพดานราคา' : ''}
                </option>
              ))}
            </select>
            {fallbackModelInfo && (
              <p className="mt-2 text-sm text-slate-500">
                {fallbackModelInfo.reasoningMandatory
                  ? 'โมเดลนี้บังคับให้คิด — ปิด reasoning ไม่ได้'
                  : 'โมเดลนี้ปิด reasoning ได้'}
                {fallbackModelInfo.overPriceLimit && (
                  <span className="ml-2 font-semibold text-rose-600">ราคาเกินเพดาน</span>
                )}
              </p>
            )}

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Reasoning effort ของโมเดลสำรอง {sourceBadge('fallbackEffort')}
            </label>
            <select
              aria-label="เลือก reasoning effort ของโมเดลสำรอง"
              value={String(form.fallbackEffort ?? '')}
              disabled={busy}
              onChange={(event) => setField('fallbackEffort', event.target.value)}
              className={inputClass}
            >
              {(fallbackModelInfo?.supportedEfforts?.length
                ? fallbackModelInfo.supportedEfforts
                : ['none', 'low', 'medium', 'high']
              ).map((effort) => (
                <option key={effort} value={effort}>{effort}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label="ทดสอบเรียกโมเดลหลัก"
            disabled={busy}
            onClick={() => void runTest(primaryModel)}
            className="btn-secondary min-h-11 disabled:opacity-50"
          >
            {testBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
            ทดสอบเรียกโมเดลหลัก
          </button>
          {needsModelTest && (
            <p className="text-sm font-semibold text-amber-700">ต้องทดสอบโมเดลใหม่ให้ผ่านก่อนจึงจะบันทึกได้</p>
          )}
          {testedModel === primaryModel && !needsModelTest && (
            <p className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden="true" /> ทดสอบโมเดลนี้ผ่านแล้ว
            </p>
          )}
        </div>

        {testResult && (
          <div aria-live="polite" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">ผลทดสอบ: {testResult.model}</p>
            <p className="mt-1 text-slate-600">
              latency {testResult.latencyMs} ms · TTFT {testResult.ttftMs ?? '-'} ms · token เข้า {testResult.inputTokens ?? '-'} / ออก {testResult.outputTokens ?? '-'}
              · reasoning {testResult.reasoningTokens ?? '-'} · finish_reason {testResult.finishReason ?? '-'}
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-slate-800">{testResult.sample}</p>
          </div>
        )}
      </section>

      {/* ─── ค่าตัวเลข ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">ค่าตัวเลข</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {NUMERIC_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-semibold text-slate-700">
                {field.label} {sourceBadge(field.key)}
              </label>
              <input
                type="number"
                inputMode="numeric"
                aria-label={field.label}
                min={field.min}
                max={field.max}
                step={field.step}
                value={String(form[field.key] ?? '')}
                disabled={busy}
                onChange={(event) => setField(field.key, event.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {field.hint} · ช่วงที่อนุญาต {field.min}–{field.max}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => resetField(field.key)}
                className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw className="size-4" aria-hidden="true" /> คืนค่า env
              </button>
            </div>
          ))}

          <div>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                aria-label="เปิด prompt caching"
                checked={Boolean(form.promptCache)}
                disabled={busy}
                onChange={(event) => setField('promptCache', event.target.checked)}
                className="h-5 w-5"
              />
              เปิด prompt caching {sourceBadge('promptCache')}
            </label>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              ส่ง cache_control ให้ provider ที่รองรับ — ลดต้นทุนเมื่อถามต่อเนื่อง
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => resetField('promptCache')}
              className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="size-4" aria-hidden="true" /> คืนค่า env
            </button>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          ค่าที่บันทึกจะมีผลภายในราว <strong>30 วินาที</strong> (แคชฝั่ง server) · {data.limits.note}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label="บันทึกการตั้งค่า"
            onClick={() => void save()}
            disabled={!canSave}
            className="btn-primary min-h-11 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="btn-secondary min-h-11 disabled:opacity-50"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> โหลดค่าใหม่
          </button>
        </div>
      </section>

      {/* ─── ประวัติการเปลี่ยนแปลง ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">ประวัติการเปลี่ยนแปลงล่าสุด</h2>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">ยังไม่มีรายการ</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">เวลา</th>
                  <th className="py-2 pr-3">การกระทำ</th>
                  <th className="py-2 pr-3">คีย์</th>
                  <th className="py-2">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{new Date(row.createdAt).toLocaleString('th-TH')}</td>
                    <td className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-700">{row.action}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.target ?? '-'}</td>
                    <td className="py-2 text-slate-500">
                      <details>
                        <summary className="cursor-pointer text-primary-600">ดูก่อน/หลัง</summary>
                        <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-xs">
{JSON.stringify({ before: row.before, after: row.after }, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={confirmDisable}
        title="ปิดการใช้งาน AI Tutor?"
        description="ผู้เรียนทุกคนจะใช้โหมด AI ไม่ได้จนกว่าจะเปิดใหม่ (หรือกลับไปใช้ค่าจาก env) ค่าที่บันทึกไว้จะยังอยู่ครบ"
        confirmLabel="ปิดการใช้งาน"
        danger
        busy={saving}
        onCancel={() => setConfirmDisable(false)}
        onConfirm={() => {
          setConfirmDisable(false);
          setField('runtimeEnabled', false);
        }}
      />
    </div>
  );
}
