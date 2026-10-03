export interface InlineTextToken {
  type: 'text' | 'bold' | 'highlight';
  value: string;
  background?: string;
  color?: string;
  colorOnly?: boolean;
}

export const HIGHLIGHT_PALETTE = {
  yellow: { background: '#FEF08A', color: '#422006' },
  green: { background: '#BBF7D0', color: '#14532D' },
  red: { background: '#FECACA', color: '#7F1D1D' },
  blue: { background: '#BFDBFE', color: '#1E3A8A' },
  purple: { background: '#DDD6FE', color: '#4C1D95' },
  orange: { background: '#FED7AA', color: '#7C2D12' },
  pink: { background: '#FBCFE8', color: '#831843' },
  cyan: { background: '#A5F3FC', color: '#164E63' },
  gray: { background: '#E5E7EB', color: '#1F2937' },
  white: { background: '#FFFFFF', color: '#111827' },
} as const;

export type HighlightColorName = keyof typeof HIGHLIGHT_PALETTE;

const MARKUP_RE = /\*\*[^*]+\*\*|==[^=]+==/g;
const HEX_COLOR_RE = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

export function readableTextColor(background: string): string {
  const hex = background.replace('#', '');
  const normalized = hex.length <= 4
    ? [...hex].map((character) => character + character).join('').slice(0, 6)
    : hex.slice(0, 6);
  const channels = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
  const luminance = channels
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.42 ? '#555555' : '#FFFFFF';
}

function resolveHighlight(content: string): Omit<InlineTextToken, 'type' | 'value'> | null {
  const separator = content.indexOf(';');
  if (separator < 0) return null;
  const directive = content.slice(0, separator).trim().toLowerCase();
  const value = content.slice(separator + 1);

  if (directive.startsWith('text:')) {
    const color = directive.slice('text:'.length).trim();
    if (!HEX_COLOR_RE.test(color)) return null;
    return { background: 'transparent', color, colorOnly: true };
  }

  if (directive === 'transparent') {
    return { background: 'transparent', color: 'inherit', colorOnly: true };
  }

  if (directive === 'text') {
    return { background: 'transparent', color: 'inherit', colorOnly: true };
  }

  if (directive in HIGHLIGHT_PALETTE) {
    return HIGHLIGHT_PALETTE[directive as HighlightColorName];
  }

  if (HEX_COLOR_RE.test(directive)) {
    return { background: directive, color: readableTextColor(directive) };
  }

  return null;
}

/**
 * Parse safe inline lesson markup. Supported forms:
 * - **bold**
 * - ==highlight== (uses the component's default highlight color)
 * - ==green;text== (named palette color)
 * - ==#16a34a;text== (custom background, readable text color chosen automatically)
 * - ==text:#2563eb;text== (text color only)
 * - ==transparent;text== (transparent marker / inherited text color)
 * Markup can be nested, e.g. ==green;**important**==.
 */
export function parseInline(text: string): InlineTextToken[] {
  const result: InlineTextToken[] = [];
  MARKUP_RE.lastIndex = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = MARKUP_RE.exec(text)) !== null) {
    if (match.index > cursor) result.push({ type: 'text', value: text.slice(cursor, match.index) });
    const markup = match[0];
    if (markup.startsWith('**')) {
      result.push({ type: 'bold', value: markup.slice(2, -2) });
    } else {
      const content = markup.slice(2, -2);
      const resolved = resolveHighlight(content);
      if (resolved) {
        const directive = content.slice(0, content.indexOf(';')).trim().toLowerCase();
        const innerText = content.slice(content.indexOf(';') + 1);
        result.push({ type: 'highlight', value: innerText, ...resolved, ...(directive.startsWith('text:') ? { color: directive.slice('text:'.length).trim() } : {}) });
      } else {
        result.push({ type: 'highlight', value: content });
      }
    }
    cursor = match.index + markup.length;
  }

  if (cursor < text.length) result.push({ type: 'text', value: text.slice(cursor) });
  return result;
}
