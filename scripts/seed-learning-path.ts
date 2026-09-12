/**
 * Seed learning-path tables (learning_units, learning_nodes, lesson_pages)
 * from the current mock data files. Idempotent: wipes and re-inserts.
 *
 * Run: npx tsx scripts/seed-learning-path.ts
 */
import 'dotenv/config';
import { db } from '../src/db';
import { learningUnits, learningNodes, lessonPages } from '../src/db/schema';
import { UNITS } from '../src/content/units-path-data';
import { LESSONS } from '../src/content/units-path-lessons';

async function main() {
  console.log('Seeding learning path…');

  // Clean slate (cascades to nodes and pages)
  await db.delete(learningUnits);

  for (const unit of UNITS) {
    const [unitRow] = await db
      .insert(learningUnits)
      .values({
        title: unit.title,
        subtitle: unit.subtitle,
        colorKey: unit.colorKey,
        orderIndex: unit.id - 1,
        isPublished: true,
      })
      .returning();

    for (let i = 0; i < unit.nodes.length; i++) {
      const node = unit.nodes[i];
      const [nodeRow] = await db
        .insert(learningNodes)
        .values({
          unitId: unitRow.id,
          title: node.title,
          kind: node.kind,
          orderIndex: i,
          isPublished: true,
        })
        .returning();

      const lesson = LESSONS[node.id];
      if (!lesson) continue;

      // Page 1: explanation (all sections), carrying the vocab bank + tip
      await db.insert(lessonPages).values({
        nodeId: nodeRow.id,
        pageType: 'explain',
        sections: lesson.sections.map((s) => ({
          heading: s.heading,
          body: s.body,
          examples: s.examples,
        })),
        vocabBank: lesson.vocabBank ?? null,
        tip: lesson.tip ?? null,
        orderIndex: 0,
      });

      // Pages 2+: one page per quiz question (if the lesson has any)
      if (lesson.quiz) {
        for (const [qi, question] of lesson.quiz.questions.entries()) {
          await db.insert(lessonPages).values({
            nodeId: nodeRow.id,
            pageType: 'quiz',
            sections: [],
            quiz: question,
            orderIndex: 1 + qi,
          });
        }
      }
    }
  }

  const unitCount = await db.$count(learningUnits);
  const nodeCount = await db.$count(learningNodes);
  const pageCount = await db.$count(lessonPages);
  console.log(`Done: ${unitCount} units, ${nodeCount} nodes, ${pageCount} pages.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
