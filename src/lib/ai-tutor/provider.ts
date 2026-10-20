/**
 * เรียกโมเดลผ่าน OpenRouter (แบบ stream) — ใช้ SDK/แนวทางเดียวกับ src/lib/openrouter.ts
 * (โปรเจกต์นี้เรียก OpenRouter ด้วย fetch ตรง ไม่มีแพ็กเกจ openai)
 *
 * ตั้งค่าผ่าน env เท่านั้น (ห้ามฮาร์ดโค้ด):
 *   AI_TUTOR_MODEL            เช่น minimax/minimax-m3.1-flash:free
 *   OPENROUTER_API_KEY        key ของ OpenRouter (ตัวเดียวกับที่ Tap & Select ใช้)
 *   AI_TUTOR_MAX_TOKENS       เพดาน token คำตอบ (ค่าเริ่มต้น 700 ≈ 120 คำไทย)
 *   AI_TUTOR_TIMEOUT_MS       เวลาสูงสุดที่รอ (ค่าเริ่มต้น 30 วิ)
 *   AI_TUTOR_PROMPT_CACHE     '1' = ส่ง cache_control ให้ provider ที่รองรับ
 */

export const DEFAULT_AI_TUTOR_MAX_TOKENS = 700;
const DEFAULT_TIMEOUT_MS = 30_000;

export class AiTutorProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** โมเดลมาจาก env เท่านั้น (AI_TUTOR_MODEL) — ไม่ฮาร์ดโค้ด ถ้าไม่ตั้ง = fail-closed */
export function aiTutorModel(): string {
  const model = process.env.AI_TUTOR_MODEL?.trim();
  if (!model) {
    throw new AiTutorProviderError(503, 'ยังไม่ได้ตั้งค่า AI_TUTOR_MODEL กรุณาแจ้งผู้ดูแล');
  }
  return model;
}

export function aiTutorMaxTokens(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_MAX_TOKENS ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_AI_TUTOR_MAX_TOKENS;
  return Math.min(raw, 4000);
}

export function aiTutorTimeoutMs(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_TIMEOUT_MS ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(raw, 120_000);
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiTutorUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
  latencyMs: number;
};

export type StreamResult = {
  text: string;
  usage: AiTutorUsage;
};

/** แปลงข้อความ error ของ OpenRouter เป็นภาษาไทยสั้น ๆ */
function describeProviderStatus(status: number, detail: string | null): string {
  const suffix = detail ? ` — ${detail}` : '';
  if (status === 429) return `ผู้ให้บริการ AI จำกัดจำนวนคำขอชั่วคราว (429) กรุณารอสักครู่แล้วลองใหม่${suffix}`;
  if (status === 401 || status === 403) return 'OpenRouter ไม่ยอมรับ key กรุณาให้ผู้ดูแลตรวจ key และสิทธิ์ใช้งาน';
  if (status === 402) return 'เครดิต OpenRouter ไม่พอ (402) กรุณาเติมเครดิต';
  if (status === 404) return `OpenRouter ไม่พบโมเดลนี้ (404)${suffix} — ตรวจค่า AI_TUTOR_MODEL`;
  return `ผู้ให้บริการ AI ตอบกลับไม่สำเร็จ (${status})${suffix} กรุณาลองอีกครั้ง`;
}

/**
 * เรียกโมเดลแบบ stream แล้วส่ง delta ทีละก้อนให้ callback
 * @param signal signal ของ request — เมื่อ client ตัดการเชื่อมต่อ เรียกจะถูกยกเลิก
 */
export async function streamAiTutorReply(params: {
  messages: ChatMessage[];
  /**
   * ดัชนีของข้อความท้ายสุดของ "ส่วนต้นที่คงที่" (system + context ของข้อ)
   * ใช้ติด cache_control — provider ที่รองรับจะแคช prefix นี้ไว้ใช้ซ้ำ
   */
  cacheBoundaryIndex?: number;
  onDelta: (text: string) => void;
  signal?: AbortSignal;
  now?: number;
}): Promise<StreamResult> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new AiTutorProviderError(503, 'ยังไม่ได้ตั้งค่า OpenRouter API key กรุณาแจ้งผู้ดูแล');
  }

  const model = aiTutorModel();
  const startedAt = params.now ?? Date.now();
  const timeoutSignal = AbortSignal.timeout(aiTutorTimeoutMs());
  const signal = params.signal
    ? AbortSignal.any([params.signal, timeoutSignal])
    : timeoutSignal;

  const useCache = process.env.AI_TUTOR_PROMPT_CACHE?.trim() === '1';
  // ส่วนต้นของ input (system + context ของข้อ) คงที่ทุกครั้ง → provider ที่รองรับ
  // prompt caching ใช้ prefix เดิมซ้ำได้ (OpenRouter จัดการเองสำหรับบาง provider)
  const cacheBoundary = params.cacheBoundaryIndex ?? 1;
  const messages = params.messages.map((message, index) => (
    useCache && index === cacheBoundary
      ? { ...message, cache_control: { type: 'ephemeral' } }
      : message
  ));

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
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.3,
        max_tokens: aiTutorMaxTokens(),
        messages,
        ...(useCache ? { stream_options: { include_usage: true } } : {}),
      }),
    });
  } catch (error) {
    if (params.signal?.aborted) {
      throw new AiTutorProviderError(499, 'การเชื่อมต่อถูกตัด');
    }
    throw new AiTutorProviderError(504, 'เชื่อมต่อผู้ให้บริการ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
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
    throw new AiTutorProviderError(response.status, describeProviderStatus(response.status, detail));
  }

  if (!response.body) {
    throw new AiTutorProviderError(502, 'ผู้ให้บริการ AI ไม่ได้ส่งข้อความกลับมา');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  const handleChunk = (raw: string) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string | null } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        text += delta;
        params.onDelta(delta);
      }
      if (parsed.usage) {
        inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
        outputTokens = parsed.usage.completion_tokens ?? outputTokens;
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
    if (params.signal?.aborted) {
      throw new AiTutorProviderError(499, 'การเชื่อมต่อถูกตัด');
    }
    throw new AiTutorProviderError(502, 'การตอบจากผู้ให้บริการ AI ถูกขัดจังหวะ กรุณาลองใหม่');
  }

  return {
    text,
    usage: {
      inputTokens,
      outputTokens,
      model,
      latencyMs: Math.max(0, Date.now() - startedAt),
    },
  };
}
