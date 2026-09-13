'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  TreasureChest,
  Trophy,
  BookOpen,
  CaretDown,
  Check,
} from '@phosphor-icons/react';
import {
  laneFor,
  type Lane,
} from '@/content/units-path-data';
import type { UnitData, PathNodeData } from '@/lib/learning-path';

// Re-export for page-level use
export type { UnitData, PathNodeData };

// Duolingo-style palette — mirrors UNIT_COLORS in units-path-data.ts
const UNIT_PALETTE: Record<
  string,
  { base: string; dark: string; light: string }
> = {
  green: { base: '#58CC02', dark: '#46A302', light: '#D7FFB8' },
  blue: { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' },
  purple: { base: '#CE82FF', dark: '#A568CC', light: '#F7EFFF' },
  orange: { base: '#FF9600', dark: '#E08600', light: '#FFF1DC' },
};

function colorFor(unit: UnitData) {
  return UNIT_PALETTE[unit.colorKey] ?? UNIT_PALETTE.green;
}

// ============================================================
// Layout constants — the zigzag "snake" geometry
// ============================================================

const NODE_SIZE = 68; // px, diameter of a level node
const LANE_OFFSET = 88; // px from container center to left/right lanes

const LANE_POSITION: Record<Lane, string> = {
  left: 'left-1/2 -translate-x-[calc(50%+88px)]',
  center: 'left-1/2 -translate-x-1/2',
  right: 'left-1/2 translate-x-[calc(-50%+88px)]',
};

// ============================================================
// Connector — dotted SVG line between consecutive nodes
// ============================================================

const Connector = React.memo(function Connector({
  from,
  to,
  color,
}: {
  from: Lane;
  to: Lane;
  color: string;
}) {
  const cx = 240; // half of the 480px SVG canvas
  const xOf = (lane: Lane) =>
    lane === 'left' ? cx - LANE_OFFSET : lane === 'right' ? cx + LANE_OFFSET : cx;
  const y1 = 0;
  const y2 = NODE_SIZE + 24; // row height matches the row below
  const x1 = xOf(from);
  const x2 = xOf(to);

  // Slight S-curve when changing lanes, straight when staying
  const d =
    from === to
      ? `M ${x1} ${y1} L ${x2} ${y2}`
      : `M ${x1} ${y1} C ${x1} ${y1 + 24}, ${x2} ${y2 - 24}, ${x2} ${y2}`;

  return (
    <svg
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      width={480}
      height={y2}
      style={{ top: NODE_SIZE / 2 }}
      aria-hidden="true"
    >
      <path
        d={d}
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="0.1 14"
        fill="none"
        opacity={0.55}
      />
    </svg>
  );
});

// ============================================================
// LevelNode — the round 3D Duolingo-style button
// ============================================================

const LOCKED = '#E5E5E5';
const LOCKED_DARK = '#B7B7B7';

const LevelNode = React.memo(function LevelNode({
  node,
  color,
}: {
  node: { id: number; title: string; kind: PathNodeData['kind']; status: 'locked' | 'completed' | 'active' };
  color: { base: string; dark: string };
}) {
  const router = useRouter();
  // Open access: "locked" styling is just the neutral look — every node
  // navigates to its lesson regardless of status.
  const isLocked = node.status === 'locked';
  const isActive = node.status === 'active';
  const hasContent = node.title !== undefined; // node exists → lesson exists
  const [pressed, setPressed] = useState(false);

  const base = isLocked ? LOCKED : color.base;
  const dark = isLocked ? LOCKED_DARK : color.dark;

  const Icon =
    node.kind === 'chest' ? TreasureChest : node.kind === 'trophy' ? Trophy : Star;

  const handleClick = () => {
    if (!hasContent) return;
    router.push(`/units/${node.id}`);
  };

  return (
    <div className="relative">
      {/* Tooltip bubble "เริ่มเลย" above the active node — like the screenshot */}
      {isActive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-11 z-10 whitespace-nowrap"
          style={{ animation: 'fadeIn 0.4s ease-out both' }}
        >
          <div className="relative bg-white border-2 border-slate-200 rounded-2xl px-4 py-1.5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
            <span className="text-sm font-bold" style={{ color: color.base }}>
              เริ่มเลย
            </span>
            {/* bubble tail */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-3 h-3 bg-white border-b-2 border-r-2 border-slate-200 rotate-45" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        aria-label={`เรียนบทเรียน ${node.title}`}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        className={`relative rounded-full outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 select-none cursor-pointer`}
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          background: base,
          boxShadow: pressed
            ? `0 0 0 ${dark}`
            : `0 6px 0 ${dark}, 0 8px 12px rgba(0,0,0,0.12)`,
          transform: pressed ? 'translateY(6px)' : 'translateY(0)',
          transition: 'transform 80ms ease, box-shadow 80ms ease',
        }}
      >
        {/* inner face — subtle highlight like Duolingo's raised buttons */}
        <span
          className="absolute inset-[6px] rounded-full flex items-center justify-center"
          style={{
            background: isLocked ? 'transparent' : 'rgba(255,255,255,0.14)',
            boxShadow: isLocked ? 'none' : 'inset 0 2px 4px rgba(255,255,255,0.25)',
          }}
        >
          <Icon
            size={30}
            weight="fill"
            color={isLocked ? '#AFAFAF' : '#ffffff'}
            aria-hidden="true"
          />
        </span>

        {/* completed checkmark badge */}
        {node.status === 'completed' && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm">
            <Check size={12} weight="bold" color="#58CC02" />
          </span>
        )}

        {/* pulse ring for the active node */}
        {isActive && (
          <span
            className="absolute -inset-2 rounded-full pointer-events-none"
            style={{
              border: `4px solid ${base}`,
              opacity: 0.35,
              animation: 'unitsPathPulse 1.8s ease-out infinite',
            }}
            aria-hidden="true"
          />
        )}
      </button>

      <span className="sr-only">{node.title}</span>
    </div>
  );
});

