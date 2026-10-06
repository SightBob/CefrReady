import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import HomeHelp from './HomeHelp';
import HomeDrillOptions from './HomeDrillOptions';

describe('homepage drill client island', () => {
  it('keeps the complete original section visible and the drill buttons intact', () => {
    const html = renderToStaticMarkup(<HomeHelp />);
    expect(html).toContain('จะช่วยให้เพื่อนๆสอบผ่านได้อย่างไร?');
    expect(html).toContain('Present Perfect: Has/Have + V.3');
    expect(html).toContain('max-[390px]:contents');
    expect(html).toContain(renderToStaticMarkup(<HomeDrillOptions />));
    expect(html.match(/<button/g)).toHaveLength(3);
  });
  it('keeps only interactive options in the client boundary', () => {
    expect(readFileSync('src/components/HomeHelp.tsx', 'utf8')).not.toContain("'use client'");
    expect(readFileSync('src/components/HomeDrillOptions.tsx', 'utf8')).toContain("'use client'");
  });
});
