import RichText from './RichText';

// Explanations imported from CSV are often run-on sentences in a single
// string, which renders as one dense block. Split them so each sentence
// sits on its own line while preserving any explicit newlines in the data —
// real newlines from quoted CSV cells as well as literal "\n" typed by hand.
// A double break ("\n\n") survives as an empty line = one blank line of space.
//
// Each line is rendered through RichText because the explanations stored in the
// database already carry the project's inline markup (**bold**, ==highlight==).
// Without it the learners saw the raw markers, e.g. "**yesterday**".
//
// A sentence only counts as ended when the next word starts with a capital,
// a digit, or a non-ASCII letter — the explanations mix Thai prose with English
// quotes, so "บรรทัดแรก. บรรทัดที่สอง." must split while an abbreviation such as
// "e.g. yesterday" must not.
const SENTENCE_BREAK_RE = /(?<=[.!?]["')\]]*)\s+(?=["'(\[]?(?:[A-Z0-9]|[^\x00-\x7F]))/;

function splitExplanationLines(text: string): string[] {
  const lines = text
    .split(/\r?\n|\\n/)
    .flatMap(line => line.split(SENTENCE_BREAK_RE))
    .map(s => s.trim());
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

interface ExplanationTextProps {
  text: string;
  // Typography classes (color, size, weight) are applied to the wrapper and
  // inherited by each line so callers keep their existing styles.
  className?: string;
}

export default function ExplanationText({ text, className = '' }: ExplanationTextProps) {
  const lines = splitExplanationLines(text);
  if (lines.length === 0) return null;

  return (
    <div className={className}>
      {lines.map((line, i) =>
        line === ''
          ? <p key={i} aria-hidden="true">&nbsp;</p>
          : <p key={i} className="leading-relaxed"><RichText text={line} as="span" /></p>
      )}
    </div>
  );
}
