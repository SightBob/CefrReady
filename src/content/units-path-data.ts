// ============================================================
// UnitsPath — mock data for the snake-style learning path UI.
// UI-first: swap this file with real DB-backed data later.
// ============================================================

export type UnitColorKey = 'green' | 'blue' | 'purple' | 'orange';

export type NodeKind = 'star' | 'chest' | 'trophy';

export type NodeStatus = 'locked' | 'completed' | 'active';

export interface PathNode {
  id: string;
  kind: NodeKind;
  status: NodeStatus;
  title: string;
}

export interface Unit {
  id: number;
  title: string;
  subtitle: string;
  colorKey: UnitColorKey;
  nodes: PathNode[];
}

// Duolingo-inspired palette (base + darker 3D shadow tone)
export const UNIT_COLORS: Record<
  UnitColorKey,
  { base: string; dark: string; light: string; bannerText: string; label: string }
> = {
  green: {
    base: '#58CC02',
    dark: '#46A302',
    light: '#D7FFB8',
    bannerText: '#ffffff',
    label: 'จากพื้นฐานถึงประโยคแรก',
  },
  blue: {
    base: '#1CB0F6',
    dark: '#1899D6',
    light: '#DDF4FF',
    bannerText: '#ffffff',
    label: 'คำศัพท์ในชีวิตประจำวัน',
  },
  purple: {
    base: '#CE82FF',
    dark: '#A568CC',
    light: '#F7EFFF',
    bannerText: '#ffffff',
    label: 'สื่อสารในสถานการณ์จริง',
  },
  orange: {
    base: '#FF9600',
    dark: '#E08600',
    light: '#FFF1DC',
    bannerText: '#ffffff',
    label: 'ยกระดับความเข้าใจ',
  },
};

const COLOR_CYCLE: UnitColorKey[] = ['green', 'blue', 'purple', 'orange'];

// Zigzag lane pattern: left → center → right (repeats)
const LANES = ['left', 'center', 'right'] as const;
export type Lane = (typeof LANES)[number];

export function laneFor(index: number): Lane {
  return LANES[index % LANES.length];
}

function makeNodes(
  unitId: number,
  topics: string[],
  completedCount: number,
  kinds: NodeKind[]
): PathNode[] {
  return topics.map((title, i) => ({
    id: `u${unitId}-n${i + 1}`,
    kind: kinds[i] ?? 'star',
    status:
      i < completedCount ? 'completed' : i === completedCount ? 'active' : 'locked',
    title,
  }));
}

export const UNITS: Unit[] = [
  {
    id: 1,
    title: 'Subject-Verb Agreement',
    subtitle: 'การใช้ประธานและกริยาที่สอดคล้องกัน',
    colorKey: 'green',
    nodes: makeNodes(
      1,
      [
        'Basic Rules',
        'Singular & Plural Subjects',
        'Compound Subjects',
        'Indefinite Pronouns',
        'Collective Nouns',
        'Special Cases',
        'Unit Review',
      ],
      2,
      ['star', 'star', 'chest', 'star', 'star', 'star', 'trophy']
    ),
  },
  {
    id: 2,
    title: 'Numbers & Time',
    subtitle: 'ตัวเลขและเวลา',
    colorKey: 'green',
    nodes: makeNodes(
      2,
      ['Counting 1–20', 'Telling Time', 'Days & Months', 'Unit Review'],
      4,
      ['star', 'star', 'chest', 'trophy']
    ),
  },
];

export function colorFor(unit: Unit) {
  return UNIT_COLORS[unit.colorKey] ?? UNIT_COLORS[COLOR_CYCLE[unit.id % COLOR_CYCLE.length]];
}
