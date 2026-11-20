// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const captures = vi.hoisted(() => [] as Array<{ event: string; props?: Record<string, unknown> }>);
vi.mock('@/lib/posthog', () => ({
  usePostHog: () => ({
    capture: (event: string, props?: Record<string, unknown>) => {
      captures.push({ event, props });
    },
  }),
}));

import { ExplainViewTracker, SetViewTracker } from './AnalyticsTrackers';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  captures.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Analytics trackers สำหรับหน้า server component', () => {
  it('SetViewTracker ยิง set_viewed พร้อม section/set/จำนวนข้อ', () => {
    act(() => {
      root.render(<SetViewTracker sectionId="form-meaning" testSetId={29} questionCount={8} />);
    });

    expect(captures).toHaveLength(1);
    expect(captures[0]?.event).toBe('set_viewed');
    expect(captures[0]?.props).toEqual({
      section_id: 'form-meaning',
      test_set_id: 29,
      question_count: 8,
    });
  });

  it('ExplainViewTracker ยิง explain_viewed พร้อมจำนวนเรื่อง', () => {
    act(() => {
      root.render(<ExplainViewTracker sectionId="focus-form" testSetId={15} topicCount={2} />);
    });

    expect(captures).toHaveLength(1);
    expect(captures[0]?.event).toBe('explain_viewed');
    expect(captures[0]?.props).toEqual({
      section_id: 'focus-form',
      test_set_id: 15,
      topic_count: 2,
    });
  });
});
