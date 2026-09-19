/** Count Real Exam (quiz) questions per unit. Run: npx tsx scripts/count-exam-questions.ts */
import 'dotenv/config';
import { db } from '../src/db';
import { learningUnits, learningNodes, lessonPages } from '../src/db/schema';
import { asc } from 'drizzle-orm';

async function main() {
  const units = await db
    .select()
    .from(learningUnits)
    .orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));
  const nodes = await db.select().from(learningNodes);
  const pages = await db.select().from(lessonPages);

  const questionsByNode = new Map<number, number>();
  for (const p of pages) {
    const quiz = p.quiz as { questions?: unknown[] } | null;
    const qs = Array.isArray(quiz?.questions) ? quiz!.questions!.length : quiz ? 1 : 0;
    if (qs > 0) questionsByNode.set(p.nodeId, (questionsByNode.get(p.nodeId) ?? 0) + qs);
  }

  let total = 0;
  let grandNodes = 0;
  for (const u of units) {
    const unitNodes = nodes.filter((n) => n.unitId === u.id);
    let count = 0;
    const detail: number[] = [];
    for (const n of unitNodes) {
      const c = questionsByNode.get(n.id) ?? 0;
      detail.push(c);
      count += c;
    }
    grandNodes += unitNodes.length;
    total += count;
    console.log(`${u.title} — ${unitNodes.length} nodes, ${count} ข้อสอบ [${detail.join(',')}]`);
  }
  console.log(`\nรวม ${units.length} units, ${grandNodes} nodes, TOTAL = ${total} ข้อสอบ`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
