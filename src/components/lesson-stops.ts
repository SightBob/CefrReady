/** One step in the lesson flow shown in the sidebar numbered grid. */
export interface LessonStop {
  /** Short label used for aria text and the stop chip (e.g. "Concept Card"). */
  label: string;
  /** Visual state of the numbered tile. */
  state: 'done' | 'active' | 'todo';
}
