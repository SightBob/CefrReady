import { describe, expect, it } from 'vitest';
import { articlePath } from './article-paths';

describe('articlePath', () => {
  it('sends guide-section articles to /guide/[slug]', () => {
    expect(articlePath('how-to-prepare', 'guide')).toBe('/guide/how-to-prepare');
  });

  it('skips articles from sections that have no page', () => {
    expect(articlePath('present-simple', 'grammar')).toBeNull();
    expect(articlePath('present-simple', 'must-know')).toBeNull();
    expect(articlePath('present-simple', null)).toBeNull();
    expect(articlePath('present-simple', undefined)).toBeNull();
  });
});
