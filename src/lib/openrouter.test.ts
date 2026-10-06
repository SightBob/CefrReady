import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateTapReason } from './openrouter';
import { DEFAULT_TAP_AI_SETTINGS, tapAiSettingsSchema } from './tap-ai';

const settings = { ...DEFAULT_TAP_AI_SETTINGS, enabled: true, model: 'provider/model' };
const context = { title: 'Practice', item: { prompt: 'She ___ daily.', choiceA: 'go', choiceB: 'goes', correct: 1 as const }, selectedAnswer: 'B' as const, reason: 'She เป็นเอกพจน์' };
const fetchMock = vi.fn();

// Retries back off with real timers, so fake them and flush explicitly - otherwise the
// suite spends ~1.2s per retry test waiting for sleeps that prove nothing.
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('OPENROUTER_API_KEY', 'test-secret');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Runs the call while advancing the fake clock so backoff delays resolve immediately. */
async function settle<T>(fn: () => Promise<T>): Promise<T> {
  const pending = fn();
  // Attach the handler before the clock advances: a rejection that happens while timers run
  // would otherwise be reported as unhandled, because the caller has not awaited it yet.
  const settled = pending.then(
    value => ({ ok: true, value } as const),
    error => ({ ok: false, error } as const),
  );
  await vi.runAllTimersAsync();
  const result = await settled;
  if (!result.ok) throw result.error;
  return result.value;
}

async function settleError(fn: () => Promise<unknown>): Promise<Error & { status: number }> {
  const error = await settle(fn).then(() => null, (e: unknown) => e);
  if (!error) throw new Error('expected the call to reject');
  return error as Error & { status: number };
}

const completion = (content: unknown, finish = 'stop') => new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(content) } }] }));

