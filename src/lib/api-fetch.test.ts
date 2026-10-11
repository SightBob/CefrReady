import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api-fetch';
afterEach(() => vi.unstubAllGlobals());
describe('API error contract', () => {
  it('preserves exam expiry for automatic finalization', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'EXAM_TIME_EXPIRED' }), { status: 403 })));
    await expect(apiFetch('/api/tests/full/next')).rejects.toMatchObject({ status: 403, message: 'EXAM_TIME_EXPIRED' });
  });
  it('handles non-JSON failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Error</html>', { status: 500 })));
    await expect(apiFetch('/api')).rejects.toMatchObject({ status: 500, message: 'HTTP 500' });
  });
  it.each([[401, 'SESSION_EXPIRED'], [429, 'RATE_LIMITED:60']])('preserves status %s behavior', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: Number(status) })));
    await expect(apiFetch('/api')).rejects.toMatchObject({ status, message });
  });
});
