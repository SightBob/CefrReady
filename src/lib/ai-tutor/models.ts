/**
 * รายชื่อโมเดลจาก OpenRouter (ฝั่ง server) — ใช้ให้หน้า admin เลือกโมเดลได้
 * และใช้ตรวจว่า effort ที่เลือกรองรับกับโมเดลนั้นจริงหรือไม่
 *
 * แคชในหน่วยความจำ ~15 นาที (รายชื่อโมเดลเปลี่ยนไม่บ่อย)
 */

export type OpenRouterModel = {
  id: string;
  name: string;
  /** ราคาต่อ 1M token (USD) */
  pricing: { prompt: number; completion: number };
  /** reasoning บังคับให้คิดเสมอไหม (ปิดไม่ได้) */
  reasoningMandatory: boolean;
  /** ระดับ effort ที่โมเดลรองรับ (ว่าง = ไม่ระบุ/ไม่มีระบบ reasoning) */
  supportedEfforts: string[];
  contextLength: number | null;
  /** รองรับ effort นี้ไหม */
  supportsEffort(effort: string): boolean;
};

const MODELS_CACHE_TTL_MS = 15 * 60 * 1000;
let modelsCache: { at: number; models: OpenRouterModel[] } | null = null;

type RawModel = {
  id?: string;
  name?: string;
  context_length?: number;
  pricing?: Record<string, string | number>;
  reasoning?: {
    mandatory?: boolean;
    supported_efforts?: string[] | null;
    default_effort?: string | null;
  };
};

function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeModel(raw: RawModel): OpenRouterModel | null {
  if (!raw?.id) return null;
  const efforts = Array.isArray(raw.reasoning?.supported_efforts) ? raw.reasoning.supported_efforts : [];
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    // ราคาใน API เป็นต่อ token → แปลงเป็นต่อ 1M token
    pricing: {
      prompt: toNumber(raw.pricing?.prompt) * 1_000_000,
      completion: toNumber(raw.pricing?.completion) * 1_000_000,
    },
    reasoningMandatory: raw.reasoning?.mandatory === true,
    supportedEfforts: efforts,
    contextLength: raw.context_length ?? null,
    supportsEffort(effort: string): boolean {
      if (effort === 'none') {
        // reasoning บังคับ (mandatory) = ปิดไม่ได้
        return !raw.reasoning?.mandatory;
      }
      if (efforts.length === 0) {
        // โมเดลไม่ได้ประกาศระดับ effort → ใช้ค่าใดก็ได้ (ยกเว้น none ที่อาจถูกปฏิเสธ)
        return !raw.reasoning?.mandatory;
      }
      return efforts.includes(effort);
    },
  };
}

/** ดึงรายชื่อโมเดลทั้งหมด (แคช 15 นาที) — คืน [] เมื่อเรียกไม่สำเร็จ */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  if (modelsCache && Date.now() - modelsCache.at < MODELS_CACHE_TTL_MS) {
    return modelsCache.models;
  }
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    console.warn('[ai-tutor] ไม่ได้ตั้ง OPENROUTER_API_KEY — ดึงรายชื่อโมเดลไม่ได้');
    return [];
  }
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.warn('[ai-tutor] ดึงรายชื่อโมเดลไม่สำเร็จ:', response.status);
      return [];
    }
    const payload = await response.json() as { data?: RawModel[] };
    const models = (payload.data ?? [])
      .map(normalizeModel)
      .filter((model): model is OpenRouterModel => model !== null);
    modelsCache = { at: Date.now(), models };
    return models;
  } catch (error) {
    console.warn('[ai-tutor] ดึงรายชื่อโมเดลไม่สำเร็จ:', error);
    return [];
  }
}

/** ล้างแคชรายชื่อโมเดล (ใช้หลังบันทึกค่า เพื่อให้เห็นโมเดลใหม่ทันที) */
export function clearOpenRouterModelsCache(): void {
  modelsCache = null;
}

/**
 * หาโมเดลจาก id
 * @returns โมเดล · undefined = ไม่พบ · null = ตรวจไม่ได้ (เรียก OpenRouter ไม่สำเร็จ)
 */
export async function findModel(modelId: string): Promise<OpenRouterModel | undefined | null> {
  const models = await fetchOpenRouterModels();
  if (models.length === 0) return null; // ตรวจไม่ได้
  return models.find((model) => model.id === modelId);
}

/** รายชื่อโมเดลที่ "แนะนำ" — โฟกัสที่ใช้บ่อย/ฟรี ไว้หน้า */
export function sortModelsForAdmin(models: OpenRouterModel[]): OpenRouterModel[] {
  const preferred = ['minimax/minimax-m3.1-flash:free', 'deepseek/deepseek-v4.1-flash'];
  return [...models].sort((a, b) => {
    const indexA = preferred.indexOf(a.id);
    const indexB = preferred.indexOf(b.id);
    if (indexA !== -1 || indexB !== -1) {
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    }
    const freeA = a.pricing.prompt === 0 && a.pricing.completion === 0;
    const freeB = b.pricing.prompt === 0 && b.pricing.completion === 0;
    if (freeA !== freeB) return freeA ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
