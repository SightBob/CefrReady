import 'dotenv/config';

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, eq, isNotNull, sql } from 'drizzle-orm';

import { db } from '../src/db';
import { questions } from '../src/db/schema';
import { buildProviderMessages, type ThreadMessage } from '../src/lib/ai-tutor/messages';
import { buildQuestionContext } from '../src/lib/ai-tutor/prompt';
import { streamAiTutorReply } from '../src/lib/ai-tutor/provider';

/**
 * AI Tutor eval — รันสถานการณ์ถามต่อหลายโมเดลเทียบกัน แล้วเขียนไฟล์ markdown ให้อ่านเอง
 *
 * ใช้โมดูลเดียวกับที่ API ใช้จริง (src/lib/ai-tutor/provider.ts) — ไม่เขียนตรรกะเรียกโมเดลซ้ำ
 * โจทย์จริงดึงจาก DB (Neon branch ai-tutor-migration) พร้อมคำอธิบายเดิม
 * เทิร์นแรกของแต่ละเคส = คำอธิบายเดิม (assistant) เหมือนที่ API สร้างจริง
 *
 * วิธีใช้:
 *   npx tsx scripts/ai-tutor-eval.ts --model minimax/minimax-m3.1-flash:free --model openai/gpt-oss-120b:free
 *   npx tsx scripts/ai-tutor-eval.ts --model a --model b --out tmp/ai-tutor-eval/รอบ-1.md
 *
 * หมายเหตุ: สคริปต์นี้ยิงโมเดลจริง → ไม่รันอัตโนมัติใน vitest และไม่อยู่ใน src/
 */
type EvalSettings = {
  questionCount: number;
  maxCalls: number;
  maxWords: number;
  repeatThreshold: number;
};

type EvalScenario = {
  id: string;
  label: string;
  group?: string;
  prompt: string;
};

type EvalConfig = {
  settings: EvalSettings;
  pricing: Record<string, { inputPer1M: number; outputPer1M: number }>;
  scenarios: EvalScenario[];
};

type EvalQuestion = {
  id: number;
  context: ReturnType<typeof buildQuestionContext>;
};

type CaseResult = {
  scenario: EvalScenario;
  question: EvalQuestion;
  answer: string;
  error: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  warnings: string[];
};

type ModelSummary = {
  model: string;
  calls: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  priceKnown: boolean;
};

// ─── ตัวช่วยตรวจอัตโนมัติ (เตือนเท่านั้น ไม่ตัดสินผ่าน/ไม่ผ่าน) ────────────────

