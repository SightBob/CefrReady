import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureServerEvent } from './analytics-server';

describe('captureServerEvent', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('ไม่ยิง fetch เมื่อไม่มี project key (analytics ต้องไม่ทำให้ sign-in พัง)', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    captureServerEvent('user-1', 'signup_completed');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ส่ง distinct_id + event ไปยัง /capture/ ของ host ที่ตั้งไว้', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    captureServerEvent('user-1', 'signup_completed', { method: 'google' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://us.i.posthog.com/capture/');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.api_key).toBe('phc_test');
    expect(body.event).toBe('signup_completed');
    expect(body.properties).toMatchObject({ distinct_id: 'user-1', method: 'google' });
  });

  it('ตัด trailing slash ของ host ก่อนต่อ path', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com/');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    captureServerEvent('user-1', 'signup_completed');

    expect(fetchSpy.mock.calls[0]![0]).toBe('https://us.i.posthog.com/capture/');
  });
});
