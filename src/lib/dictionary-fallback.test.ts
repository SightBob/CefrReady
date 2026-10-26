import { describe, expect, it } from 'vitest';

import { mapWiktionaryEntries, stripHtml } from './dictionary-fallback';

describe('stripHtml', () => {
  it('ตัดแท็กและยุบช่องว่างซ้ำ — ไม่เหลือช่องว่างหน้าจุด/ลูกน้ำ', () => {
    expect(stripHtml('<span class="x">A</span>\n <a href="/wiki/bread">bread</a>.')).toBe('A bread.');
    expect(stripHtml('A cat -sized wallaby , Setonix brachyurus .')).toBe('A cat -sized wallaby, Setonix brachyurus.');
  });

  it('แปลง entity ที่ Wiktionary ใช้บ่อย', () => {
    expect(stripHtml('rock &amp; roll &quot;hit&quot;')).toBe('rock & roll "hit"');
    expect(stripHtml('&#39;tis &#x2014; ok')).toBe("'tis — ok");
  });

  it('entity ที่ไม่รู้จักคงไว้ ไม่ทำให้พัง', () => {
    expect(stripHtml('&unknown; word')).toBe('&unknown; word');
  });
});

describe('mapWiktionaryEntries', () => {
  it('แปลง payload จริงของ Wiktionary ตามที่ API ส่งมา', () => {
    const payload = {
      en: [
        {
          partOfSpeech: 'Noun',
          language: 'English',
          definitions: [
            {
              definition: '<ol><li class="senseid"> A <a href="/wiki/foodstuff">foodstuff</a> made by baking dough.</li></ol>',
              parsedExamples: [{ example: 'We made sandwiches with the <b>bread</b>.' }],
            },
            { definition: 'Money.', examples: ['He needs the <i>bread</i>.'] },
            { definition: 'Third definition (must be dropped).' },
          ],
        },
        { partOfSpeech: 'Verb', definitions: [{ definition: 'To coat with breadcrumbs.' }] },
        { partOfSpeech: 'Extra group beyond the two kept.' , definitions: [{ definition: 'x' }] },
      ],
    };

    const meanings = mapWiktionaryEntries(payload);
    expect(meanings).toHaveLength(2);
    expect(meanings[0].partOfSpeech).toBe('Noun');
    expect(meanings[0].definitions).toHaveLength(2);
    expect(meanings[0].definitions[0].definition).toContain('foodstuff made by baking dough');
    expect(meanings[0].definitions[0].definition).not.toContain('<');
    expect(meanings[0].definitions[0].example).toBe('We made sandwiches with the bread.');
    expect(meanings[0].definitions[1].example).toBe('He needs the bread.');
    expect(meanings[1].partOfSpeech).toBe('Verb');
  });

  it('payload ว่าง/ผิดรูป → ไม่มีผลลัพธ์ ไม่ throw', () => {
    expect(mapWiktionaryEntries(null)).toEqual([]);
    expect(mapWiktionaryEntries({})).toEqual([]);
    expect(mapWiktionaryEntries({ en: 'nope' })).toEqual([]);
    expect(mapWiktionaryEntries({ en: [{ definitions: [] }] })).toEqual([]);
    expect(mapWiktionaryEntries({ en: [{ definitions: [{}, { definition: 42 }] }] })).toEqual([]);
  });
});
