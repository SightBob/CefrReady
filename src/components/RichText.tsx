import React from 'react';
import { parseInline } from '@/lib/rich-text';

export { HIGHLIGHT_PALETTE, type HighlightColorName } from '@/lib/rich-text';

/**
 * Inline rich-text markup for lesson content:
 *   **text**  → bold (น้ำหนักตัวหนา)
 *   ==text==  → highlight (ไฮไลต์พื้นหลังสีเหลือง)
 *   ==green;text== / ==#16a34a;text== → named or custom-color highlight
 *   ==text:#2563eb;text== → custom text color without a background
 *
 * Plain text stays plain — no HTML is parsed, so the content is always
 * safe to render from the database.
 */

function renderInline(text: string, defaultBackground: string, defaultTextColor: string | undefined, keyPrefix: string): React.ReactNode[] {
  return parseInline(text).map((token, i) => {
    const key = `${keyPrefix}-${i}`;
    if (token.type === 'bold') {
      return <strong key={key} className="font-extrabold">{token.value}</strong>;
    }
    if (token.type === 'highlight') {
      const background = token.background ?? defaultBackground;
      const color = token.color ?? defaultTextColor ?? 'inherit';
      const hasBackground = background !== 'transparent';
      return (
        <mark
          key={key}
          className={hasBackground ? 'inline-flex items-center rounded-md px-1.5 align-middle' : 'inline align-middle'}
          style={{
            background,
            color,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {renderInline(token.value, defaultBackground, defaultTextColor, key)}
        </mark>
      );
    }
    return <React.Fragment key={key}>{token.value}</React.Fragment>;
  });
}

/**
 * Render lesson text with inline **bold** / ==highlight== markup.
 * Falls back to plain text when nothing matches.
 */
export default function RichText({
  text,
  highlightColor = '#FDE68A',
  highlightTextColor,
  highlightBackground = highlightColor,
  className,
  as: Tag = 'p',
}: {
  text: string;
  highlightColor?: string;
  /** Text color inside ==highlight== (e.g. #B39B3F for key points); default keeps slate-900. */
  highlightTextColor?: string;
  /** Background behind ==highlight==; set to transparent for color-only markup. */
  highlightBackground?: string;
  className?: string;
  as?: 'p' | 'span';
}) {
  const content = renderInline(text, highlightBackground, highlightTextColor, text.slice(0, 12));
  if (Tag === 'span') return <span className={className}>{content}</span>;
  return <p className={className}>{content}</p>;
}
