import { createHmac, timingSafeEqual } from 'node:crypto';

import { aiTutorMasterSwitchEnabled } from './flags';

/**
 * Proof ว่า "ผู้เรียนคนนี้ตอบข้อนี้แล้ว" — ออกจาก /api/tests/check-answer
 * (ตอนกดปุ่ม "ตรวจคำตอบ") แล้วถูกส่งต่อมากับ POST /api/ai-tutor
 *
 * ทำไมต้องมี: check-answer เป็น stateless (ไม่เขียนลง DB) และ user_answers
 * ถูกเขียนตอน "ส่งคำตอบ" ทีหลัง — ตอนนั้นผู้เรียนยังถาม AI ไม่ได้
 * จึงต้องมีหลักฐานฝั่ง server ที่ส่งต่อได้โดยไม่เขียน DB
 *
 * รูปแบบ: base64url(payload) + '.' + hex(HMAC-SHA256(secret, payload))
 *   payload = `${userId}|${questionId}|${selectedAnswer}|${expiresAt}`
 *
 * ความปลอดภัย:
 * - secret แยกเฉพาะ (AI_TUTOR_PROOF_SECRET) ไม่ใช้ NEXTAUTH_SECRET
 * - เทียบลายเซ็นแบบ constant-time (timingSafeEqual)
 * - ผูก userId + questionId + คำตอบ + เวลาหมดอายุ (24 ชม.) ไว้ด้วยกัน
 * - ถ้าไม่ได้ตั้ง secret → ไม่ออก proof และ POST /api/ai-tutor ปฏิเสธ (fail-closed)
 */

export const AI_TUTOR_PROOF_TTL_MS = 24 * 60 * 60 * 1000;

export class AiTutorProofError extends Error {
  constructor(message = 'หลักฐานการตอบคำถามไม่ถูกต้องหรือหมดอายุ') {
    super(message);
  }
}

function proofSecret(): string | null {
  const secret = process.env.AI_TUTOR_PROOF_SECRET?.trim();
  return secret ? secret : null;
}

/**
 * ออก proof ได้หรือไม่ — ดูแค่ env (ไม่แตะ DB เลย)
 *
 * เงื่อนไข 2 ข้อ:
 * 1. master switch ของฟีเจอร์เปิดอยู่ (env AI_TUTOR_ENABLED)
 * 2. มี AI_TUTOR_PROOF_SECRET ตั้งไว้ (ไม่มี = ออก proof ไม่ได้ = fail-closed)
 *
 * ใช้ใน /api/tests/check-answer เพื่อออก proof ให้ผู้เรียนที่ล็อกอินแล้วทุกคน
 * โดยไม่ต้องอ่าน users.ai_tutor_access (สิทธิ์จริงตรวจซ้ำที่ /api/ai-tutor)
 * → เส้นทางตรวจคำตอบไม่ผูกกับตารางของ migration 0045 เลย
 */
export function canIssueAnswerProof(): boolean {
  return aiTutorMasterSwitchEnabled() && proofSecret() !== null;
}

/** payload เข้ารหัส base64url (ไม่มี padding) */
function encodePayload(payload: string): string {
  return Buffer.from(payload, 'utf8').toString('base64url');
}

function decodePayload(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** เทียบสองสตริงแบบ constant-time (คนละความยาว = ไม่ตรง) */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * ออก proof ให้ผู้เรียนที่ผ่านการตรวจคำตอบของข้อนั้นแล้ว
 * @returns proof token หรือ null ถ้าไม่ได้ตั้ง secret (ผู้ใช้อื่นได้ response เดิมทุกประการ)
 */
export function issueAnswerProof(params: {
  userId: string;
  questionId: number;
  selectedAnswer: string;
  now?: number;
}): string | null {
  const secret = proofSecret();
  if (!secret) return null;

  const now = params.now ?? Date.now();
  const expiresAt = now + AI_TUTOR_PROOF_TTL_MS;
  const payload = [
    params.userId,
    String(params.questionId),
    params.selectedAnswer,
    String(expiresAt),
  ].join('|');
  return `${encodePayload(payload)}.${sign(payload, secret)}`;
}

/**
 * ตรวจ proof — ผูกกับ userId + questionId ที่ขอมา ปฏิเสธถ้าหมดอายุ/ไม่ตรง/ปลอม
 * @returns คำตอบที่ผู้เรียนเลือก (มาจาก payload ที่ลงชื่อไว้ — ไม่รับจาก client โดยตรง)
 * @throws AiTutorProofError
 */
export function verifyAnswerProof(params: {
  proof: string;
  userId: string;
  questionId: number;
  now?: number;
}): { selectedAnswer: string } {
  const secret = proofSecret();
  if (!secret) {
    throw new AiTutorProofError('ยังไม่ได้ตั้งค่า AI_TUTOR_PROOF_SECRET');
  }

  const [encodedPayload, signature] = params.proof.split('.');
  if (!encodedPayload || !signature) {
    throw new AiTutorProofError();
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    throw new AiTutorProofError();
  }

  if (!safeEqual(signature, sign(payload, secret))) {
    throw new AiTutorProofError();
  }

  const parts = payload.split('|');
  if (parts.length !== 4) {
    throw new AiTutorProofError();
  }
  const [userId, questionId, selectedAnswer, expiresAt] = parts;
  if (userId !== params.userId) {
    throw new AiTutorProofError();
  }
  if (Number(questionId) !== params.questionId) {
    throw new AiTutorProofError();
  }
  const now = params.now ?? Date.now();
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) <= now) {
    throw new AiTutorProofError('หลักฐานการตอบคำถามหมดอายุ กรุณากด "ตรวจคำตอบ" ใหม่');
  }
  return { selectedAnswer };
}
