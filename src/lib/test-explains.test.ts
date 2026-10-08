import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  /** บันทึกการเรียก eq() เพื่อยืนยันว่ามี/ไม่มีตัวกรองสถานะ published */
  eqCalls: [] as Array<[unknown, unknown]>,
}));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => {
      mocks.eqCalls.push([column, value]);
      return actual.eq(
        column as Parameters<typeof actual.eq>[0],
        value as Parameters<typeof actual.eq>[1],
      );
    },
  };
});

import { fetchExplainsForSet, fetchExplainsForSetPreview, findExplainQuizTarget } from './test-explains';

/** drizzle chain ของฟังก์ชันนี้: db.select().from().where().orderBy() */
function chain(rows: unknown[], methods = ['from', 'where', 'orderBy', 'limit', 'innerJoin']) {
  const builder: Record<string, unknown> = {};
  for (const key of methods) builder[key] = vi.fn(() => builder);
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  return builder;
}

const row = (status: string, sections: unknown[]) => ({
  id: 1,
  grammarTopic: 'Present Perfect',
  title: 'Present Perfect',
  intro: null,
  sections,
  tip: null,
  status,
});

/** จำนวนครั้งที่ query กรองด้วย status = 'published' */
const publishedFilterCalls = () =>
  mocks.eqCalls.filter(
    ([column, value]) => (column as { name?: string })?.name === 'status' && value === 'published'
  ).length;

beforeEach(() => {
  mocks.select.mockReset();
  mocks.eqCalls.length = 0;
});

describe('findExplainQuizTarget', () => {
  const target = { setId: 20, sectionId: 'focus-form', name: 'Modals & Auxiliaries' };

  it('prefers the set the explain is bound to and skips the topic lookup', async () => {
    mocks.select.mockReturnValueOnce(chain([target]));

    await expect(findExplainQuizTarget({ grammarTopic: 'Auxiliaries & Verb Forms', boundSetIds: [20] }))
      .resolves.toEqual(target);
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it('finds the set from questions of the same grammarTopic when nothing is bound', async () => {
    mocks.select.mockReturnValueOnce(chain([target]));

    await expect(findExplainQuizTarget({ grammarTopic: 'Auxiliaries & Verb Forms', boundSetIds: [] }))
      .resolves.toEqual(target);
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it('falls back to the topic when the bound set no longer exists', async () => {
    mocks.select
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([target]));

    await expect(findExplainQuizTarget({ grammarTopic: 'Auxiliaries & Verb Forms', boundSetIds: [999] }))
      .resolves.toEqual(target);
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });

  it('ignores unusable bound ids and still answers from the topic', async () => {
    mocks.select.mockReturnValueOnce(chain([target]));

    await expect(findExplainQuizTarget({ grammarTopic: 'Auxiliaries & Verb Forms', boundSetIds: [0, Number.NaN] }))
      .resolves.toEqual(target);
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it('returns null without querying when there is no topic and nothing bound', async () => {
    await expect(findExplainQuizTarget({ grammarTopic: '   ', boundSetIds: null })).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns null when no question in any set uses the topic', async () => {
    mocks.select.mockReturnValueOnce(chain([]));

    await expect(findExplainQuizTarget({ grammarTopic: 'No such topic' })).resolves.toBeNull();
  });
});

describe('fetchExplainsForSetPreview', () => {
  it('keeps content that is not published yet, so an admin can review it in the exam', async () => {
    mocks.select.mockReturnValue(
      chain([
        row('review', [{ type: 'rule', heading: 'A' }]),
        row('published', [{ type: 'rule', heading: 'B' }]),
        row('hidden', [{ type: 'rule', heading: 'C' }]),
      ])
    );

    const explains = await fetchExplainsForSetPreview(7);

    expect(explains.map((item) => item.status)).toEqual(['review', 'published', 'hidden']);
  });

  it('drops the published filter that the learner query keeps', async () => {
    mocks.select.mockReturnValue(chain([row('published', [{ type: 'rule', heading: 'A' }])]));
    await fetchExplainsForSet(7);
    expect(publishedFilterCalls()).toBeGreaterThan(0);

    mocks.eqCalls.length = 0;
    mocks.select.mockReturnValue(chain([row('review', [{ type: 'rule', heading: 'A' }])]));
    await fetchExplainsForSetPreview(7);
    expect(publishedFilterCalls()).toBe(0);
  });

  it('still trims draft parts and drops rows whose parts are all drafts', async () => {
    mocks.select.mockReturnValue(
      chain([
        row('review', [
          { type: 'rule', heading: 'A' },
          { type: 'rule', heading: 'B', visibility: 'draft' },
        ]),
        row('draft', [{ type: 'rule', heading: 'C', visibility: 'draft' }]),
      ])
    );

    const explains = await fetchExplainsForSetPreview(7);

    expect(explains).toHaveLength(1);
    expect(explains[0].sections.map((section) => section.heading)).toEqual(['A']);
  });
});