// ============================================================
// UnitBanner — colored header bar per unit ("ยูนิต 1 · Greetings")
// ============================================================

function UnitBanner({
  unit,
  unitNumber,
  onToggle,
  expanded,
}: {
  unit: UnitData;
  unitNumber: number;
  onToggle: () => void;
  expanded: boolean;
}) {
  const colors = colorFor(unit);
  return (
    <div
      className="sticky top-24 z-20 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-[0_4px_0_rgba(0,0,0,0.12)]"
      style={{ background: colors.base }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.22)' }}
      >
        <BookOpen size={22} weight="fill" color="#ffffff" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold tracking-wider uppercase"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          ยูนิต {unitNumber}
        </p>
        <h2 className="text-lg font-extrabold text-white truncate" title={unit.title}>
          {unit.title}
        </h2>
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {unit.subtitle}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`คู่มือยูนิต ${unitNumber} ${unit.title}`}
        className="shrink-0 bg-white text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-white/90 active:translate-y-[2px] transition-all"
        style={{ boxShadow: '0 3px 0 rgba(0,0,0,0.15)', color: colors.dark }}
      >
        <BookOpen size={16} weight="fill" aria-hidden="true" />
        คู่มือยูนิต
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

// ============================================================
// UnitsPath — full component
// ============================================================

interface UnitsPathProps {
  /** Ordered units from the DB (src/lib/learning-path.ts) */
  units: UnitData[];
}

export default function UnitsPath({ units }: UnitsPathProps) {
  const [openGuides, setOpenGuides] = useState<Record<number, boolean>>({});
  const [completedNodes, setCompletedNodes] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const readProgress = () => {
      const next: Record<number, boolean> = {};
      for (const node of units.flatMap((u) => u.nodes)) {
        next[node.id] = window.localStorage.getItem(`units-completed-${node.id}`) === '1';
      }
      setCompletedNodes(next);
    };
    readProgress();
    window.addEventListener('units-progress-changed', readProgress);
    window.addEventListener('storage', readProgress);
    return () => {
      window.removeEventListener('units-progress-changed', readProgress);
      window.removeEventListener('storage', readProgress);
    };
  }, [units]);

  // Progress model (open access): every node is clickable — no locking.
  // The FIRST node keeps the "เริ่มเลย" pulse as a suggested starting point,
  // but all lessons can be opened in any order.
  const allNodes = units.flatMap((u) => u.nodes);
  const currentNodeId = allNodes[0]?.id ?? null;

  const statusOf = (node: PathNodeData): 'completed' | 'active' | 'locked' =>
    completedNodes[node.id] ? 'completed' : node.id === currentNodeId ? 'active' : 'locked';

  const toggleGuide = (id: number) =>
    setOpenGuides((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col items-center gap-10">
      {units.map((unit, unitIdx) => {
        const colors = colorFor(unit);
        return (
          <section
            key={unit.id}
            className="w-full max-w-[560px] stagger-animate"
            style={{ animationDelay: `${Math.min(unitIdx * 60, 400)}ms` }}
            aria-label={`ยูนิต ${unitIdx + 1}: ${unit.title}`}
          >
            <UnitBanner
              unit={unit}
              unitNumber={unitIdx + 1}
              expanded={Boolean(openGuides[unit.id])}
              onToggle={() => toggleGuide(unit.id)}
            />

            <div className="mx-1 mt-3 mb-[-1.5rem]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                <span>ความคืบหน้า</span>
                <span>{unit.nodes.filter((n) => completedNodes[n.id]).length}/{unit.nodes.length} บท</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden" aria-label={`ความคืบหน้าของยูนิต ${unitIdx + 1}`}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: unit.nodes.length ? `${(unit.nodes.filter((n) => completedNodes[n.id]).length / unit.nodes.length) * 100}%` : '0%', background: colors.base }}
                />
              </div>
            </div>

            {/* Guide popover (UI-only) */}
            {openGuides[unit.id] && (
              <div
                className="mx-3 mt-3 rounded-2xl border-2 p-4 stagger-animate"
                style={{ borderColor: colors.light, background: colors.light }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: colors.dark }}
                >
                  สิ่งที่จะได้เรียน
                </p>
                <ul className="space-y-1.5">
                  {unit.nodes.map((n) => {
                    const clickable = n.pages.length > 0;
                    return (
                      <li key={n.id}>
                        {clickable ? (
                          <Link
                            href={`/units/${n.id}`}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: colors.base }}
                            />
                            {n.title}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: '#cbd5e1' }}
                            />
                            {n.title}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Node path */}
            <div className="relative mt-14 flex flex-col items-center gap-6">
              {unit.nodes.map((node, i) => {
                const lane = laneFor(i);
                const hasNext = i < unit.nodes.length - 1;
                return (
                  <div key={node.id} className="relative w-full h-[92px]">
                    {hasNext && (
                      <Connector from={lane} to={laneFor(i + 1)} color={colors.base} />
                    )}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 ${LANE_POSITION[lane]}`}
                    >
                      <LevelNode
                        node={
                          {
                            id: node.id,
                            title: node.title,
                            kind: node.kind,
                            status: statusOf(node),
                          }
                        }
                        color={colors}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Footer divider — path ends here, like the screenshot */}
      <div
        className="w-full max-w-[560px] flex items-center gap-4 stagger-animate"
        style={{ animationDelay: '450ms' }}
      >
        <span className="flex-1 h-px bg-slate-200" />
        <span className="text-slate-400 text-sm font-bold whitespace-nowrap">
          จุดเริ่มต้นของคุณ
        </span>
        <span className="flex-1 h-px bg-slate-200" />
      </div>
    </div>
  );
}
