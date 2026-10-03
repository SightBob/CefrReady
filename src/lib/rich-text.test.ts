import { describe, expect, it } from 'vitest';
import { parseInline } from './rich-text';

describe('parseInline', () => {
  it('keeps plain text and bold markers compatible', () => {
    expect(parseInline('hello **world**!')).toEqual([
      { type: 'text', value: 'hello ' },
      { type: 'bold', value: 'world' },
      { type: 'text', value: '!' },
    ]);
  });

  it('retains the old default ==highlight== syntax', () => {
    expect(parseInline('remember ==this==')).toEqual([
      { type: 'text', value: 'remember ' },
      { type: 'highlight', value: 'this' },
    ]);
  });

  it('supports named palette colors and nested bold markup', () => {
    expect(parseInline('==green;**important**==')).toEqual([
      { type: 'highlight', value: '**important**', background: '#BBF7D0', color: '#14532D' },
    ]);
  });

  it('supports custom hex background colors with readable foreground selection', () => {
    expect(parseInline('==#000000;white text==')).toEqual([
      { type: 'highlight', value: 'white text', background: '#000000', color: '#FFFFFF' },
    ]);
    expect(parseInline('==#ffffff;dark text==')).toEqual([
      { type: 'highlight', value: 'dark text', background: '#ffffff', color: '#555555' },
    ]);
  });

  it('supports text-only colors and transparent background markers', () => {
    expect(parseInline('==text:#2563eb;blue text==')).toEqual([
      { type: 'highlight', value: 'blue text', background: 'transparent', color: '#2563eb', colorOnly: true },
    ]);
    expect(parseInline('==transparent;no fill==')).toEqual([
      { type: 'highlight', value: 'no fill', background: 'transparent', color: 'inherit', colorOnly: true },
    ]);
  });

  it('falls back safely when the color directive is invalid', () => {
    expect(parseInline('==not-a-color;keep this==')).toEqual([
      { type: 'highlight', value: 'not-a-color;keep this' },
    ]);
  });
});
