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
    vi.advanceTimersByTime(4999);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
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

  it('flushNow() sends immediately when work is pending', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.push(state, null);
    pusher.flushNow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // timer เดิมถูกยกเลิกแล้ว — ไม่ยิงซ้ำเมื่อครบกำหนด
    vi.advanceTimersByTime(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flushNow() does nothing when nothing is pending', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.flushNow();
    pusher.flushNow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flushNow() does nothing after cancel() (submitted / retake)', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.push(state, null);
    pusher.cancel();
    pusher.flushNow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('visibilitychange then pagehide does not send the same draft twice', () => {
    const fetchMock = stubFetch();
    const pusher = createTestDraftPusher('focus-form', 58);
    pusher.push(state, null);
    pusher.flushNow();
    pusher.flushNow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
