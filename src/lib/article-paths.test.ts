import { describe, expect, it } from 'vitest';
import { articlePath } from './article-paths';

describe('articlePath', () => {
  it('sends guide-section articles to /guide/[slug]', () => {
    expect(articlePath('how-to-prepare', 'guide')).toBe('/guide/how-to-prepare');
  });

  it('sends every other section to /must-know/[slug]', () => {
    expect(articlePath('present-simple', 'grammar')).toBe('/must-know/present-simple');
    expect(articlePath('present-simple', null)).toBe('/must-know/present-simple');
    expect(articlePath('present-simple', undefined)).toBe('/must-know/present-simple');
  });
});
