export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    throw new ApiError('SESSION_EXPIRED', 401);
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
    throw new ApiError(`RATE_LIMITED:${seconds}`, 429);
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, res.status);
  }
  return res;
}

export function handleApiError(err: unknown, fallbackMessage: string, router?: { push: (url: string) => void }, redirectPath?: string): void {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      if (router && redirectPath) {
        router.push(redirectPath);
      }
      return;
    }
    if (err.status === 429) {
      const secs = err.message.split(':')[1] || '60';
      throw new Error(`ระบบทำงานช้า กรุณารอ ${secs} วินาทีแล้วลองใหม่`);
    }
  }
  throw err instanceof Error ? err : new Error(fallbackMessage);
}