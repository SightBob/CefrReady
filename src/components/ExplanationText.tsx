// Explanations imported from CSV are often run-on sentences in a single
// string, which renders as one dense block. Split them so each sentence
// sits on its own line while preserving any explicit newlines in the data —
// real newlines from quoted CSV cells as well as literal "\n" typed by hand.
// A double break ("\n\n") survives as an empty line = one blank line of space.
function splitExplanationLines(text: string): string[] {
  const lines = text
    .split(/\r?\n|\\n/)
    .flatMap(line => line.split(/(?<=[.!?]["')\]]*)\s+(?=["'(\[]?[A-Z0-9])/))
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
          : <p key={i} className="leading-relaxed">{line}</p>
      )}
    </div>
  );
}