describe('OpenRouter Tap reason feedback', () => {
  it('sends authoritative question context and isolated learner data, not PII', async () => {
    fetchMock.mockResolvedValue(completion({ understanding: 'partial', feedback: 'เข้าใจบางส่วน' }));
    expect(await evaluateTapReason(settings, context)).toEqual({ understanding: 'partial', feedback: 'เข้าใจบางส่วน' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-secret');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: 'provider/model', max_tokens: 1000, provider: { require_parameters: true }, response_format: { type: 'json_schema' } });
    expect(JSON.parse(body.messages[1].content)).toMatchObject({ authoritativeQuestion: { correctAnswer: 'B' }, selectedAnswer: 'B', learnerReason: context.reason });
    expect(body).not.toHaveProperty('user');
  });
  it('does not call the provider when the key is missing', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    await expect(evaluateTapReason(settings, context)).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not expose upstream error details or credentials', async () => {
    fetchMock.mockResolvedValue(new Response('test-secret upstream debug', { status: 401 }));
    await expect(evaluateTapReason(settings, context)).rejects.toMatchObject({ status: 502 });
    await expect(evaluateTapReason(settings, context)).rejects.not.toThrow('test-secret');
  });
  it('handles network and timeout failures', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(evaluateTapReason(settings, context)).rejects.toMatchObject({ status: 504 });
  });
  it.each([
    [{ understanding: 'correct', feedback: '' }, 'stop'],
    [{ understanding: 'unknown', feedback: 'text' }, 'stop'],
    [{ understanding: 'correct', feedback: 'text' }, 'length'],
  ])('rejects invalid or incomplete feedback %#', async (content, finish) => {
    fetchMock.mockResolvedValue(completion(content, finish as string));
    await expect(evaluateTapReason(settings, context)).rejects.toMatchObject({ status: 502 });
  });

  // json_object mode carries no schema, so providers that do not support response_format
  // let the model add keys and wrap its JSON. Rejecting that drift is what made learners see
  // "AI ส่งผลตรวจไม่สมบูรณ์" for answers that were actually fine.
  it('ignores extra keys the model adds alongside the two contract fields', async () => {
    fetchMock.mockResolvedValue(completion({ understanding: 'correct', feedback: 'ถูกต้อง', score: 50, isCorrect: true, confidence: 0.9 }));
    expect(await evaluateTapReason(settings, context)).toEqual({ understanding: 'correct', feedback: 'ถูกต้อง' });
  });

  it('parses the JSON object when the model wraps it in prose', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'นี่คือผลการตรวจครับ:\n{"understanding":"partial","feedback":"บางส่วน"}\nหวังว่าจะเป็นประโยชน์' } }] })),
    );
    expect(await evaluateTapReason(settings, context)).toEqual({ understanding: 'partial', feedback: 'บางส่วน' });
  });

  it.each([
    ['ถูกต้อง', 'correct'],
    ['ถูกบางส่วน', 'partial'],
    ['INCORRECT', 'incorrect'],
    ['ไม่ชัดเจน', 'unclear'],
  ])('normalizes understanding %s into %s', async (answer, expected) => {
    fetchMock.mockResolvedValue(completion({ understanding: answer, feedback: 'ข้อความ' }));
    expect(await evaluateTapReason(settings, context)).toEqual({ understanding: expected, feedback: 'ข้อความ' });
  });

  it('names an unreadable answer instead of claiming the shape is merely incomplete', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'ตอบข้อ B ถูกต้องแล้วครับ' } }] })),
    );
    const error = await settleError(() => evaluateTapReason(settings, context));
    expect(error).toMatchObject({ status: 502 });
    expect(error.message).toContain('อ่านไม่ได้');
  });

  describe('response_format fallback chain', () => {
    it('retries with json_object + reasoning off when json_schema returns 400', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Model 'apodex/apodex-1.1-mini' does not support 'json_schema' response format. Supported formats: json_object." } }), { status: 400 }))
        .mockResolvedValueOnce(completion({ understanding: 'correct', feedback: 'เข้าใจถูกต้อง' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'correct', feedback: 'เข้าใจถูกต้อง' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, secondInit] = fetchMock.mock.calls[1];
      const body = JSON.parse(secondInit.body);
      expect(body.response_format).toEqual({ type: 'json_object' });
      // Reasoning models spend the whole token budget thinking and return content: null
      expect(body.reasoning).toEqual({ enabled: false });
      // json_object carries no schema, so the contract has to travel in the prompt
      expect(body.messages[0].content).toContain('"understanding":"correct|partial|incorrect|unclear"');
    });

    it.each([400, 404, 422] as const)('retries on %i (unsupported format status)', async (status) => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({}), { status }))
        .mockResolvedValueOnce(completion({ understanding: 'partial', feedback: 'บางส่วน' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'partial', feedback: 'บางส่วน' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('drops the reasoning flag and doubles the budget when reasoning cannot be disabled', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 400 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Reasoning is mandatory for this endpoint and cannot be disabled.' } }), { status: 400 }))
        .mockResolvedValueOnce(completion({ understanding: 'correct', feedback: 'ถูกต้อง' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'correct', feedback: 'ถูกต้อง' });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [, thirdInit] = fetchMock.mock.calls[2];
      const body = JSON.parse(thirdInit.body);
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.reasoning).toBeUndefined();
      expect(body.max_tokens).toBe(2000);
    });

    // Regression (verified live 2026-10-06): nvidia/nemotron-3-ultra-550b-a55b:free has a
    // single endpoint that does not declare response_format support, so requiring parameters
    // made OpenRouter answer 404 "No endpoints found that can handle the requested parameters"
    // on every attempt and the admin saw only a generic message. The retries must relax the
    // routing constraint instead of repeating the same rejected request.
    it('drops provider.require_parameters on retry so a 404 from strict routing can recover', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({
          error: { message: 'No endpoints found that can handle the requested parameters.', code: 404 },
        }), { status: 404 }))
        .mockResolvedValueOnce(completion({ understanding: 'correct', feedback: 'สำเร็จหลังผ่อน routing' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'correct', feedback: 'สำเร็จหลังผ่อน routing' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, retryInit] = fetchMock.mock.calls[1];
      const retryBody = JSON.parse(retryInit.body);
      expect(retryBody.provider).toBeUndefined();
      expect(retryBody.response_format).toEqual({ type: 'json_object' });
    });

    it('surfaces the real reason from OpenRouter on a 404 instead of a generic message', async () => {
      // a fresh Response per call — one shared instance would have an already-read body
      fetchMock.mockImplementation(async () => new Response(JSON.stringify({
        error: { message: 'No endpoints found for model: typo/model-name', code: 404 },
      }), { status: 404 }));
      const error = await settleError(() => evaluateTapReason(settings, context));
      expect(error).toMatchObject({ status: 502 });
      expect(error.message).toContain('404');
      expect(error.message).toContain('No endpoints found for model: typo/model-name');
      expect(error.message).toContain('model ID');
    });

    // Live payload shape: HTTP 200 with an error object in the body (provider overloaded).
    it('retries and reports the provider message when upstream returns 200 with an error body', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({
          id: 'gen-1',
          error: { message: 'Upstream error from Nvidia: Service temporarily overloaded', code: 503 },
        })))
        .mockResolvedValueOnce(completion({ understanding: 'partial', feedback: 'สำเร็จหลัง provider หายไม่ว่าง' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'partial', feedback: 'สำเร็จหลัง provider หายไม่ว่าง' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('reports the provider overload message when every attempt hits it', async () => {
      fetchMock.mockImplementation(async () => new Response(JSON.stringify({
        error: { message: 'Upstream error from Nvidia: Service temporarily overloaded', code: 503 },
      })));
      const error = await settleError(() => evaluateTapReason(settings, context));
      expect(error).toMatchObject({ status: 502 });
      expect(error.message).toContain('Service temporarily overloaded');
    });

    // Free endpoints are busy roughly half the time (verified live), so a provider-busy
    // answer deserves an extra try instead of surfacing an error to the learner.
    it('keeps retrying while the provider is merely busy', async () => {
      for (let i = 0; i < 3; i += 1) {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
          error: { message: 'Upstream error from Nvidia: Service temporarily overloaded', code: 503 },
        })));
      }
      fetchMock.mockResolvedValueOnce(completion({ understanding: 'correct', feedback: 'สำเร็จหลังลองซ้ำเพราะ provider ไม่ว่าง' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'correct', feedback: 'สำเร็จหลังลองซ้ำเพราะ provider ไม่ว่าง' });
      expect(fetchMock).toHaveBeenCalledTimes(4);
      // the extra attempt repeats the shape that got a busy answer — the request was never the problem
      expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual(JSON.parse(fetchMock.mock.calls[0][1].body));
    });

    it('does not send reasoning off on the first attempt', async () => {
      fetchMock.mockResolvedValue(completion({ understanding: 'correct', feedback: 'ถูก' }));
      await evaluateTapReason(settings, context);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).reasoning).toBeUndefined();
    });

    it('does not retry 401 or 403 - a bad key will not fix itself', async () => {
      for (const status of [401, 403]) {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue(new Response('error', { status }));
        await expect(evaluateTapReason(settings, context)).rejects.toMatchObject({ status: 502 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      }
    });

    it('keeps json_schema on the first attempt before retrying', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 400 }))
        .mockResolvedValueOnce(completion({ understanding: 'correct', feedback: 'ถูก' }));
      await settle(() => evaluateTapReason(settings, context));
      const [, firstInit] = fetchMock.mock.calls[0];
      expect(JSON.parse(firstInit.body).response_format.type).toBe('json_schema');
    });

    it('strips markdown code fences from json_object response before parsing', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 400 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '```json\n{"understanding":"correct","feedback":"เข้าใจถูกต้อง"}```' } }] }), { status: 200 }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'correct', feedback: 'เข้าใจถูกต้อง' });
    });

    it('handles code fences with whitespace and trailing content', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 400 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '```json\n{\n  "understanding": "partial",\n  "feedback": "บางส่วน"\n}\n```' } }] }), { status: 200 }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'partial', feedback: 'บางส่วน' });
    });

    it('retries after 429 because free providers throttle (verified on liquid)', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Provider returned error' } }), { status: 429 }))
        .mockResolvedValueOnce(completion({ understanding: 'correct', feedback: 'สำเร็จหลัง retry' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'correct', feedback: 'สำเร็จหลัง retry' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('waits the retry-after delay before retrying a 429', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 429, headers: { 'retry-after': '2' } }))
        .mockResolvedValueOnce(completion({ understanding: 'partial', feedback: 'รอแล้วสำเร็จ' }));
      const pending = evaluateTapReason(settings, context);
      await vi.advanceTimersByTimeAsync(1_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await expect(pending).resolves.toEqual({ understanding: 'partial', feedback: 'รอแล้วสำเร็จ' });
    });

    it.each([500, 502, 503, 504, 408, 425])('retries on transient status %i', async (status) => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({}), { status }))
        .mockResolvedValueOnce(completion({ understanding: 'correct', feedback: 'ผ่าน' }));
      expect(await settle(() => evaluateTapReason(settings, context))).toEqual({ understanding: 'correct', feedback: 'ผ่าน' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('blames the rate limit, not the key, when every attempt is throttled', async () => {
      for (let i = 0; i < 3; i += 1) {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 429 }));
      }
      const error = await settleError(() => evaluateTapReason(settings, context));
      expect(error).toMatchObject({ status: 502 });
      expect(error.message).toContain('429');
      expect(error.message).not.toContain('key');
    });

    it.each([401, 402, 403])('does not retry %i and names the real cause', async (status) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status }));
      const error = await settleError(() => evaluateTapReason(settings, context));
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(error).toMatchObject({ status: 502 });
      expect(error.message).toContain(String(status));
    });

    it('returns 502 when every attempt fails', async () => {
      for (let i = 0; i < 3; i += 1) {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 400 }));
      }
      await expect(settle(() => evaluateTapReason(settings, context))).rejects.toMatchObject({ status: 502 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('stops starting attempts once the route time budget is nearly spent', async () => {
      for (let i = 0; i < 3; i += 1) {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 429 }));
      }
      const started = Date.now();
      await expect(settle(() => evaluateTapReason(settings, context))).rejects.toMatchObject({ status: 502 });
      // 22s budget total; without the guard the chain plus backoff would outrun maxDuration = 30.
      expect(Date.now() - started).toBeLessThan(23_000);
    });

    it('reports a token-budget failure when reasoning fills max_tokens (content null)', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({
          choices: [{
            finish_reason: 'length',
            message: { content: null, reasoning: 'Thinking Process:', reasoning_details: [{ type: 'reasoning.text' }] },
          }],
          usage: { completion_tokens: 1000, completion_tokens_details: { reasoning_tokens: 1192 } },
        })),
      );
      const error = await settleError(() => evaluateTapReason(settings, context));
      expect(error).toMatchObject({ status: 502 });
      expect(error.message).toContain('โควตาโทเคนหมด');
    });

    it('rejects an empty answer instead of crashing', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: null } }] })),
      );
      await expect(evaluateTapReason(settings, context)).rejects.toMatchObject({ status: 502 });
    });

    it('rejects a json_object answer that ignores the contract', async () => {
      fetchMock.mockResolvedValue(
        completion({ selectedAnswer: 'B', isCorrect: true, score: 1, feedback: 'ถูก' }),
      );
      await expect(evaluateTapReason(settings, context)).rejects.toMatchObject({ status: 502 });
    });
  });
});

describe('AI settings validation', () => {
  it('defaults to disabled and requires an explicit model before enabling', () => {
    expect(tapAiSettingsSchema.safeParse(DEFAULT_TAP_AI_SETTINGS).success).toBe(true);
    expect(tapAiSettingsSchema.safeParse({ ...DEFAULT_TAP_AI_SETTINGS, enabled: true }).success).toBe(false);
  });
  it('rejects arbitrary URLs, secrets and excessive limits in settings', () => {
    for (const patch of [{ model: 'https://evil.test' }, { apiKey: 'secret' }, { maxTokens: 2001 }, { maxTokens: 299 }]) {
      expect(tapAiSettingsSchema.safeParse({ ...settings, ...patch }).success).toBe(false);
    }
  });
});
