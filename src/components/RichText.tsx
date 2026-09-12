import React from 'react';

/**
 * Inline rich-text markup for lesson content:
 *   **text**  → bold (น้ำหนักตัวหนา)
 *   ==text==  → highlight (ไฮไลต์พื้นหลังสีเหลือง)
 *
 * Plain text stays plain — no HTML is parsed, so the content is always
 * safe to render from the database.
 */

const TOKEN_RE = /(\*\*[^*]+\*\*|==[^=]+==)/g;

function renderInline(text: string, highlightColor: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(TOKEN_RE).filter((p) => p !== '');
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
      return (
        <mark
          key={key}
          className="rounded px-1 font-extrabold text-slate-900"
          style={{ background: highlightColor }}
        >
          {part.slice(2, -2)}
        </mark>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

/**
 * Render lesson text with inline **bold** / ==highlight== markup.
 * Falls back to plain text when nothing matches.
 */
export default function RichText({
  text,
  highlightColor = '#FDE68A',
  className,
  as: Tag = 'p',
}: {
  text: string;
  highlightColor?: string;
  className?: string;
  as?: 'p' | 'span';
}) {
  const content = renderInline(text, highlightColor, text.slice(0, 12));
  if (Tag === 'span') return <span className={className}>{content}</span>;
  return <p className={className}>{content}</p>;
}
