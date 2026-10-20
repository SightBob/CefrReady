/**
 * เรียกโมเดลผ่าน OpenRouter (แบบ stream) — ใช้แนวทางเดียวกับ src/lib/openrouter.ts
 * (โปรเจกต์นี้เรียก OpenRouter ด้วย fetch ตรง ไม่มีแพ็กเกจ openai)
 *
 * ตั้งค่าผ่าน env เท่านั้น (ห้ามฮาร์ดโค้ด):
 *   AI_TUTOR_MODEL                 โมเดลหลัก เช่น minimax/minimax-m3.1-flash:free
 *   AI_TUTOR_FALLBACK_MODEL        โมเดลสำรอง (ว่าง = ไม่มี fallback)
 *   OPENROUTER_API_KEY             key ของ OpenRouter
 *   AI_TUTOR_MAX_TOKENS            เพดาน token รวม (ค่าเริ่มต้น 1200 = เผื่อ reasoning + คำตอบ ~120 คำ)
 *   AI_TUTOR_TIMEOUT_MS            เวลารอสูงสุดต่อ 1 ครั้ง (ค่าเริ่มต้น 30 วิ)
 *   AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS เวลาที่ยอมรอ "เนื้อหาชิ้นแรก" (ค่าเริ่มต้น 12 วิ)
 *   AI_TUTOR_REASONING_EFFORT      ระดับ reasoning ของโมเดลหลัก (ค่าเริ่มต้น low)
 *   AI_TUTOR_FALLBACK_REASONING_EFFORT ระดับ reasoning ของโมเดลสำรอง (ค่าเริ่มต้น low)
 *   AI_TUTOR_PROMPT_CACHE          '1' = ส่ง cache_control ให้ provider ที่รองรับ
 *
 * Reasoning (ตามเอกสาร OpenRouter: reasoning tokens นับรวมใน max_tokens):
 *   - reasoning.effort  = 'low' | 'minimal' | 'medium' | 'high' | 'xhigh' | 'max' | 'none'
 *   - reasoning.exclude = true  → โมเดลคิดเงียบ แต่ไม่ส่ง "reasoning" กลับมาให้ผู้เรียน
 *   - โมเดลที่ reasoning บังคับ (mandatory) จะ **400 ถ้าส่ง effort:'none' หรือ enabled:false**
 *     → โมเดลหลักของเราเป็นแบบนั้น จึงใช้ effort ต่ำแทนการปิด (ดู AI_TUTOR_REASONING_EFFORT)
 *
 * Fallback: สลับไปใช้โมเดลสำรอง "1 ครั้ง" เมื่อโมเดลหลัก
 *   (ก) ได้ 429/5xx/timeout  (ข) ไม่มีเนื้อหาชิ้นแรกภายใน AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS
 *   (ข) จบแล้วเนื้อหาว่าง หรือ finish_reason = length ก่อนมีคำตอบที่ใช้ได้
 * แต่ "ห้ามสลับกลาง stream หลังส่งเนื้อหาให้ผู้เรียนแล้ว" และ "ห้ามสลับเมื่อเจอ 4xx อื่น (400/401/402/404)"
 */

export const DEFAULT_AI_TUTOR_MAX_TOKENS = 1200;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_FIRST_TOKEN_TIMEOUT_MS = 12_000;

export class AiTutorProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type AiTutorUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  model: string;
  latencyMs: number;
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type StreamResult = {
  text: string;
  usage: AiTutorUsage;
  /** finish_reason ของโมเดลที่ตอบจริง (เช่น stop / length) */
  finishReason: string | null;
  /** เวลาที่ใช้จนกว่าจะได้เนื้อหาชิ้นแรก (ms) */
  ttftMs: number | null;
  /** สลับไปใช้โมเดลสำรองหรือไม่ */
  fallbackUsed: boolean;
  /** เหตุผลที่สลับ (null = ไม่ได้สลับ) */
  fallbackReason: string | null;
};

export function aiTutorModel(): string {
  const model = process.env.AI_TUTOR_MODEL?.trim();
  if (!model) {
    throw new AiTutorProviderError(503, 'ยังไม่ได้ตั้งค่า AI_TUTOR_MODEL กรุณาแจ้งผู้ดูแล');
  }
  return model;
}

