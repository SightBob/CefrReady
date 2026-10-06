import { describe, expect, it } from 'vitest';
import { parseVerbCsv, verbEntriesToCsv, VERB_CSV_HEADERS } from './verb-bank-io';

describe('verbEntriesToCsv', () => {
  it('starts with the header row and one line per entry', () => {
    const csv = verbEntriesToCsv([
      { v1: 'go', v2: 'went', v3: 'gone' },
      { v1: 'eat', v2: 'ate', v3: 'eaten' },
    ]);
    expect(csv.split('\r\n')).toEqual([
      'v1,v2,v3',
      'go,went,gone',
      'eat,ate,eaten',
    ]);
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = verbEntriesToCsv([{ v1: 'a,b', v2: 'say "hi"', v3: 'line\nbreak' }]);
    expect(csv.split('\r\n')[1]).toBe('"a,b","say ""hi""","line\nbreak"');
  });

  it('exposes the canonical headers', () => {
    expect([...VERB_CSV_HEADERS]).toEqual(['v1', 'v2', 'v3']);
  });
});

describe('parseVerbCsv', () => {
  it('round-trips output from verbEntriesToCsv (with or without BOM)', () => {
    const original = [
      { v1: 'go', v2: 'went', v3: 'gone' },
      { v1: 'a,b', v2: 'say "hi"', v3: 'multi\nline' },
    ];
    for (const text of [verbEntriesToCsv(original), '\uFEFF' + verbEntriesToCsv(original)]) {
      const parsed = parseVerbCsv(text);
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows.map(({ line: _line, ...rest }) => rest)).toEqual(original);
    }
  });

  it('skips the header row and blank lines, and reports line numbers', () => {
    const parsed = parseVerbCsv('v1,v2,v3\r\n\r\ngo,went,gone\r\n\r\neat,ate,eaten\r\n');
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([
      { line: 3, v1: 'go', v2: 'went', v3: 'gone' },
      { line: 5, v1: 'eat', v2: 'ate', v3: 'eaten' },
    ]);
  });

  it('reports rows with the wrong column count', () => {
    const parsed = parseVerbCsv('go,went\nbe,was,been,extra');
    expect(parsed.rows).toEqual([]);
    expect(parsed.errors).toEqual([
      { line: 1, message: 'ต้องมี 3 คอลัมน์ (v1, v2, v3) แต่ได้ 2' },
      { line: 2, message: 'ต้องมี 3 คอลัมน์ (v1, v2, v3) แต่ได้ 4' },
    ]);
  });

  it('keeps quoted fields containing commas across lines', () => {
    const parsed = parseVerbCsv('"x,y",went,gone\nbe,was,been');
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toEqual({ line: 1, v1: 'x,y', v2: 'went', v3: 'gone' });
    expect(parsed.rows[1].line).toBe(2);
  });

  it('returns nothing for an empty file', () => {
    const parsed = parseVerbCsv('');
    expect(parsed.rows).toEqual([]);
    expect(parsed.errors).toEqual([]);
  });
});
