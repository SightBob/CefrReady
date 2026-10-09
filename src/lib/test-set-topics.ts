import { expandTestSetSlots, type TestSetQuestionLike, type TestSetSlot } from '@/lib/test-set-slots';

/**
 * ช่วงเรื่อง (topic run) ของชุดข้อสอบหนึ่งชุด
 *
 * ข้อสอบในชุดถูกเรียงตาม `test_set_questions.order_index` แล้วตัดเป็นช่วง ๆ
 * ด้วย `questions.grammar_topic` — ข้อที่ติดกันและมี topic เดียวกัน = เรื่องเดียวกัน
 * พอ topic เปลี่ยน ถือว่าเริ่มเรื่องใหม่ (ใช้เป็นจุดเด้งหน้า intro/explain ของเรื่องนั้น)
 *
 * ข้อที่ไม่ได้ระบุ topic จะรวมกันเป็น run เดียวที่ `topic === ''` และไม่ถูกนำไปหา
 * เนื้อหา explain (normalizeTopic('') === '')
 */
export interface TopicRun {
  /** grammarTopic ที่ trim แล้ว — '' = ข้อสอบส่วนนี้ไม่ระบุเรื่อง */
  topic: string;
  /** index ของ slot แรก/สุดท้ายของเรื่องนี้ใน mainSlots (จาก expandTestSetSlots) */
  firstSlotIndex: number;
  lastSlotIndex: number;
  /** จำนวนข้อสอบ (แถวใน test_set_questions) ไม่ใช่จำนวน slot */
  questionCount: number;
  /** จำนวน slot จริงที่ผู้เรียนต้องตอบ (tap = ต่อ item, บทความ = ต่อช่องว่าง) */
  slotCount: number;
}

/** เทียบ topic แบบ trim เท่านั้น — ตัวพิมพ์ต้องตรงกัน (ตรงกับคีย์ของ test_explains.grammar_topic) */
export function normalizeTopic(topic: string | null | undefined): string {
  return (topic ?? '').trim();
}

/**
 * ตัดชุดข้อสอบที่เรียงแล้วให้เป็นช่วงเรื่องตาม grammarTopic
 * ส่ง `slots` มาด้วยถ้าเรียก expandTestSetSlots ไว้แล้ว เพื่อไม่คำนวณซ้ำ
 */
export function buildTopicRuns<T extends TestSetQuestionLike & { grammarTopic?: string | null }>(
  questions: T[],
  slots?: TestSetSlot[],
): TopicRun[] {
  const resolvedSlots = slots ?? expandTestSetSlots(questions);

  // question index → slot index ทั้งหมดของข้อนั้น (maintains order)
  const slotsByQuestion = new Map<number, number[]>();
  resolvedSlots.forEach((slot, slotIndex) => {
    const list = slotsByQuestion.get(slot.questionIndex);
    if (list) list.push(slotIndex);
    else slotsByQuestion.set(slot.questionIndex, [slotIndex]);
  });

  const runs: TopicRun[] = [];
  questions.forEach((question, questionIndex) => {
    const topic = normalizeTopic(question.grammarTopic);
    const questionSlots = slotsByQuestion.get(questionIndex) ?? [];
    const firstSlotIndex = questionSlots[0] ?? -1;
    const lastSlotIndex = questionSlots[questionSlots.length - 1] ?? -1;

    const current = runs[runs.length - 1];
    if (current && current.topic === topic) {
      current.questionCount += 1;
      current.slotCount += questionSlots.length;
      if (lastSlotIndex >= 0) {
        if (current.firstSlotIndex < 0) current.firstSlotIndex = firstSlotIndex;
        current.lastSlotIndex = lastSlotIndex;
      }
      return;
    }

    runs.push({ topic, firstSlotIndex, lastSlotIndex, questionCount: 1, slotCount: questionSlots.length });
  });

  return runs;
}

/**
 * ชุดนี้ควรมีหน้า /explain ระดับชุด (ภาพรวมเนื้อหาก่อนเข้าสอบ) หรือไม่
 *
 * หน้า /explain แสดงทุกหน้าอธิบายที่แอดมินเลือกผูกไว้กับชุดนี้ เรียงต่อกัน
 * ตามลำดับที่เลือก — เหมาะกับชุดที่รวมหลายเรื่องไว้ด้วยกัน ให้ผู้เรียนเห็นภาพรวม
 * ก่อนเริ่มทำข้อสอบ
 *
 * - มี explain ผูกไว้อย่างน้อย 1 อัน → มีหน้า /explain (แสดงทุกอันต่อกัน)
 * - ไม่มี explain เลย → เข้าสอบได้เลย (หน้า /explain redirect ไปหน้าสอบ)
 */
export function usesSetLevelExplain(explainCount: number, topicRunCount: number): boolean {
  return explainCount >= 1;
}

/**
 * slot แรกของเรื่องนี้ (null = ชุดนี้ไม่มีเรื่องนั้น หรือ topic ว่าง)
 * ใช้เปิดหน้าสอบตรงข้อแรกของเรื่อง เพื่อดูว่าเนื้อหา explain จะแสดงตอนทำข้อสอบอย่างไร
 */
export function firstSlotIndexForTopic(
  runs: TopicRun[],
  topic: string | null | undefined,
): number | null {
  const normalized = normalizeTopic(topic);
  if (!normalized) return null;
  const run = runs.find((item) => item.topic === normalized && item.slotCount > 0);
  return run ? run.firstSlotIndex : null;
}

/** ช่วงเรื่องที่ slot นี้อยู่ (null = ไม่พบ หรือ slot อยู่นอกช่วงที่มีคำถามจริง) */
export function topicRunForSlot(runs: TopicRun[], slotIndex: number): TopicRun | null {
  return (
    runs.find(
      (run) => run.slotCount > 0 && slotIndex >= run.firstSlotIndex && slotIndex <= run.lastSlotIndex,
    ) ?? null
  );
}