/** โมเดลสำรอง — ถ้าไม่ตั้ง = ไม่มีการสลับ */
export function aiTutorFallbackModel(): string | null {
  const model = process.env.AI_TUTOR_FALLBACK_MODEL?.trim();
  return model ? model : null;
}

export function aiTutorMaxTokens(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_MAX_TOKENS ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_AI_TUTOR_MAX_TOKENS;
  return Math.min(raw, 8000);
}

export function aiTutorTimeoutMs(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_TIMEOUT_MS ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(raw, 120_000);
}

export function aiTutorFirstTokenTimeoutMs(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_FIRST_TOKEN_TIMEOUT_MS;
  return Math.min(raw, 120_000);
}

/** ระดับ reasoning ของแต่ละบทบาท (primary / fallback) */
export function aiTutorReasoningEffort(role: 'primary' | 'fallback'): string {
  const env = role === 'fallback'
    ? process.env.AI_TUTOR_FALLBACK_REASONING_EFFORT
    : process.env.AI_TUTOR_REASONING_EFFORT;
  const value = env?.trim();
  return value || 'low';
}

/** ข้อความ error ของ OpenRouter → ภาษาไทยสั้น ๆ */
function describeProviderStatus(status: number, detail: string | null): string {
  const suffix = detail ? ` — ${detail}` : '';
  if (status === 429) return `ผู้ให้บริการ AI จำกัดจำนวนคำขอชั่วคราว (429) กรุณารอสักครู่แล้วลองใหม่${suffix}`;
  if (status === 401 || status === 403) return 'OpenRouter ไม่ยอมรับ key กรุณาให้ผู้ดูแลตรวจ key และสิทธิ์ใช้งาน';
  if (status === 402) return 'เครดิต OpenRouter ไม่พอ (402) กรุณาเติมเครดิต';
  if (status === 404) return `OpenRouter ไม่พบโมเดลนี้ (404)${suffix} — ตรวจค่า AI_TUTOR_MODEL`;
  if (status >= 500) return `ผู้ให้บริการ AI มีปัญหาชั่วคราว (${status})${suffix} กรุณาลองใหม่อีกครั้ง`;
  return `ผู้ให้บริการ AI ตอบกลับไม่สำเร็จ (${status})${suffix} กรุณาลองอีกครั้ง`;
}

/** เหตุผลที่สลับโมเดลสำรองได้ (เกิดก่อนส่งเนื้อหาให้ผู้เรียนเท่านั้น) */
type FailureReason =
  | 'rate-limit'      // 429
  | 'server-error'    // 5xx
  | 'timeout'         // หมดเวลารวม
  | 'first-token-timeout' // ไม่มีเนื้อหาชิ้นแรกภายในเวลาที่กำหนด
  | 'empty'           // จบแล้วไม่มีเนื้อหา
  | 'client-error';   // 4xx อื่น → ห้ามสลับ

type AttemptResult =
  | {
      ok: true;
      text: string;
      finishReason: string | null;
      reasoningTokens: number | null;
      inputTokens: number | null;
      outputTokens: number | null;
      ttftMs: number | null;
      latencyMs: number;
    }
  | {
      ok: false;
      reason: FailureReason;
      status: number | null;
      message: string;
      latencyMs: number;
    };

