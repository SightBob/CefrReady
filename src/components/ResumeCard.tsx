'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlayCircle, Sparkle } from '@phosphor-icons/react';
import type { UnitData } from '@/lib/learning-path';

interface ProgressPayload {
  success?: boolean;
  data?: {
    completedNodeIds?: number[];
    lastVisitedNodeId?: number | null;
  };
}

/**
 * ResumeCard — "เรียนต่อจากเดิม" banner on /units.
 *
 * Shows the node the learner most recently visited (from the DB via
 * GET /api/units/progress). Guests/offline simply never see the card —
 * the page works exactly as before without it.
 */
export default function ResumeCard({ units }: { units: UnitData[] }) {
  const [resume, setResume] = useState<{
    unit: UnitData;
    nodeIndex: number;
    nodeTotal: number;
  } | null>(null);

  useEffect(() => {
    void fetch('/api/units/progress')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ProgressPayload | null) => {
        const lastId = payload?.data?.lastVisitedNodeId;
        if (!payload?.success || !lastId) return;

        for (const unit of units) {
          const nodeIndex = unit.nodes.findIndex((n) => n.id === lastId);
          if (nodeIndex >= 0) {
            setResume({ unit, nodeIndex, nodeTotal: unit.nodes.length });
            return;
          }
        }
      })
      .catch(() => {
        /* guests: no card */
      });
  }, [units]);

  if (!resume) return null;

  const { unit, nodeIndex, nodeTotal } = resume;
  const node = unit.nodes[nodeIndex];
  const palette = colorFor(unit);

  return (
    <Link
      href={`/units/${node.id}`}
      className="block mb-6 rounded-2xl border-2 p-4 sm:p-5 transition-all hover:-translate-y-0.5"
      style={{ borderColor: palette.base, background: palette.light }}
    >
      <p
        className="text-xs font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1.5"
        style={{ color: palette.dark }}
      >
        <Sparkle size={13} weight="fill" aria-hidden="true" />
        เรียนต่อจากเดิม
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold text-slate-800 truncate">{unit.title}</p>
          <p className="text-sm text-slate-600 truncate">
            {node.title} · {nodeIndex + 1}/{nodeTotal}
          </p>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-extrabold px-4 py-2.5 rounded-xl"
          style={{ background: palette.base, color: '#fff', boxShadow: `0 3px 0 ${palette.dark}` }}
        >
          <PlayCircle size={16} weight="fill" aria-hidden="true" />
          เรียนต่อ
        </span>
      </div>
    </Link>
  );
}

// Shared palette with UnitsPath — duplicated intentionally tiny to avoid a
// circular import between the two client components.
function colorFor(unit: UnitData) {
  const UNIT_PALETTE: Record<string, { base: string; dark: string; light: string }> = {
    green: { base: '#58CC02', dark: '#46A302', light: '#D7FFB8' },
    blue: { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' },
    purple: { base: '#CE82FF', dark: '#A568CC', light: '#F7EFFF' },
    orange: { base: '#FF9600', dark: '#E08600', light: '#FFF1DC' },
  };
  return UNIT_PALETTE[unit.colorKey] ?? UNIT_PALETTE.green;
}
