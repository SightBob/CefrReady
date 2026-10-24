'use client';

import type { AiTutorSettings } from '@/lib/ai-tutor/settings-schema';

/** โมเดลจาก GET /api/admin/ai-tutor/models */
export type AdminModel = {
  id: string;
  name: string;
  pricing: { prompt: number; completion: number };
  reasoningMandatory: boolean;
  supportedEfforts: string[];
  contextLength: number | null;
  overPriceLimit: boolean;
};

/** ผลจาก GET /api/admin/ai-tutor/config */
export type AdminConfigResponse = {
  config: AiTutorConfigShape;
  sources: Record<string, 'db' | 'env'>;
  envDefaults: AiTutorConfigShape;
  warnings: string[];
  envStatus: {
    openrouterKey: boolean;
    proofSecret: boolean;
    exportSalt: boolean;
    masterEnabled: boolean;
  };
  limits: {
    routeMaxDurationSeconds: number;
    slackSeconds: number;
    maxTimeoutSeconds: number;
    maxTimeoutMs: number;
    maxFirstTokenTimeoutMs: number;
    note: string;
    maxModelPriceInPerMtok: number;
    maxModelPriceOutPerMtok: number;
  };
};

export type AiTutorConfigShape = {
  envMasterEnabled: boolean;
  runtimeEnabled: boolean;
  primaryModel: string;
  fallbackModel: string | null;
  primaryEffort: string;
  fallbackEffort: string;
  maxTokens: number;
  timeoutMs: number;
  firstTokenTimeoutMs: number;
  questionQuota: number;
  userDailyLimit: number;
  systemDailyLimit: number;
  rolloutPercent: number;
  promptCache: boolean;
};

/** แถว audit จาก GET /api/admin/ai-tutor/audit */
export type AdminAuditRow = {
  id: number;
  actorUserId: string | null;
  action: string;
  target: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

/** สถิติการใช้งานวันนี้จาก GET /api/admin/ai-tutor/usage */
export type AdminUsageResponse = {
  dayStart: string;
  resetAt: string;
  questions: number;
  answers: number;
  failed: number;
  learners: number;
  pending: number;
  lastActivityAt: string | null;
  topLearners: Array<{ userId: string; email: string; name: string | null; count: number }>;
  limits: {
    systemDailyLimit: number;
    userDailyLimit: number;
    questionQuota: number;
  };
  runtimeEnabled: boolean;
};

/** สถิติ 👍/👎 จาก GET /api/admin/ai-tutor/feedback */
export type AdminFeedbackResponse = {
  days: number;
  up: number;
  down: number;
  total: number;
  downvoted: Array<{
    messageId: number;
    votedAt: string;
    content: string;
    model: string | null;
    questionText: string | null;
    grammarTopic: string | null;
    cefrLevel: string | null;
  }>;
};

/** ผลของการทดสอบโมเดล */
export type ModelTestResult = {
  model: string;
  latencyMs: number;
  ttftMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  finishReason: string | null;
  sample: string;
};

/** ผลของการเพิ่ม/ถอนสิทธิ์ผู้ทดสอบ */
export type BulkResult = {
  granted: string[];
  notFound: string[];
  already: string[];
  invalid: string[];
  summary: {
    requested: number;
    granted: number;
    notFound: number;
    already: number;
    invalid: number;
  };
};
