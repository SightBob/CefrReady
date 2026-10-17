import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SKILL_OUTCOME_MESSAGES,
  estimateCefrLevel,
  skillOutcomeMessage,
} from './cefr-estimator';

describe('estimateCefrLevel', () => {
  it('แบ่งช่วงคะแนนตามเดิม (ใช้เป็นค่า fallback ของข้อความให้กำลังใจ)', () => {
    expect(estimateCefrLevel(100)).toBe('C2');
    expect(estimateCefrLevel(90)).toBe('C2');
    expect(estimateCefrLevel(89)).toBe('C1');
    expect(estimateCefrLevel(78)).toBe('C1');
    expect(estimateCefrLevel(77)).toBe('B2');
    expect(estimateCefrLevel(65)).toBe('B2');
    expect(estimateCefrLevel(64)).toBe('B1');
    expect(estimateCefrLevel(52)).toBe('B1');
    expect(estimateCefrLevel(51)).toBe('A2');
    expect(estimateCefrLevel(38)).toBe('A2');
    expect(estimateCefrLevel(37)).toBe('A1');
    expect(estimateCefrLevel(0)).toBe('A1');
  });

  // ช่วงที่ local copy ใน admin/reports เคยให้ผลต่างออกไป
  // (local ใช้ A2≥40 / B1≥60 / B2≥70 / C1≥80)
  it('ช่วงที่เคยขัดกันระหว่างกราฟกับตารางในหน้า admin reports', () => {
    // local ให้ A2 — lib ให้ B1
    expect(estimateCefrLevel(55)).toBe('B1');
    expect(estimateCefrLevel(59)).toBe('B1');
    // local ให้ B1 — lib ให้ B2
    expect(estimateCefrLevel(65)).toBe('B2');
    expect(estimateCefrLevel(69)).toBe('B2');
    // local ให้ B2 — lib ให้ C1
    expect(estimateCefrLevel(78)).toBe('C1');
    expect(estimateCefrLevel(79)).toBe('C1');
    // local ให้ A1 — lib ให้ A2
    expect(estimateCefrLevel(38)).toBe('A2');
    expect(estimateCefrLevel(39)).toBe('A2');
    expect(estimateCefrLevel(40)).toBe('A2');
  });

  it('หน้า admin/reports ต้องไม่มี local copy ของ threshold แล้ว', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/admin/reports/page.tsx'),
      'utf8'
    );
    // ถ้ามี local copy กลับมา ตัวเลขบนกราฟจะขัดกับตารางอีก
    expect(src).not.toMatch(/function estimateCefrLevel/);
    expect(src).toContain("from '@/lib/cefr-estimator'");
  });
});

describe('skillOutcomeMessage (การ์ดคะแนน Figma 75:70702)', () => {
  it('ระดับบนสุดใช้ข้อความที่ตกลงกันใหม่ (รอดีไซน์ยืนยัน)', () => {
    expect(skillOutcomeMessage('C2', 100)).toBe('และคุณทำได้ในระดับสูงมาก');
    expect(SKILL_OUTCOME_MESSAGES.C2).toBe('และคุณทำได้ในระดับสูงมาก');
  });

  it('คะแนนน้อยต้องไม่ได้ข้อความ "สูงมาก" อีก (บั๊กเดิม: ทุกคะแนนขึ้นเหมือนกันหมด)', () => {
    for (const percentage of [0, 20, 37, 45, 60, 70, 80]) {
      expect(skillOutcomeMessage(null, percentage)).not.toContain('สูงมาก');
    }
    expect(skillOutcomeMessage('A1', 10)).not.toContain('สูงมาก');
  });

  it('ไม่มีข้อความไหนฝังชื่อวิชา "ความหมาย" (บั๊กเดิม: สอบฟังแต่ข้อความบอกว่าความหมายดี)', () => {
    for (const message of Object.values(SKILL_OUTCOME_MESSAGES)) {
      expect(message).not.toContain('ความหมาย');
    }
  });

  it('ทุกข้อความขึ้นต้นด้วย "และ" เพื่อต่อท้ายป้ายทักษะของบรรทัดแรกได้ทุกแบบ', () => {
    for (const message of Object.values(SKILL_OUTCOME_MESSAGES)) {
      expect(message.startsWith('และ')).toBe(true);
    }
  });

  it('ทุกข้อความยาวพอ ๆ กับข้อความเดิม (ไม่เกิน 50 ตัวอักษร) การ์ดคะแนนจะได้ไม่สูงขึ้น', () => {
    const original = 'และความหมายของคุณอยู่ในเกณฑ์สูงมาก';
    for (const message of Object.values(SKILL_OUTCOME_MESSAGES)) {
      expect(message.length).toBeLessThanOrEqual(50);
      expect(Math.abs(message.length - original.length)).toBeLessThanOrEqual(16);
    }
  });

  it('ใช้ระดับที่ส่งมาเป็นตัวตัดสินหลัก (Full Test ส่งค่าระดับจาก server)', () => {
    // percentage สูง แต่ระดับที่ส่งมาเป็น B1 → ต้องใช้ข้อความของ B1
    expect(skillOutcomeMessage('B1', 100)).toBe(SKILL_OUTCOME_MESSAGES.B1);
    // ตัวพิมพ์เล็ก/มีช่องว่าง ก็ต้องรู้จัก
    expect(skillOutcomeMessage(' b2 ', 0)).toBe(SKILL_OUTCOME_MESSAGES.B2);
  });

  it('ไม่ส่งระดับ หรือส่งค่าที่ไม่รู้จัก → ประมาณจาก percentage เหมือนการ์ดคะแนน', () => {
    expect(skillOutcomeMessage(null, 95)).toBe(SKILL_OUTCOME_MESSAGES.C2);
    expect(skillOutcomeMessage(undefined, 80)).toBe(SKILL_OUTCOME_MESSAGES.C1);
    expect(skillOutcomeMessage('', 30)).toBe(SKILL_OUTCOME_MESSAGES.A1);
    expect(skillOutcomeMessage('unknown', 60)).toBe(SKILL_OUTCOME_MESSAGES.B1);
    expect(skillOutcomeMessage(null, 70)).toBe(SKILL_OUTCOME_MESSAGES.B2);
  });
});
