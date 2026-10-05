import { describe, it, expect } from 'vitest';
import {
  MAX_VERB_FORM_LENGTH,
  normalizeVerbForm,
  validateVerbEntry,
  firstVerbError,
  filterVerbEntries,
} from './verb-bank';

describe('normalizeVerbForm', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizeVerbForm('  went \n')).toBe('went');
  });

  it('returns null for empty or whitespace-only values', () => {
    expect(normalizeVerbForm('')).toBeNull();
    expect(normalizeVerbForm('   ')).toBeNull();
    expect(normalizeVerbForm('\t\n')).toBeNull();
  });

  it('returns null for non-string values', () => {
    expect(normalizeVerbForm(undefined)).toBeNull();
    expect(normalizeVerbForm(null)).toBeNull();
    expect(normalizeVerbForm(42)).toBeNull();
    expect(normalizeVerbForm({ v1: 'go' })).toBeNull();
    expect(normalizeVerbForm(['go'])).toBeNull();
  });

  it('rejects values longer than the max length after trimming', () => {
    expect(normalizeVerbForm('a'.repeat(MAX_VERB_FORM_LENGTH))).toHaveLength(MAX_VERB_FORM_LENGTH);
    expect(normalizeVerbForm('a'.repeat(MAX_VERB_FORM_LENGTH + 1))).toBeNull();
    // ช่องว่างหัวท้ายไม่นับเป็นความยาว
    expect(normalizeVerbForm(`  ${'a'.repeat(MAX_VERB_FORM_LENGTH)}  `)).toHaveLength(MAX_VERB_FORM_LENGTH);
  });
});

describe('validateVerbEntry', () => {
  it('accepts a complete entry and trims every form', () => {
    const result = validateVerbEntry({ v1: ' go ', v2: 'went', v3: ' gone' });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ v1: 'go', v2: 'went', v3: 'gone' });
  });

  it('reports every empty field at once', () => {
    const result = validateVerbEntry({ v1: '', v2: '   ', v3: undefined });
    expect(result.values).toBeNull();
    expect(result.errors).toEqual({
      v1: 'กรุณากรอกข้อมูล',
      v2: 'กรุณากรอกข้อมูล',
      v3: 'กรุณากรอกข้อมูล',
    });
  });

  it('distinguishes over-length input from missing input', () => {
    const result = validateVerbEntry({
      v1: 'a'.repeat(MAX_VERB_FORM_LENGTH + 1),
      v2: 'ate',
      v3: 7,
    });
    expect(result.values).toBeNull();
    expect(result.errors).toEqual({
      v1: `ยาวเกิน ${MAX_VERB_FORM_LENGTH} ตัวอักษร`,
      v3: 'กรุณากรอกข้อมูล',
    });
  });
});

describe('firstVerbError', () => {
  it('returns the first error in v1 → v2 → v3 order', () => {
    expect(
      firstVerbError({
        v2: 'ยาวเกิน 100 ตัวอักษร',
        v3: 'กรุณากรอกข้อมูล',
        v1: 'กรุณากรอกข้อมูล',
      }),
    ).toBe('กรุณากรอกข้อมูล');
    expect(
      firstVerbError({ v2: 'กรุณากรอกข้อมูล', v3: 'กรุณากรอกข้อมูล' }),
    ).toBe('กรุณากรอกข้อมูล');
  });

  it('returns null when there is no error', () => {
    expect(firstVerbError({})).toBeNull();
  });
});

describe('filterVerbEntries', () => {
  const entries = [
    { id: 1, v1: 'go', v2: 'went', v3: 'gone' },
    { id: 2, v1: 'eat', v2: 'ate', v3: 'eaten' },
    { id: 3, v1: 'see', v2: 'saw', v3: 'seen' },
  ];

  it('returns everything when the query is blank', () => {
    expect(filterVerbEntries(entries, '')).toEqual(entries);
    expect(filterVerbEntries(entries, '   ')).toEqual(entries);
    expect(filterVerbEntries(entries, '', 'v1')).toEqual(entries);
  });

  it('searches all three forms when no column chip is active', () => {
    expect(filterVerbEntries(entries, 'go').map(e => e.id)).toEqual([1]);
    expect(filterVerbEntries(entries, 'saw').map(e => e.id)).toEqual([3]);
    expect(filterVerbEntries(entries, 'EAT').map(e => e.id)).toEqual([2]);
  });

  it('restricts the search to the selected column', () => {
    // 'saw' อยู่เฉพาะ v2 ของรายการที่ 3
    expect(filterVerbEntries(entries, 'saw', null).map(e => e.id)).toEqual([3]);
    expect(filterVerbEntries(entries, 'saw', 'v2').map(e => e.id)).toEqual([3]);
    expect(filterVerbEntries(entries, 'saw', 'v1')).toEqual([]);
    expect(filterVerbEntries(entries, 'saw', 'v3')).toEqual([]);
  });

  it('ignores surrounding whitespace and is case-insensitive', () => {
    expect(filterVerbEntries(entries, '  GoNe  ').map(e => e.id)).toEqual([1]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterVerbEntries(entries, 'zzz')).toEqual([]);
    expect(filterVerbEntries([], 'go')).toEqual([]);
  });
});
