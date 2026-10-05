import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  effect: undefined as undefined | (() => void | (() => void)),
  session: { user: { id: 'user-1' } } as { user: { id: string } } | null,
  memoDeps: undefined as unknown[] | undefined,
  memoValue: undefined as unknown,
  init: vi.fn(),
  idle: vi.fn(),
  cancel: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('react', () => ({
  createContext: () => ({ Provider: 'provider' }),
  useContext: vi.fn(),
  useState: () => [null, vi.fn()],
  useRef: () => ({ current: null }),
  useCallback: (fn: unknown) => fn,
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => { if (deps.length === 0) mocks.effect = effect; },
  useMemo: (factory: () => unknown, deps: unknown[]) => {
    if (!mocks.memoDeps || deps.some((dep, i) => dep !== mocks.memoDeps?.[i])) {
      mocks.memoValue = factory();
      mocks.memoDeps = deps;
    }
    return mocks.memoValue;
  },
}));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: mocks.session }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('posthog-js', () => ({ default: { init: mocks.init } }));
import { PostHogProvider } from './posthog';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.effect = undefined;
  mocks.memoDeps = undefined;
  mocks.memoValue = undefined;
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-key');
  vi.stubGlobal('document', { readyState: 'complete' });
  vi.stubGlobal('window', { addEventListener: mocks.add, removeEventListener: mocks.remove, cancelIdleCallback: mocks.cancel });
  vi.stubGlobal('requestIdleCallback', mocks.idle);
  mocks.idle.mockReturnValue(123);
  // The feature check uses window, while the call uses the global function.
  (window as unknown as Record<string, unknown>).requestIdleCallback = mocks.idle;
});

describe('PostHog provider lifecycle', () => {
  it('cancels scheduled initialization on cleanup and does not initialize after unmount', async () => {
    PostHogProvider({ children: null });
    const cleanup = mocks.effect?.();
    expect(mocks.idle).toHaveBeenCalledTimes(1);
    expect(typeof cleanup).toBe('function');
    if (typeof cleanup === 'function') cleanup();
    expect(mocks.cancel).toHaveBeenCalledWith(123);
    const initialize = mocks.idle.mock.calls[0][0] as () => Promise<void>;
    await initialize();
    expect(mocks.init).not.toHaveBeenCalled();
  });

  it('retains the context reference when only session state changes', () => {
    const first = PostHogProvider({ children: null });
    mocks.session = null;
    const second = PostHogProvider({ children: null });
    expect(second.props.value).toBe(first.props.value);
  });
});
