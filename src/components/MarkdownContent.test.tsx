import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownContent } from './MarkdownContent';
describe('MarkdownContent SSR', () => {
  it('does not invoke browser DOMPurify during server rendering', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={'## Present Simple\n\nShe **goes** to school.'} />);
    expect(html).toBe('<div class="text-[16px] leading-[1.8] text-stone-800 max-w-none"></div>');
  });
  it('never inserts unsanitised content on the server', () => {
    expect(renderToStaticMarkup(<MarkdownContent content={'<img src=x onerror=alert(1)><script>alert(1)</script>'} />)).not.toContain('alert');
  });
});
