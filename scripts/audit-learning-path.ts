/** Deep audit of learning path data. Run: npx tsx scripts/audit-learning-path.ts */
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

  console.log(`units: ${units.length}, nodes: ${nodes.length}, pages: ${pages.length}\n`);

  for (const u of units) {
    const unitNodes = nodes
      .filter((n) => n.unitId === u.id)
      .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
    console.log(`\n=== ${u.title} (id=${u.id}, order=${u.orderIndex}) — ${unitNodes.length} nodes ===`);
    for (const n of unitNodes) {
      const nodePages = pages
        .filter((p) => p.nodeId === n.id)
        .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
      const parts: string[] = [];
      for (const p of nodePages) {
        if (p.pageType === 'quiz') {
          const quiz = p.quiz as { questions?: unknown[] } | null;
          const qs = Array.isArray(quiz?.questions) ? quiz!.questions!.length : quiz ? 1 : 0;
          parts.push(`quiz:${qs}`);
        } else {
          const secs = p.sections?.length ?? 0;
          const hasTap = p.sections?.some((s) => s.tap?.items?.length) ? 'tap' : '-';
          const hasVocab = p.vocabBank ? 'vocab' : '-';
          const hasIntro = p.intro ? 'intro' : '-';
          parts.push(`explain(sec:${secs},${hasTap},${hasVocab},${hasIntro})`);
        }
      }
      console.log(`  node ${n.id} [${n.title}] → ${parts.join(' | ') || 'NO PAGES'}`);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