async function attemptModel(params: {
  model: string;
  effort: string;
  messages: ChatMessage[];
  cacheBoundaryIndex?: number;
  onDelta: (text: string) => void;
  signal?: AbortSignal;
  firstTokenTimeoutMs: number;
  timeoutMs: number;
  useCache: boolean;
}): Promise<AttemptResult> {
  const startedAt = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new AiTutorProviderError(503, 'ยังไม่ได้ตั้งค่า OpenRouter API key กรุณาแจ้งผู้ดูแล');
  }

  const body: Record<string, unknown> = {
    model: params.model,
    stream: true,
    temperature: 0.3,
    max_tokens: aiTutorMaxTokens(),
    messages: params.messages,
    // reasoning: exclude = true → ไม่ส่งเนื้อหา reasoning กลับมาให้ผู้เรียน (ยังนับ token)
    reasoning: { effort: params.effort, exclude: true },
  };
  if (params.useCache) {
    body.stream_options = { include_usage: true };
    // ส่วนต้นของ input (system + context ของข้อ) คงที่ → provider ที่รองรับจะแคช prefix นี้ไว้
    body.messages = params.messages.map((message, index) => (
      index === (params.cacheBoundaryIndex ?? 1)
        ? { ...message, cache_control: { type: 'ephemeral' } }
        : message
    ));
  }

  // ตัวจับเวลา "ไม่มีเนื้อหาชิ้นแรก" — ยกเลิกคำขอถ้าเกินเวลา (ต้องยังไม่ส่งอะไรให้ผู้เรียน)
  const firstTokenController = new AbortController();
  let firstTokenTimer: ReturnType<typeof setTimeout> | null = null;
  let sawContent = false;
  const armFirstTokenTimer = () => {
    firstTokenTimer = setTimeout(() => {
      if (!sawContent) firstTokenController.abort();
    }, params.firstTokenTimeoutMs);
  };
  armFirstTokenTimer();

  const overallSignal = AbortSignal.timeout(params.timeoutMs);
  const signals = [overallSignal, firstTokenController.signal];
  if (params.signal) signals.push(params.signal);
  const signal = AbortSignal.any(signals);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'CEFR Ready',
      },
      signal,
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (firstTokenController.signal.aborted && !sawContent) {
      return {
        ok: false,
        reason: 'first-token-timeout',
        status: null,
        message: `โมเดลไม่ตอบภายใน ${Math.round(params.firstTokenTimeoutMs / 1000)} วินาที`,
        latencyMs: Date.now() - startedAt,
      };
    }
    if (params.signal?.aborted) {
      throw new AiTutorProviderError(499, 'การเชื่อมต่อถูกตัด');
    }
    return {
      ok: false,
      reason: 'timeout',
      status: null,
      message: 'เชื่อมต่อผู้ให้บริการ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!response.ok) {
    const detail = await response.text()
      .then((text) => {
        try {
          const parsed = JSON.parse(text) as { error?: { message?: unknown } };
          const message = parsed.error?.message;
          return typeof message === 'string' ? message.slice(0, 300) : null;
        } catch {
          return null;
        }
      })
      .catch(() => null);
    const status = response.status;
    const reason: FailureReason = status === 429
      ? 'rate-limit'
      : status >= 500
        ? 'server-error'
        : 'client-error';
    return {
      ok: false,
      reason,
      status,
      message: describeProviderStatus(status, detail),
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!response.body) {
    return {
      ok: false,
      reason: 'empty',
      status: null,
      message: 'ผู้ให้บริการ AI ไม่ได้ส่งข้อความกลับมา',
      latencyMs: Date.now() - startedAt,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let finishReason: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let reasoningTokens: number | null = null;
  let ttftMs: number | null = null;

  const handleChunk = (raw: string) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        };
      };
      const choice = parsed.choices?.[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      const delta = choice?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        if (!sawContent) {
          sawContent = true;
          ttftMs = Date.now() - startedAt;
          if (firstTokenTimer) clearTimeout(firstTokenTimer);
        }
        text += delta;
        params.onDelta(delta);
      }
      if (parsed.usage) {
        inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
        outputTokens = parsed.usage.completion_tokens ?? outputTokens;
        reasoningTokens = parsed.usage.completion_tokens_details?.reasoning_tokens ?? reasoningTokens;
      }
    } catch {
      // chunk ที่ parse ไม่ได้ (เช่น keep-alive) — ข้ามไป
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) handleChunk(line);
    }
    if (buffer) handleChunk(buffer);
  } catch (error) {
    if (firstTokenController.signal.aborted && !sawContent) {
      return {
        ok: false,
        reason: 'first-token-timeout',
        status: null,
        message: `โมเดลไม่ตอบภายใน ${Math.round(params.firstTokenTimeoutMs / 1000)} วินาที`,
        latencyMs: Date.now() - startedAt,
      };
    }
    if (params.signal?.aborted) {
      throw new AiTutorProviderError(499, 'การเชื่อมต่อถูกตัด');
    }
    if (sawContent) {
      // สตรีมล้มหลังมีเนื้อหาแล้ว → เก็บเนื้อหาที่ได้ไว้ (ไม่สลับโมเดล)
      return {
        ok: true,
        text,
        finishReason,
        reasoningTokens,
        inputTokens,
        outputTokens,
        ttftMs,
        latencyMs: Date.now() - startedAt,
      };
    }
    return {
      ok: false,
      reason: 'timeout',
      status: null,
      message: 'การตอบจากผู้ให้บริการ AI ถูกขัดจังหวะ กรุณาลองใหม่',
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    if (firstTokenTimer) clearTimeout(firstTokenTimer);
  }

  if (!sawContent) {
    // จบแล้วแต่ไม่มีเนื้อหา: อาจเพราะ reasoning กินโควตาหมด (finish_reason = length)
    return {
      ok: false,
      reason: 'empty',
      status: null,
      message: finishReason === 'length'
        ? 'โมเดลใช้โควตาโทเคนหมดก่อนตอบ กรุณาลองใหม่อีกครั้ง'
        : 'โมเดลไม่ได้ตอบ (คำตอบว่าง) กรุณาลองใหม่อีกครั้ง',
      latencyMs: Date.now() - startedAt,
    };
  }

  return {
    ok: true,
    text,
    finishReason,
    reasoningTokens,
    inputTokens,
    outputTokens,
    ttftMs,
    latencyMs: Date.now() - startedAt,
  };
}