/** นับ "คำ" โดยประมาณ: คำอังกฤษ 1 คำ = 1 คำ, ภาษาไทย ≈ 5 ตัวอักษร = 1 คำ */
function estimateWords(text: string): number {
  const englishWords = text.match(/[A-Za-z][A-Za-z'-]*/g)?.length ?? 0;
  const thaiChars = text.match(/\p{Script=Thai}/gu)?.length ?? 0;
  return englishWords + Math.round(thaiChars / 5);
}

function hasThai(text: string): boolean {
  return /\p{Script=Thai}/u.test(text);
}

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/** ความคล้ายแบบ Dice บนชุดคำ (ใช้ตรวจว่า "ทวนคำอธิบายเดิม") */
function similarity(a: string, b: string): number {
  const normalize = (text: string) =>
    text
      .replace(/[*_`#>\-]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared += 1;
  return (2 * shared) / (wordsA.size + wordsB.size);
}

// ─── โหลด config + โจทย์จริงจาก DB ──────────────────────────────────────────

function loadConfig(): EvalConfig {
  const path = join(process.cwd(), 'scripts', 'ai-tutor-eval.json');
  return JSON.parse(readFileSync(path, 'utf8')) as EvalConfig;
}

async function loadQuestions(count: number): Promise<EvalQuestion[]> {
  const rows = await db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      grammarTopic: questions.grammarTopic,
      cefrLevel: questions.cefrLevel,
    })
    .from(questions)
    .where(and(
      eq(questions.active, 'true'),
      isNotNull(questions.explanation),
      isNotNull(questions.optionA),
      isNotNull(questions.optionB),
      isNotNull(questions.optionC),
      isNotNull(questions.optionD),
      isNotNull(questions.grammarTopic),
      sql`length(${questions.explanation}) > 20`,
    ))
    .limit(400);

  // เอาหนึ่งข้อต่อหนึ่งเรื่องไวยากรณ์ เพื่อให้ได้หลากหลาย
  const seenTopics = new Set<string>();
  const picked: EvalQuestion[] = [];
  for (const row of rows) {
    const topic = (row.grammarTopic ?? '').trim();
    if (!topic || seenTopics.has(topic)) continue;
    seenTopics.add(topic);
    picked.push({ id: row.id, context: buildQuestionContext(row) });
    if (picked.length >= count) break;
  }
  return picked;
}

// ─── รัน ───────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const models: string[] = [];
  let out: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--model' && argv[index + 1]) {
      models.push(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--model=')) {
      models.push(arg.slice('--model='.length));
    } else if (arg === '--out' && argv[index + 1]) {
      out = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
    }
  }
  if (models.length === 0 && process.env.AI_TUTOR_EVAL_MODELS) {
    models.push(...process.env.AI_TUTOR_EVAL_MODELS.split(',').map((m) => m.trim()).filter(Boolean));
  }
  if (models.length === 0 && process.env.AI_TUTOR_MODEL) {
    models.push(process.env.AI_TUTOR_MODEL);
  }
  return { models, out };
}

function estimateCost(model: string, inputTokens: number, outputTokens: number, pricing: EvalConfig['pricing']) {
  const price = pricing[model];
  if (!price) return { usd: 0, known: false };
  return {
    usd: (inputTokens / 1_000_000) * price.inputPer1M + (outputTokens / 1_000_000) * price.outputPer1M,
    known: true,
  };
}

async function main() {
  const { models, out } = parseArgs(process.argv.slice(2));
  if (models.length === 0) {
    console.error('ต้องระบุโมเดล: --model <model-id> (หรือ AI_TUTOR_EVAL_MODELS="a,b")');
    process.exit(1);
  }
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error('ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY');
    process.exit(1);
  }

  const config = loadConfig();
  const questions = await loadQuestions(config.settings.questionCount);
  if (questions.length === 0) {
    console.error('ไม่พบโจทย์ที่มีคำอธิบายใน DB');
    process.exit(1);
  }
  console.log(`โจทย์จริงจาก DB: ${questions.length} ข้อ (${questions.map((q) => q.context.grammarTopic).join(', ')})`);

  const results: Record<string, CaseResult[]> = {};
  const summaries: ModelSummary[] = [];
  let totalCalls = 0; // เพดานรวมทั้งรอน (ไม่ใช่ต่อโมเดล)

  for (const model of models) {
    console.log(`\n=== โมเดล: ${model} ===`);
    // provider อ่านโมเดลจาก env → ตั้งให้ใช้ตัวเดียวกับ API
    process.env.AI_TUTOR_MODEL = model;

    const modelResults: CaseResult[] = [];
    const summary: ModelSummary = {
      model,
      calls: 0,
      failed: 0,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      costUsd: 0,
      priceKnown: true,
    };

    // เธรดต่อกลุ่ม (สำหรับเคสถามต่อเนื่อง) — เก็บประวัติแยกต่อกลุ่ม
    const groupThreads = new Map<string, ThreadMessage[]>();

    for (const [index, scenario] of config.scenarios.entries()) {
      if (totalCalls >= config.settings.maxCalls) {
        console.log(`  ถึงเพดานรวม ${config.settings.maxCalls} ครั้งแล้ว — ข้ามที่เหลือ`);
        break;
      }
      const question = questions[index % questions.length];
      const group = scenario.group ?? scenario.id;
      const thread = groupThreads.get(group) ?? [];

      const messages = buildProviderMessages({
        context: question.context,
        thread,
        learnerMessage: scenario.prompt,
      });

      summary.calls += 1;
      totalCalls += 1;
      const started = Date.now();
      let answer = '';
      let error: string | null = null;
      let inputTokens: number | null = null;
      let outputTokens: number | null = null;

      try {
        const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
        answer = result.text;
        inputTokens = result.usage.inputTokens;
        outputTokens = result.usage.outputTokens;
        summary.latencyMs += result.usage.latencyMs;
      } catch (providerError) {
        error = providerError instanceof Error ? providerError.message : String(providerError);
        summary.failed += 1;
        summary.latencyMs += Date.now() - started;
      }

      summary.inputTokens += inputTokens ?? 0;
      summary.outputTokens += outputTokens ?? 0;
      const cost = estimateCost(model, inputTokens ?? 0, outputTokens ?? 0, config.pricing);
      summary.costUsd += cost.usd;
      if (!cost.known) summary.priceKnown = false;

      // เช็คอัตโนมัติ (เตือนเท่านั้น)
      const warnings: string[] = [];
      const words = estimateWords(answer);
      if (words > config.settings.maxWords) {
        warnings.push(`ยาวเกินกำหนด (~${words} คำ / ${config.settings.maxWords})`);
      }
      if (answer && !hasThai(answer)) {
        warnings.push('ไม่มีภาษาไทยเลย');
      }
      if (hasCjk(answer)) {
        warnings.push('มีอักขระจีนปนมา');
      }
      if (question.context.explanation && similarity(answer, question.context.explanation) >= config.settings.repeatThreshold) {
        warnings.push(`ทวนคำอธิบายเดิมเกือบทั้งหมด (คล้าย ${Math.round(similarity(answer, question.context.explanation) * 100)}%)`);
      }

      modelResults.push({
        scenario,
        question,
        answer,
        error,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - started,
        warnings,
      });

      // เก็บเป็นประวัติของกลุ่ม (สำหรับเทิร์นถัดไปของเคสถามต่อเนื่อง)
      if (!error && answer) {
        thread.push(
          { id: -1, role: 'user', content: scenario.prompt, status: 'ok', createdAt: new Date(), latencyMs: null, inputTokens: null, outputTokens: null, model: null },
          { id: -1, role: 'assistant', content: answer, status: 'ok', createdAt: new Date(), latencyMs: null, inputTokens: null, outputTokens: null, model: null },
        );
        groupThreads.set(group, thread);
      }

      console.log(
        `  ${scenario.id.padEnd(26)} ${error ? 'ERROR' : `${words} คำ`} ${warnings.length ? `⚠ ${warnings.join(' | ')}` : ''}`,
      );
    }

    results[model] = modelResults;
    summaries.push(summary);
  }

  // ─── เขียนไฟล์ผลลัพธ์ ───
  const outDir = join(process.cwd(), 'tmp', 'ai-tutor-eval');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = out ? join(process.cwd(), out) : join(outDir, `eval-${stamp}.md`);
  writeFileSync(outPath, renderMarkdown({ config, questions, results, summaries }), 'utf8');

  console.log('\n=== สรุป ===');
  for (const summary of summaries) {
    const cost = summary.priceKnown ? `$${summary.costUsd.toFixed(4)}` : 'ไม่ทราบราคา';
    console.log(
      `${summary.model}: ${summary.calls} ครั้ง (ล้มเหลว ${summary.failed}) · in ${summary.inputTokens} / out ${summary.outputTokens} tokens · ${summary.latencyMs} ms · ${cost}`,
    );
  }
  console.log(`\nผลลัพธ์: ${outPath}`);
  process.exit(0);
}

function renderMarkdown(input: {
  config: EvalConfig;
  questions: EvalQuestion[];
  results: Record<string, CaseResult[]>;
  summaries: ModelSummary[];
}): string {
  const { config, questions, results, summaries } = input;
  const models = Object.keys(results);
  const lines: string[] = [];

  lines.push('# ผลทดสอบ AI Tutor — เทียบโมเดล');
  lines.push('');
  lines.push(`- สร้างเมื่อ: ${new Date().toISOString()}`);
  lines.push(`- โจทย์จริงจาก DB: ${questions.length} ข้อ (${questions.map((q) => q.context.grammarTopic).join(', ')})`);
  lines.push(`- จำนวนสถานการณ์: ${config.scenarios.length} · เพดานคำตอบ ${config.settings.maxWords} คำ (ประมาณ)`);
  lines.push('');

  lines.push('## สรุปรายโมเดล');
  lines.push('');
  lines.push('| โมเดล | เรียก | ล้มเหลว | input tok | output tok | latency (ms) | ค่าใช้จ่ายโดยประมาณ |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const summary of summaries) {
    const cost = summary.priceKnown ? `$${summary.costUsd.toFixed(4)}` : 'ไม่ทราบราคา';
    lines.push(`| \`${summary.model}\` | ${summary.calls} | ${summary.failed} | ${summary.inputTokens} | ${summary.outputTokens} | ${summary.latencyMs} | ${cost} |`);
  }
  lines.push('');

  lines.push('## โจทย์ที่ใช้ทดสอบ');
  lines.push('');
  for (const [index, question] of questions.entries()) {
    lines.push(`### ข้อที่ ${index + 1} — id ${question.id} (${question.context.grammarTopic ?? 'ไม่ระบุ'})`);
    lines.push('');
    lines.push(`- โจทย์: ${question.context.questionText}`);
    lines.push(`- ตัวเลือก: ${question.context.options.join(' | ')}`);
    lines.push(`- เฉลย: ${question.context.correctAnswerText}`);
    lines.push(`- คำอธิบายเดิม (เทิร์น assistant แรก): ${question.context.explanation ?? '-'}`);
    lines.push('');
  }

  lines.push('## คำตอบเทียบกัน');
  lines.push('');
  for (const scenario of config.scenarios) {
    lines.push(`### ${scenario.label} — \`${scenario.id}\``);
    lines.push('');
    lines.push(`**คำถามของนักเรียน:** ${scenario.prompt}`);
    lines.push('');
    for (const model of models) {
      const result = results[model]?.find((item) => item.scenario.id === scenario.id);
      lines.push(`#### \`${model}\``);
      lines.push('');
      if (!result) {
        lines.push('_(ไม่ได้รัน)_');
        lines.push('');
        continue;
      }
      lines.push(`- โจทย์ที่ใช้: id ${result.question.id} (${result.question.context.grammarTopic ?? '-'})`);
      lines.push(`- latency: ${result.latencyMs} ms · input ${result.inputTokens ?? '-'} / output ${result.outputTokens ?? '-'} tokens`);
      if (result.warnings.length) {
        lines.push(`- ⚠️ เตือน: ${result.warnings.join(' · ')}`);
      }
      lines.push('');
      if (result.error) {
        lines.push(`> **ERROR:** ${result.error}`);
      } else {
        lines.push(result.answer.trim() || '_(คำตอบว่าง)_');
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

void main();
