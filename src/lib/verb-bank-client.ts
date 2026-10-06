import type { VerbEntry } from './verb-bank';

const MAX_AGE_MS = 30_000;
export const VERB_BANK_CHANGED_EVENT = 'cefr:verb-bank-changed';
export const VERB_BANK_STORAGE_KEY = 'cefr:verb-bank-version';
let cached: { entries: VerbEntry[]; expiresAt: number } | null = null;
let inflight: Promise<VerbEntry[]> | null = null;
let version = 0;
let lastStorageVersion: string | null = null;

export async function loadVerbEntries(): Promise<VerbEntry[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.entries;
  if (inflight) return inflight;
  const requestVersion = version;
  const request = (async () => {
    const response = await fetch('/api/verb-banks', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body.success || !Array.isArray(body.data)) throw new Error('Invalid verb bank response');
    const entries = body.data as VerbEntry[];
    if (requestVersion !== version) return loadVerbEntries();
    cached = { entries, expiresAt: Date.now() + MAX_AGE_MS };
    return entries;
  })();
  inflight = request;
  try {
    return await request;
  } finally {
    if (inflight === request) inflight = null;
  }
}

/** Also used on storage events; do not rebroadcast events received from another tab. */
export function clearVerbEntries(storageVersion?: string | null): void {
  if (storageVersion !== undefined) {
    if (storageVersion === lastStorageVersion) return;
    lastStorageVersion = storageVersion;
  }
  version += 1;
  cached = null;
  inflight = null;
}

/** Call only after a successful admin mutation; never store actual verb data in storage. */
export function notifyVerbEntriesChanged(): void {
  clearVerbEntries();
  window.dispatchEvent(new Event(VERB_BANK_CHANGED_EVENT));
  try {
    localStorage.setItem(VERB_BANK_STORAGE_KEY, `${Date.now()}-${Math.random()}`);
  } catch {
    // Storage may be disabled; the same-tab event and bounded cache still work.
  }
}