/**
 * เรียกโมเดลหลัก แล้วสลับไปโมเดลสำรอง 1 ครั้งเมื่อเข้าเงื่อนไขที่กำหนด
 * (ห้ามสลับหลังส่งเนื้อหาให้ผู้เรียนแล้ว และห้ามสลับเมื่อเจอ 4xx อื่น)
 */
export async function streamAiTutorReply(params: {
  messages: ChatMessage[];
  cacheBoundaryIndex?: number;
  onDelta: (text: string) => void;
  signal?: AbortSignal;
  now?: number;
}): Promise<StreamResult> {
  const primaryModel = aiTutorModel();
  const fallbackModel = aiTutorFallbackModel();
  const useCache = process.env.AI_TUTOR_PROMPT_CACHE?.trim() === '1';
  const shared = {
    messages: params.messages,
    cacheBoundaryIndex: params.cacheBoundaryIndex,
    onDelta: params.onDelta,
    signal: params.signal,
    firstTokenTimeoutMs: aiTutorFirstTokenTimeoutMs(),
    timeoutMs: aiTutorTimeoutMs(),
    useCache,
  };

  const primary = await attemptModel({ ...shared, model: primaryModel, effort: aiTutorReasoningEffort('primary') });

  if (primary.ok) {
    return {
      text: primary.text,
      finishReason: primary.finishReason,
      ttftMs: primary.ttftMs,
      fallbackUsed: false,
      fallbackReason: null,
      usage: {
        inputTokens: primary.inputTokens,
        outputTokens: primary.outputTokens,
        reasoningTokens: primary.reasoningTokens,
        model: primaryModel,
        latencyMs: primary.latencyMs,
      },
    };
  }

  // 4xx อื่น (400/401/402/404) → รายงานเป็น error ตรง ๆ ห้ามสลับ
  if (primary.reason === 'client-error' || !fallbackModel) {
    throw new AiTutorProviderError(primary.status ?? 502, primary.message);
  }

  // สลับไปโมเดลสำรอง (ยังไม่เคยส่งเนื้อหาให้ผู้เรียน)
  const fallback = await attemptModel({ ...shared, model: fallbackModel, effort: aiTutorReasoningEffort('fallback') });

  if (fallback.ok) {
    console.warn('[ai-tutor] ใช้โมเดลสำรองแทนโมเดลหลัก', JSON.stringify({
      primaryModel,
      fallbackModel,
      reason: primary.reason,
      primaryStatus: primary.status,
      primaryLatencyMs: primary.latencyMs,
      fallbackLatencyMs: fallback.latencyMs,
    }));
    return {
      text: fallback.text,
      finishReason: fallback.finishReason,
      ttftMs: fallback.ttftMs,
      fallbackUsed: true,
      fallbackReason: primary.reason,
      usage: {
        inputTokens: fallback.inputTokens,
        outputTokens: fallback.outputTokens,
        reasoningTokens: fallback.reasoningTokens,
        model: fallbackModel,
        latencyMs: fallback.latencyMs,
      },
    };
  }

  // ทั้งสองโมเดลล้มเหลว → error (ฝั่ง route จะคืนโควตา)
  throw new AiTutorProviderError(
    fallback.status ?? 502,
    `${primary.message} (ลองโมเดลสำรองแล้วก็ไม่สำเร็จ: ${fallback.message})`,
  );
}
