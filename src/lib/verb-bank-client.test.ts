import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearVerbEntries, loadVerbEntries } from './verb-bank-client';
const fetchMock = vi.fn();
const entries = [{ id: 1, v1: 'go', v2: 'went', v3: 'gone' }];
const response = (data = entries) => new Response(JSON.stringify({ success: true, data }));
beforeEach(() => { clearVerbEntries(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('shared verb bank client', () => {
  it('shares simultaneous requests and reuse after reopening a modal', async () => {
    fetchMock.mockResolvedValue(response());
    const results = await Promise.all([loadVerbEntries(), loadVerbEntries(), loadVerbEntries()]);
    expect(results).toEqual([entries, entries, entries]);
    expect(await loadVerbEntries()).toEqual(entries); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('expires cached data after thirty seconds', async () => {
    vi.useFakeTimers(); fetchMock.mockImplementation(async () => response());
    await loadVerbEntries(); vi.advanceTimersByTime(30_001); await loadVerbEntries();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not cache failures and retries a later mount', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(response());
    await expect(loadVerbEntries()).rejects.toThrow('503'); expect(await loadVerbEntries()).toEqual(entries);
  });
  it('invalidates cache only once per cross-tab mutation event', async () => {
    fetchMock.mockImplementation(async () => response());
    await loadVerbEntries(); clearVerbEntries('mutation-1'); await loadVerbEntries();
    clearVerbEntries('mutation-1'); await loadVerbEntries(); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not restore an older inflight response after admin edits', async () => {
    let finish: (response: Response) => void = () => undefined;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    const pending = loadVerbEntries(); clearVerbEntries();
    const updated = [{ id: 1, v1: 'see', v2: 'saw', v3: 'seen' }];
    fetchMock.mockResolvedValue(response(updated)); finish(response());
    expect(await pending).toEqual(updated); expect(await loadVerbEntries()).toEqual(updated);
  });
});
