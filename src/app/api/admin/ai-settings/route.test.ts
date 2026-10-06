import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_TAP_AI_SETTINGS } from '@/lib/tap-ai';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), save: vi.fn(), key: vi.fn() }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('@/lib/tap-ai-settings', () => ({ getTapAiSettings: mocks.get, saveTapAiSettings: mocks.save, hasOpenRouterKey: mocks.key }));
import { GET, PUT } from './route';
const request = (body: unknown) => new NextRequest('http://localhost:3000/api/admin/ai-settings', { method: 'PUT', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ error: null }); mocks.get.mockResolvedValue(DEFAULT_TAP_AI_SETTINGS); mocks.save.mockResolvedValue(undefined); mocks.key.mockReturnValue(true); });
describe('admin AI settings', () => {
  it('guards both reading and writing with existing admin authorization', async () => {
    const error = NextResponse.json({}, { status: 403 }); mocks.auth.mockResolvedValue({ error });
    expect(await GET()).toBe(error); expect(await PUT(request(DEFAULT_TAP_AI_SETTINGS))).toBe(error);
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('only returns key presence, never key material', async () => {
    expect(await (await GET()).json()).toEqual({ success: true, data: DEFAULT_TAP_AI_SETTINGS, keyConfigured: true });
  });
  it('rejects enabling AI without a server key', async () => {
    mocks.key.mockReturnValue(false);
    expect((await PUT(request({ ...DEFAULT_TAP_AI_SETTINGS, enabled: true, model: 'provider/model' }))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects secret fields and invalid model IDs', async () => {
    expect((await PUT(request({ ...DEFAULT_TAP_AI_SETTINGS, apiKey: 'secret' }))).status).toBe(400);
    expect((await PUT(request({ ...DEFAULT_TAP_AI_SETTINGS, model: 'not-a-model' }))).status).toBe(400);
  });
  it('persists only validated nonsecret configuration', async () => {
    const settings = { ...DEFAULT_TAP_AI_SETTINGS, model: 'provider/model', enabled: true };
    expect((await PUT(request(settings))).status).toBe(200); expect(mocks.save).toHaveBeenCalledWith(settings);
  });
  it('does not claim success on storage failure', async () => {
    mocks.save.mockRejectedValue(new Error('Redis down'));
    expect((await PUT(request(DEFAULT_TAP_AI_SETTINGS))).status).toBe(503);
  });
});
