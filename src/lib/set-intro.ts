/**
 * เรื่อง (grammar topic) ที่มี "เนื้อหาอธิบาย" ผูกอยู่กับชุดข้อสอบ — ใช้ตัดสินว่า
 * หน้าข้อสอบควรพาผู้เรียนไปหน้า /explain ของชุดก่อนหรือไม่
 * (src/app/tests/[sectionId]/[setId]/page.tsx)
 *
 * กติกา (ผู้ใช้กำหนด 2026-10-25): **เข้าชุดครั้งแรก** (ยังไม่มีความคืบหน้าในเครื่อง)
 * → เด้งไปหน้า /explain ของชุดนั้นเลย ไม่ใช่ overlay ทับหน้าสอบ และไม่ใช่คิวทีละ
 * เรื่อง (ของเดิมใส่ทุกเรื่องลงคิว ปิดอันหนึ่งแล้วเด้งอันถัดไปซ้อนกันหลายอัน)
 * ส่วนการ **refresh** อยู่ที่ข้อเดิมเสมอ เพราะตำแหน่งข้อถูกจำไว้ (test-progress)
 *
 * เรื่องที่ไม่มีเนื้อหาอธิบาย ถูกข้าม · เรื่องซ้ำนับครั้งเดียว (เรียงตามลำดับข้อสอบ)
 */
export function topicsWithExplain<T>(
  runs: ReadonlyArray<{ topic?: string | null }>,
  explains: Readonly<Record<string, T>>,
): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];

  for (const run of runs) {
    const topic = run.topic?.trim();
    if (!topic || seen.has(topic)) continue;
    if (explains[topic] === undefined) continue;
    seen.add(topic);
    topics.push(topic);
  }

  return topics;
}
