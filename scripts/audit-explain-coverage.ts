/**
 * ตรวจว่าเนื้อหาที่แสดงในหน้า /explain ครอบคลุมข้อสอบทุกข้อในชุดนั้นหรือไม่
 *
 * วิธีเดียวกับที่หน้า /tests/[setId]/explain ใช้จริง:
 *   - fetchExplainsForSet(setId) → explain ที่ published และผูกกับชุด
 *   - explainsByTopic(...)       → map เอาไว้เด้งตอนขึ้นเรื่องใหม่
 *   - ข้อสอบที่ grammar_topic ไม่มีใน map = ผู้เรียนไม่เห็นคำอธิบาย
 */
import 'dotenv/config';
import { db } from '../src/db';
import { sql, inArray } from 'drizzle-orm';
import { questions, testSetQuestions, testSets } from '../src/db/schema';
import { fetchExplainsForSet } from '../src/lib/test-explains';
import { explainsByTopic } from '../src/lib/test-explains';
import { explainCoverage } from '../src/lib/explain-coverage';
import { normalizeLessonSections } from '../src/lib/lesson-sections';
import type { LessonSection } from '../src/lib/lesson-sections';

async function run() {
  const sets = await db
    .select({ id: testSets.id, name: testSets.name, sectionId: testSets.sectionId })
    .from(testSets)
    .orderBy(testSets.orderIndex, testSets.id);

  const rows: any[] = [];
  const gaps: string[] = [];

  for (const set of sets) {
    const qs = await db
      .select({
        id: questions.id,
        topic: sql<string>`TRIM(${questions.grammarTopic})`,
        sub: questions.subTopicGrammar,
      })
      .from(testSetQuestions)
      .innerJoin(questions, sql`${testSetQuestions.questionId} = ${questions.id}`)
      .where(sql`${testSetQuestions.testSetId} = ${set.id}`)
      .orderBy(testSetQuestions.orderIndex);

    const total = qs.length;
    const blankTopic = qs.filter((q) => !q.topic);
    const topicNames = [...new Set(qs.map((q) => q.topic))];

    const explains = await fetchExplainsForSet(set.id);
    const byTopic = explainsByTopic(explains);
    const missing = topicNames.filter((t) => !blankTopic.some((b) => b.topic === t) && !byTopic[t]);
    const missingCount = qs.filter((q) => q.topic && !byTopic[q.topic]).length;

    // coverage ภายในแต่ละ explain ที่ผูกกับชุดนี้
    const covParts: string[] = [];
    for (const e of explains) {
      const secs = normalizeLessonSections((e.sections ?? []) as LessonSection[]);
      const eTopics = e.grammarTopics?.length ? e.grammarTopics : [e.grammarTopic];
      const eqs = qs.filter((q) => eTopics.includes(q.topic));
      if (!eqs.length) continue;
      const cov = explainCoverage(
        eqs.map((q) => ({ id: q.id, questionText: '', subTopicGrammar: q.sub })),
        secs,
      );
      covParts.push(
        `#${e.id} ${cov.state} ${cov.covered}/${cov.total}` +
          (cov.untagged ? ` (ไม่ระบุหัวข้อย่อย ${cov.untagged})` : ''),
      );
    }

    rows.push({
      set: `#${set.id} ${set.name}`,
      section: set.sectionId,
      questions: total,
      explains: explains.length,
      coveredByTopic: total - missingCount - blankTopic.length,
      noExplain: missingCount,
      blankTopic: blankTopic.length,
      coverage: covParts.join(' · ') || '—',
    });

    if (missingCount || blankTopic.length) {
      gaps.push(
        `${set.name} (#${set.id})` +
          (missing.length ? `\n    ไม่มี explain: ${missing.map((m) => `"${m}"`).join(', ')}` : '') +
          (blankTopic.length ? `\n    ข้อสอบไม่มี grammar_topic: ${blankTopic.length} ข้อ (${blankTopic.map((b) => '#' + b.id).join(', ')})` : ''),
      );
    }
  }

  console.table(rows);

  console.log('\n================ ชุดที่มีช่องว่าง ================');
  if (!gaps.length) console.log('  ไม่มีช่องว่าง — ทุกชุดผูก explain ครบตาม grammar_topic');
  else gaps.forEach((g) => console.log('  ' + g));

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });