'use client';

import React, { useEffect } from 'react';
import { Sparkle, X } from '@phosphor-icons/react';
import type { VocabBankData } from '@/content/units-path-lessons';

export default function VocabBankModal({
  bank,
  accent,
  onClose,
}: {
  bank: VocabBankData;
  accent: { base: string; light: string };
  onClose: () => void;
}) {
  // Close on Escape + lock body scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="คลังศัพท์ช่วยชีวิต"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 p-5 border-b border-slate-100"
          style={{ background: accent.light, borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: accent.base }}
          >
            <Sparkle size={20} weight="fill" color="#ffffff" aria-hidden="true" />
          </span>
          <h2 className="flex-1 text-lg font-extrabold text-slate-800">
            คลังศัพท์ช่วยชีวิต
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors"
            aria-label="ปิด"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Body — dynamic-column table */}
        <div className="overflow-x-auto overflow-y-auto p-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {bank.columns.map((col, ci) => (
                  <th
                    key={ci}
                    className={`text-left font-extrabold px-3 py-2.5 text-white text-xs uppercase tracking-wider ${
                      ci === 0 ? 'rounded-l-xl' : ''
                    } ${ci === bank.columns.length - 1 ? 'rounded-r-xl' : ''}`}
                    style={{ background: accent.base }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bank.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-3 align-top ${
                        ci === 0
                          ? 'font-bold text-slate-700 rounded-l-xl'
                          : ci === row.length - 1
                            ? 'text-slate-600 rounded-r-xl'
                            : ci === 1
                              ? 'font-semibold'
                              : 'text-slate-600'
                      }`}
                      style={ci === 1 ? { color: accent.base } : undefined}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 text-xs text-slate-400 font-medium text-center">
            ใช้ตารางนี้เป็นแนวทางเมื่อเจอประธานประเภทต่างๆ ✨
          </p>
        </div>
      </div>
    </div>
  );
}
