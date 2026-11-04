import { describe, expect, it } from 'vitest';
import { estimateCefrLevel, resolveCefrLevel } from './cefr-estimator';

describe('resolveCefrLevel', () => {
  it('ใช้ระดับที่ server คำนวณไว้ แม้เปอร์เซ็นต์จะตกคนละช่วง', () => {
    // เคสจริงจาก production: Full Test ได้ 36/120 (ช่วง A2) แต่เปอร์เซ็นต์คำตอบ 24.44%
    // ตกช่วง A1 ของตารางเปอร์เซ็นต์ → ต้องเชื่อระดับจาก server เพื่อให้ตรงหน้าผลสอบ
    expect(estimateCefrLevel(24.44)).toBe('A1');
    expect(resolveCefrLevel('A2', 24.44)).toBe('A2');
  });

  it('ประมาณจากเปอร์เซ็นต์เมื่อไม่มีระดับจาก server', () => {
    expect(resolveCefrLevel(null, 24.44)).toBe('A1');
    expect(resolveCefrLevel(undefined, 70)).toBe('B2');
  });

  it('ไม่สนใจค่าที่ไม่รู้จัก/ตัวพิมพ์ผิด', () => {
    expect(resolveCefrLevel('Z9', 80)).toBe('C1'); // 80% ≥ 78 → C1 ตามตารางเปอร์เซ็นต์
    expect(resolveCefrLevel(' a2 ', 0)).toBe('A2');
  });
});
