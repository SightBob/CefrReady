import { normalizeTopic } from '@/lib/test-set-topics';

/**
 * การเชื่อมเนื้อหา Explain เข้ากับข้อสอบ
 *
 * เนื้อหา explain หนึ่งอันผูกกับข้อสอบด้วย `grammar_topic` แบบ **เทียบสตริงตรงเป๊ะ**
 * (เหมือนตอนผู้เรียนทำข้อสอบ: `normalizeTopic()` ตัดแค่ช่องว่างหน้า-หลัง) ถ้าเขียนไม่ตรง
 * เนื้อหาจะไม่ถูกเรียกใช้เลยโดยที่แอดมินไม่รู้ตัว — โมดูลนี้จึงเป็นที่เดียวที่ตัดสินว่า
 * "หัวข้อนี้เชื่อมกับข้อสอบได้จริงไหม" ให้ทั้งหน้าแอดมินใช้ร่วมกัน
 */

/** ชุดข้อสอบที่อ้างถึงเรื่องนี้ (แสดงให้แอดมินเห็นว่าเนื้อหาจะถูกใช้ที่ไหน) */
export interface ExplainTopicSetRef {
  id: number;
  name: string;
}

/** ตัวเลือกหัวข้อที่มาจากข้อสอบจริง (คำตอบของ GET /api/admin/test-explains/topics) */
export interface QuestionTopicOption {
  grammarTopic: string;
  questionCount: number;
  testSets: ExplainTopicSetRef[];
}

export type ExplainTopicLink =
  | { state: 'empty'; topic: '' }
  | { state: 'matched'; topic: string; option: QuestionTopicOption }
  | { state: 'unknown'; topic: string };

/** เทียบแบบเดียวกับหน้าสอบเป๊ะ ๆ (trim เท่านั้น — ตัวพิมพ์ต้องตรงกัน) */
export function linkExplainTopic(
  topic: string | null | undefined,
  options: QuestionTopicOption[],
): ExplainTopicLink {
  const normalized = normalizeTopic(topic);
  if (!normalized) return { state: 'empty', topic: '' };
  const option = options.find((item) => normalizeTopic(item.grammarTopic) === normalized);
  return option ? { state: 'matched', topic: normalized, option } : { state: 'unknown', topic: normalized };
}

/**
 * ข้อความเตือนเมื่อยังเผยแพร่ไม่ได้ (null = เผยแพร่ได้)
 * เนื้อหาที่ไม่มีข้อสอบใช้จะไม่ถูกเรียกใช้เลย จึงกันไว้ไม่ให้เผยแพร่โดยไม่ตั้งใจ
 */
export function explainTopicWarning(link: ExplainTopicLink): string | null {
  if (link.state === 'empty') return 'ต้องเลือก grammarTopic ให้ตรงกับข้อสอบก่อนเผยแพร่';
  if (link.state === 'unknown') {
    return `grammarTopic "${link.topic}" ไม่ตรงกับข้อสอบข้อใดเลย — ผู้เรียนจะไม่เห็นเนื้อหานี้ (ต้องมีข้อสอบที่ใช้หัวข้อนี้ก่อน)`;
  }
  return null;
}

/**
 * ตรวจหัวข้อทั้งหมดที่เนื้อหาหนึ่งเชื่อมไว้ (รองรับหลาย grammarTopic)
 * ทุกหัวข้อต้องมีข้อสอบใช้จริง — หัวข้อไหนไม่ตรงจะระบุเป็นรายการในข้อความเตือน
 * (null = เผยแพร่ได้)
 */
export function explainTopicsWarning(topicList: string[], options: QuestionTopicOption[]): string | null {
  const topics = (topicList ?? []).map((topic) => topic.trim()).filter(Boolean);
  if (!topics.length) return explainTopicWarning(linkExplainTopic('', options));
  const unknown = topics.filter((topic) => linkExplainTopic(topic, options).state === 'unknown');
  if (!unknown.length) return null;
  const listed = unknown.map((topic) => `"${topic}"`).join(', ');
  return unknown.length === 1
    ? `grammarTopic ${listed} ไม่ตรงกับข้อสอบข้อใดเลย — ผู้เรียนจะไม่เห็นเนื้อหานี้ (ต้องมีข้อสอบที่ใช้หัวข้อนี้ก่อน)`
    : `grammarTopic ${listed} ไม่ตรงกับข้อสอบข้อใดเลย — ผู้เรียนจะไม่เห็นเนื้อหานี้ (ต้องมีข้อสอบที่ใช้หัวข้อเหล่านี้ก่อน)`;
}

/** ข้อความสรุปใต้ช่องกรอก ให้แอดมินเห็นทันทีว่าเชื่อมกับอะไรอยู่ */
export function explainTopicSummary(link: ExplainTopicLink): string {
  if (link.state === 'empty') return 'เลือกหัวข้อจากรายการที่ดึงมาจากข้อสอบจริง';
  if (link.state === 'unknown') return 'ยังไม่มีข้อสอบข้อใดใช้หัวข้อนี้';
  const { questionCount, testSets } = link.option;
  const setNames = testSets.map((set) => set.name);
  const setsLabel = setNames.length ? `ชุด: ${setNames.join(', ')}` : 'ยังไม่ได้อยู่ในชุดข้อสอบใด';
  return `มีข้อสอบ ${questionCount} ข้อ · ${setsLabel}`;
}

/** สีของข้อความสรุป — เขียวเมื่อเชื่อมติด, เหลืองเมื่อไม่ตรง, เทาเมื่อยังไม่ได้เลือก */
export function explainTopicTone(link: ExplainTopicLink): 'ok' | 'warn' | 'muted' {
  if (link.state === 'matched') return 'ok';
  if (link.state === 'unknown') return 'warn';
  return 'muted';
}

/** สรุปทั้งหมดของหลายหัวข้อ — รวมจำนวนข้อสอบของทุกหัวข้อที่เชื่อมไว้ */
export function explainTopicsSummary(topicList: string[], options: QuestionTopicOption[]): string {
  const topics = (topicList ?? []).map((topic) => topic.trim()).filter(Boolean);
  if (!topics.length) return explainTopicSummary(linkExplainTopic('', options));
  const matched = topics.map((topic) => linkExplainTopic(topic, options));
  const questionCount = matched.reduce((sum, link) => sum + (link.state === 'matched' ? link.option.questionCount : 0), 0);
  const setIds = new Set<string>();
  for (const link of matched) {
    if (link.state === 'matched') for (const set of link.option.testSets) setIds.add(set.name);
  }
  const parts = [`${topics.length} หัวข้อ`];
  if (questionCount) parts.push(`รวมข้อสอบ ${questionCount} ข้อ`);
  if (setIds.size) parts.push(`ชุด: ${[...setIds].join(', ')}`);
  const unknownCount = matched.filter((link) => link.state === 'unknown').length;
  if (unknownCount) parts.push(`⚠ ไม่ตรงข้อสอบ ${unknownCount} หัวข้อ`);
  return parts.join(' · ');
}
