/**
 * Seed the 10 Present Simple questions into Node 1: Singular Subject (node 45).
 * Idempotent-ish: skips sentences that already exist on the node.
 * Run: npx tsx scripts/seed-node1-quiz.ts
 */
import 'dotenv/config';
import { db } from '../src/db';
import { lessonPages } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const NODE_ID = 45;

const QUESTIONS: Array<{
  sentence: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}> = [
  {
    sentence: 'The shop ______ at 8 pm.',
    options: ['close', 'closes', 'closing', 'closed'],
    answerIndex: 1,
    explanation: 'ประธาน The shop เป็นเอกพจน์บุรุษที่ 3 ใน Present Simple กริยาต้องเติม s/es → closes',
  },
  {
    sentence: 'Luca often ______ funny messages.',
    options: ['send', 'sends', 'sending', 'sent'],
    answerIndex: 1,
    explanation: 'ประธาน Luca เป็นเอกพจน์ กริยาเติม s → sends (sending/sent ไม่ใช่รูป Present Simple ที่ถูกต้อง)',
  },
  {
    sentence: 'My friend ______ this song.',
    options: ['love', 'loves', 'loving', 'loved'],
    answerIndex: 1,
    explanation: 'ประธาน My friend เป็นเอกพจน์ กริยาเติม s → loves',
  },
  {
    sentence: 'Sometimes she ______ a piece of bread to give to the birds.',
    options: ['take', 'takes', 'taking', 'took'],
    answerIndex: 1,
    explanation: 'ประธาน she เป็นเอกพจน์ กริยาเติม s → takes',
  },
  {
    sentence: 'Anna ______ at home on Tuesdays.',
    options: ['stay', 'stays', 'staying', 'stayed'],
    answerIndex: 1,
    explanation: 'ประธาน Anna เป็นเอกพจน์ กริยาเติม s → stays',
  },
  {
    sentence: 'Richard ______ the doctor every year.',
    options: ['see', 'sees', 'seeing', 'saw'],
    answerIndex: 1,
    explanation: 'ประธาน Richard เป็นเอกพจน์ กริยาเติม s → sees',
  },
  {
    sentence: 'Tom ______ to school by bus every morning.',
    options: ['go', 'goes', 'going', 'went'],
    answerIndex: 1,
    explanation: 'ประธาน Tom เป็นเอกพจน์ และ go ลงท้าย o ต้องเติม es → goes',
  },
  {
    sentence: 'The cat ______ on the sofa every afternoon.',
    options: ['sleep', 'sleeps', 'sleeping', 'slept'],
    answerIndex: 1,
    explanation: 'ประธาน The cat เป็นเอกพจน์ กริยาเติม s → sleeps',
  },
  {
    sentence: 'Sarah ______ English every evening.',
    options: ['study', 'studies', 'studying', 'studied'],
    answerIndex: 1,
    explanation: 'ประธาน Sarah เป็นเอกพจน์ และ study เปลี่ยน y เป็น ies → studies',
  },
  {
    sentence: 'He ______ his homework after dinner.',
    options: ['do', 'does', 'doing', 'did'],
    answerIndex: 1,
    explanation: 'ประธาน He เป็นเอกพจน์ ใช้ does (do เติม es)',
  },
];

async function main() {
  const existing = await db
    .select({ id: lessonPages.id, orderIndex: lessonPages.orderIndex, quiz: lessonPages.quiz })
    .from(lessonPages)
    .where(eq(lessonPages.nodeId, NODE_ID));
  const existingSentences = new Set(
    existing.flatMap((r) => {
      const quiz = r.quiz as { sentence?: string; questions?: Array<{ sentence?: string }> } | null;
      return quiz?.questions?.map((q) => q.sentence).filter(Boolean) ?? (quiz?.sentence ? [quiz.sentence] : []);
    })
  );

  // Keep the explain page at orderIndex 0; quizzes start after the max index
  const base = Math.max(0, ...existing.map((r) => r.orderIndex ?? 0)) + 1;

  let seeded = 0;
  for (const [i, q] of QUESTIONS.entries()) {
    if (existingSentences.has(q.sentence)) continue; // already present — skip
    await db.insert(lessonPages).values({
      nodeId: NODE_ID,
      pageType: 'quiz',
      sections: [],
      quiz: q,
      isPublished: true,
      orderIndex: base + i,
    });
    seeded++;
  }

  console.log(`seeded ${seeded} new quiz pages (${QUESTIONS.length - seeded} already existed)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
