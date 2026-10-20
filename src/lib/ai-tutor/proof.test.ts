import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AI_TUTOR_PROOF_TTL_MS, AiTutorProofError, issueAnswerProof, verifyAnswerProof } from './proof';

const SECRET = 'test-proof-secret';

beforeEach(() => {
  process.env.AI_TUTOR_PROOF_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.AI_TUTOR_PROOF_SECRET;
});

describe('proof — ออก/ตรวจ', () => {
  it('proof ที่ออกเองตรวจผ่าน', () => {
    const proof = issueAnswerProof({ userId: 'u1', questionId: 12, selectedAnswer: 'goes' });
    expect(proof).toBeTruthy();
    expect(() => verifyAnswerProof({ proof: proof!, userId: 'u1', questionId: 12 })).not.toThrow();
  });

  it('ไม่มี proof → ปฏิเสธ', () => {
    expect(() => verifyAnswerProof({ proof: '', userId: 'u1', questionId: 12 })).toThrow(AiTutorProofError);
  });

  it('proof ปลอม (แก้ลายเซ็น) → ปฏิเสธ', () => {
    const proof = issueAnswerProof({ userId: 'u1', questionId: 12, selectedAnswer: 'goes' })!;
    const [payload, signature] = proof.split('.');
    const tampered = `${payload}.${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;
    expect(() => verifyAnswerProof({ proof: tampered, userId: 'u1', questionId: 12 })).toThrow(AiTutorProofError);
  });

  it('proof ของ user อื่น → ปฏิเสธ', () => {
    const proof = issueAnswerProof({ userId: 'u1', questionId: 12, selectedAnswer: 'goes' })!;
    expect(() => verifyAnswerProof({ proof, userId: 'u2', questionId: 12 })).toThrow(AiTutorProofError);
  });

  it('proof ของข้ออื่น → ปฏิเสธ', () => {
    const proof = issueAnswerProof({ userId: 'u1', questionId: 12, selectedAnswer: 'goes' })!;
    expect(() => verifyAnswerProof({ proof, userId: 'u1', questionId: 13 })).toThrow(AiTutorProofError);
  });

  it('proof หมดอายุ → ปฏิเสธ', () => {
    const now = Date.now();
    const proof = issueAnswerProof({ userId: 'u1', questionId: 12, selectedAnswer: 'goes', now })!;
    expect(() => verifyAnswerProof({ proof, userId: 'u1', questionId: 12, now: now + AI_TUTOR_PROOF_TTL_MS + 1 }))
      .toThrow(/หมดอายุ/);
  });

  it('แก้ payload เอง (เปลี่ยน questionId ใน payload) → ลายเซ็นไม่ตรง → ปฏิเสธ', () => {
    const proof = issueAnswerProof({ userId: 'u1', questionId: 12, selectedAnswer: 'goes' })!;
    const [payload, signature] = proof.split('.');
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const forged = Buffer.from(decoded.replace('|12|', '|99|'), 'utf8').toString('base64url');
    expect(() => verifyAnswerProof({ proof: `${forged}.${signature}`, userId: 'u1', questionId: 99 }))
      .toThrow(AiTutorProofError);
  });

  it('ไม่ได้ตั้ง secret → ไม่ออก proof และตรวจไม่ผ่าน (fail-closed)', () => {
    delete process.env.AI_TUTOR_PROOF_SECRET;
    expect(issueAnswerProof({ userId: 'u1', questionId: 12, selectedAnswer: 'goes' })).toBeNull();
    expect(() => verifyAnswerProof({ proof: 'x.y', userId: 'u1', questionId: 12 })).toThrow(AiTutorProofError);
  });
});
