import { db } from '@/db';
import { aiUsageLogs } from '@/db/schema';

export const AI_FEATURE_TAP_REASON = 'tap_reason' as const;

export type AiUsageToLog = {
  userId: string;
  feature: typeof AI_FEATURE_TAP_REASON;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: 'ok' | 'error';
  errorStatus?: number;
  latencyMs?: number;
  understanding?: 'correct' | 'partial' | 'incorrect' | 'unclear';
};

// Fire-and-forget: logging must never slow the learner down or fail the request.
// Errors are swallowed with a console.warn so a broken table only costs telemetry,
// never the main flow. The caller is expected to `void` this function.
export async function logAiUsage(entry: AiUsageToLog): Promise<void> {
  try {
    await db.insert(aiUsageLogs).values({
      userId: entry.userId,
      feature: entry.feature,
      model: entry.model,
      promptTokens: entry.promptTokens,
      completionTokens: entry.completionTokens,
      totalTokens: entry.totalTokens,
      status: entry.status,
      errorStatus: entry.errorStatus ?? null,
      latencyMs: entry.latencyMs ?? null,
      understanding: entry.understanding ?? null,
    });
  } catch (error) {
    console.warn('[ai-usage] Failed to log AI usage:', error);
  }
}
