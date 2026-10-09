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

/** ปรับรูปทรงชิป ==highlight== เฉพาะจุดที่ระบุ (ไม่ระบุ = ใช้ค่าเริ่มต้นของทั้งโปรเจกต์) */
type HighlightChipShape = { radius?: number; paddingX?: number };

function renderInline(text: string, defaultBackground: string, defaultTextColor: string | undefined, keyPrefix: string, chip?: HighlightChipShape): React.ReactNode[] {
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
            borderRadius: hasBackground ? chip?.radius : undefined,
            paddingInline: hasBackground && chip?.paddingX != null ? `${chip.paddingX}px` : undefined,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {renderInline(token.value, defaultBackground, defaultTextColor, key, chip)}
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
  highlightRadius,
  highlightPaddingX,
  className,
  as: Tag = 'p',
}: {
  text: string;
  highlightColor?: string;
  /** Text color inside ==highlight== (e.g. #B39B3F for key points); default keeps slate-900. */
  highlightTextColor?: string;
  /** Background behind ==highlight==; set to transparent for color-only markup. */
  highlightBackground?: string;
  /** Corner radius (px) of the ==highlight== chip — omit to keep the project-wide default. */
  highlightRadius?: number;
  /** Left/right padding (px) inside the ==highlight== chip — omit to keep the project-wide default. */
  highlightPaddingX?: number;
  className?: string;
  as?: 'p' | 'span';
}) {
  const chip = highlightRadius != null || highlightPaddingX != null
    ? { radius: highlightRadius, paddingX: highlightPaddingX }
    : undefined;
  const content = renderInline(text, highlightBackground, highlightTextColor, text.slice(0, 12), chip);
  if (Tag === 'span') return <span className={className}>{content}</span>;
  return <p className={className}>{content}</p>;
}
