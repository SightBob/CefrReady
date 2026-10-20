'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * กล่องยืนยัน (ใช้ก่อนปิดสวิตช์/ถอนสิทธิ์) — โทนเตือน ไม่ใช่ error
 */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onCancel} aria-label="ปิด" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary min-h-11 disabled:opacity-50">{cancelLabel}</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${danger ? 'btn-danger' : 'btn-primary'} min-h-11 disabled:opacity-50`}
          >
            {busy ? 'กำลังดำเนินการ…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
