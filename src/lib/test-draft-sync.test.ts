import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDraftPusher } from './test-draft-sync';
import type { TestProgressState } from './test-progress';

const state: TestProgressState = { index: 3, answers: ['A', null], checked: {} };

describe('createTestDraftPusher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const stubFetch = () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('push แล้วรอ debounce ก่อนยิง PUT', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.push(state, null);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
  });

  it('cancel() ทิ้งงานค้างโดยไม่ยิง PUT (ใช้หลังส่งข้อสอบ)', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.push(state, null);
    pusher.cancel();
    vi.advanceTimersByTime(5000);
    pusher.push({ index: 4, answers: ['A', 'B'], checked: {} }, null);
    vi.advanceTimersByTime(5000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dispose() ยัง flush งานค้าง (ออกจากหน้ากลางคัน)', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.push(state, null);
    pusher.dispose();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dispose() ยิงซ้ำไม่ได้หลังปิดไปแล้ว', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.push(state, null);
    pusher.dispose();
    pusher.dispose();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
