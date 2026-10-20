'use client';

// ─── กรอบ AI Tutor (Figma 580:27960–28021) ───────────────────────────────────
// แยกจาก FocusFormTutorMock เพื่อวางในหน้าข้อสอบจริงเมื่อ feature flag เปิด
// (isAiTutorEnabled → /api/tests/ai-tutor-access) และ mock ที่ /dev/tutor-mock
// ก็ใช้ตัวเดียวกัน เพื่อให้ "ตรง Figma ทุกพิกเซล" ยังคงเป็นความจริงข้อเดียว
//
// ค่า design มาจาก get_metadata / get_design_context(forceCode) ของโหนดที่กำกับ — ห้ามเดา
// ไอคอนเป็น asset ดาวน์โหลดจาก Figma MCP ใน public/tests/tutor-mock/
//
// RESPONSIVE (ผู้ใช้กำหนด 2026-10-20):
// - ≥890px ยึดเรขาคณิตตาม Figma เดิมทุกพิกเซล (788/742/737/379/46/65)
// - <890px ยืดหยุ่น: กรอบเต็มความกว้าง (w-full + max-w-788) ความสูงแชทเป็น
//   clamp(220px, 38vh, 379px) ช่องพิมพ์ไม่กินความกว้าง และเธรดเลื่อนไปข้อความล่าสุดเอง
//
// โหมดสด (มี questionId): แชทจริงกับ /api/ai-tutor — เธรดมาจาก server เท่านั้น
// โหมด mock (ไม่มี questionId): เนื้อหา demo ตามแบบ Figma เดิมทุกพิกเซล
import { useCallback, useEffect, useRef, useState } from 'react';

import ExplanationText from './ExplanationText';
import RichText from './RichText';

const ASSET = '/tests/tutor-mock';

type Quota = { used: number; limit: number; remaining: number };

type ChatEntry = {
  key: string;
  role: 'ai' | 'user';
  content: string;
  /** เลขข้อความใน DB (ข้อความจากโมเดล) — ใช้กด 👍/👎 */
  id?: number;
  /** เลขข้อถามของผู้เรียน (1, 2, 3 …) */
  index?: number;
  /** ความเห็นที่ผู้เรียนกดไว้แล้ว */
  feedback?: 'up' | 'down' | null;
};

// ข้อความ AI แรก เป๊ะตาม Figma 580:27983 — คำกริยาระบุตัวหนา + ขีดเส้นใต้ 18px
function AiSummaryBubble() {
  return (
    <div className="flex w-full items-start gap-[10px]">
      {/* avatar (580:27978) ชิดซ้าย */}
      <div className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] bg-[#c8e6ff]">
        <img src={`${ASSET}/sparkle.svg`} alt="" className="size-[15.8px]" />
      </div>
      {/* ก้อนข้อความ (580:27981-27982) — กว้างเต็ม 709 (ว่างในแถว 742 ลบ avatar+gap) */}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px]">
        <div className="flex w-full rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] font-medium leading-[25px] text-[#334155]">
          {/* กว้างเนื้อความ 578 ตามแบบ — ย่ออัตโนมัติเมื่อจอแคบ */}
          <div className="w-full max-w-[578px] whitespace-pre-wrap">
            <p>
              จากโจทย์: What{' '}
              <span className="font-bold text-[18px] underline [text-underline-position:from-font]">do</span>
              {' '}they usually{' '}
              <span className="font-bold text-[18px] underline [text-underline-position:from-font]">do</span>
              ...
            </p>
            <p>
              ให้สังเกตว่า พอตัวแรกคือ do&nbsp;&nbsp;ตัวที่สองในช่องว่างก็จะเป็น do (กริยาช่อง 1 ทันที
              ตามหลักการเลย){' '}
              <span className="font-semibold">
                เพราะ หลัง [do/does/did] ต้องตามด้วยกริยาช่อง 1&nbsp;&nbsp;เสมอ
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center px-[10px]">
          <p className="w-full max-w-[531px] text-[12px] leading-[19px] text-[#536176]">AI Mentor • สรุปสูตร</p>
        </div>
      </div>
    </div>
  );
}

// ก้อนแชทฝั่งผู้เรียน (580:27986–27990)
function UserAnswerBubble() {
  return (
    <div className="flex w-full max-w-[361px] flex-col items-end gap-[8px]">
      <div className="flex h-auto min-h-[52px] w-full items-center justify-end overflow-clip rounded-[18px] bg-[#c8e6ff] pl-[19px] pr-[16px] min-[890px]:h-[52px]">
        <p className="text-right text-[14px] leading-[22px] font-medium whitespace-normal text-[#0d6d97] min-[890px]:whitespace-nowrap">
          พิมพ์คำถามต่อในเธรดนี้ (เช่น ขอตัวอย่างโจทย์คล้ายกัน)...
        </p>
      </div>
      <div className="flex w-full items-center justify-end px-[10px]">
        <p className="text-[12px] leading-[19px] text-[#536176]">คำถาม 1</p>
      </div>
    </div>
  );
}

// บล็อกตอบของ AI: แถว w-full (742) = avatar + ก้อน 709 (580:27976-27977)
function AiTurn() {
  return <AiSummaryBubble />;
}

/**
 * บทสนทนาแรกโหมดหน้าจริง — คำอธิบายของข้อ (ผู้ใช้กำหนด 2026-10-19: ย้ายคำอธิบาย
 * จากบล็อก "แวะอ่านสักนิด" มาเป็นข้อความ AI แรก) รูปแบบก้อน/อวตาร/ป้ายคงสไตล์
 * ตามแบบ Figma 580:27978-27990 เป๊ะ ต่างแค่เนื้อความเป็นของจริงจากฐานข้อมูล
 */
function AiIntroTurn({ message }: { message: string }) {
  return (
    <div className="flex w-full items-start gap-[10px]">
      {/* avatar (580:27978) ชิดซ้าย */}
      <div className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] bg-[#c8e6ff]">
        <img src={`${ASSET}/sparkle.svg`} alt="" className="size-[15.8px]" />
      </div>
      {/* ก้อนข้อความ (580:27981-27982) — กันล้นด้วย min-w-0 แทนกว้าง 709 คงที่ */}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px]">
        <div className="flex w-full rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] font-medium leading-[25px] text-[#334155]">
          <div className="w-full max-w-[578px] whitespace-pre-wrap">
            <ExplanationText text={message} className="w-full" />
          </div>
        </div>
        <div className="flex items-center justify-center px-[10px]">
          <p className="w-full max-w-[531px] text-[12px] leading-[19px] text-[#536176]">AI Mentor • คำอธิบาย</p>
        </div>
      </div>
    </div>
  );
}

/** ก้อนข้อความ AI สด (ตอบจากโมเดล) — รูปแบบเดียวกับตามแบบ */
function AiLiveBubble({ text }: { text: string }) {
  return (
    <div className="flex w-full items-start gap-[10px]">
      <div className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] bg-[#c8e6ff]">
        <img src={`${ASSET}/sparkle.svg`} alt="" className="size-[15.8px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px]">
        <div className="flex w-full rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] font-medium leading-[25px] text-[#334155]">
          {/* โมเดลตอบ markdown (**ตัวหนา**) — เรนเดอร์ผ่าน RichText เหมือนคำอธิบาย */}
          <div className="w-full max-w-[578px] whitespace-pre-wrap">
            <RichText text={text} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** ก้อนข้อความผู้เรียนสด (ขวา) พร้อมป้าย "คำถาม N" */
function UserLiveBubble({ text, index }: { text: string; index: number }) {
  return (
    <div className="flex w-full max-w-[361px] flex-col items-end gap-[8px]">
      <div className="flex h-auto min-h-[52px] w-full items-center justify-end overflow-clip rounded-[18px] bg-[#c8e6ff] pl-[19px] pr-[16px]">
        <p className="text-right text-[14px] leading-[22px] font-medium whitespace-pre-wrap text-[#0d6d97]">{text}</p>
      </div>
      <div className="flex w-full items-center justify-end px-[10px]">
        <p className="text-[12px] leading-[19px] text-[#536176]">คำถาม {index}</p>
      </div>
    </div>
  );
}

/** ตัวบอกว่า AI กำลังพิมพ์ */
function TypingIndicator() {
  return (
    <div className="flex w-full items-start gap-[10px]">
      <div className="flex size-[23px] shrink-0 items-center justify-center rounded-[6px] bg-[#c8e6ff]">
        <img src={`${ASSET}/sparkle.svg`} alt="" className="size-[15.8px]" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-[6px] rounded-[15px] bg-[#fafafa] px-[12px] py-[10px] text-[14px] leading-[25px] text-[#64748b]">
        <span className="inline-block size-[6px] animate-pulse rounded-full bg-[#94a3b8]" />
        <span className="inline-block size-[6px] animate-pulse rounded-full bg-[#94a3b8] [animation-delay:150ms]" />
        <span className="inline-block size-[6px] animate-pulse rounded-full bg-[#94a3b8] [animation-delay:300ms]" />
        <span className="sr-only">AI กำลังพิมพ์คำตอบ</span>
      </div>
    </div>
  );
}

interface AiTutorPanelProps {
  /** คำอธิบายของข้อนี้ — ให้แทนเนื้อหาแชท demo ตามแบบ Figma
   *  (ใช้ในหน้าสอบจริงเป็นบทสนทนาแรก) ไม่ส่ง = โหมด mock คงเนื้อหาตามแบบ Figma */
  introMessage?: string | null;
  /** รหัสข้อ — ใช้แยกสถานะเธรด/ตัวนับของแต่ละข้อ เปลี่ยนข้อแล้วเริ่มเธรดใหม่ */
  threadKey?: string | number;
  /** โหมดหน้าจริง: แสดงป้าย "ทดลองใช้ (Beta)" + ข้อความกันเหตุ (หน้า mock ไม่แสดง) */
  showBetaLabels?: boolean;
  /** มีค่า = โหมดสด (คุยกับ /api/ai-tutor) · ไม่มี = โหมด mock ตามแบบ Figma */
  questionId?: number | null;
  /** หลักฐานจาก check-answer — ใช้ยืนยันว่าผู้เรียนตอบข้อนี้แล้ว */
  answerProof?: string | null;
}

export default function AiTutorPanel({
  introMessage,
  threadKey,
  showBetaLabels = false,
  questionId = null,
  answerProof = null,
}: AiTutorPanelProps = {}) {
  const isLive = questionId !== null;
  const [chatInput, setChatInput] = useState('');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // สถานะแยกต่อข้อ: เปลี่ยนข้อ → ล้างช่องพิมพ์/เธรดของข้อเดิม (ตัวนับคำถามจะผูกกับ
  // threadKey เดียวกันตอนต่อ AI จริง) ไม่ให้สถานะข้อก่อนหน้าปนกับข้อใหม่
  useEffect(() => {
    setChatInput('');
    if (inputRef.current) inputRef.current.value = '';
    setEntries([]);
    setStreamingText('');
    setError(null);
    setRetryMessage(null);
    setQuotaExhausted(false);
  }, [threadKey]);

  // ดึงเธรดเดิม + โควตาจาก server (ไม่ต้องใช้ proof — เป็นข้อมูลของผู้เรียนเอง)
  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    fetch(`/api/ai-tutor?questionId=${questionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { messages?: Array<{ id: number; role: 'user' | 'assistant'; content: string; status?: string }>; quota?: Quota } | null) => {
        if (cancelled || !body) return;
        let userIndex = 0;
        const restored: ChatEntry[] = (body.messages ?? [])
          // แถวที่ล้มเหลว (ไม่มีคำตอบ) ไม่ต้องโผล่ในเธรด — โควตาถูกคืนไปแล้ว
          .filter((message) => message.status !== 'failed')
          .map((message) => {
          if (message.role === 'user') {
            userIndex += 1;
            return { key: `db-${message.id}`, role: 'user' as const, content: message.content, index: userIndex };
          }
          return {
            key: `db-${message.id}`,
            role: 'ai' as const,
            content: message.content,
            id: message.id,
            feedback: (message as { feedback?: 'up' | 'down' | null }).feedback ?? null,
          };
        });
        setEntries(restored);
        if (body.quota) setQuota(body.quota);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isLive, questionId, threadKey]);

  // เธรดเลื่อนไปข้อความล่าสุดอัตโนมัติทุกครั้งที่มีข้อความใหม่
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, streamingText]);

  const send = useCallback(async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || !isLive || sending) return;
    if (!answerProof) {
      setError('ยังไม่ได้กด "ตรวจคำตอบ" ของข้อนี้ — กรุณากดตรวจคำตอบก่อนถาม AI');
      return;
    }
    if (quotaExhausted) return;

    setSending(true);
    setError(null);
    setRetryMessage(null);
    setStreamingText('');
    setEntries((current) => [...current, {
      key: `local-${Date.now()}`,
      role: 'user',
      content: message,
      index: current.filter((entry) => entry.role === 'user').length + 1,
    }]);

    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, message, proof: answerProof }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        const text = typeof body?.error === 'string' ? body.error : 'ถาม AI ไม่สำเร็จ กรุณาลองใหม่';
        if (response.status === 429) {
          setQuotaExhausted(true);
          if (body?.quota) setQuota(body.quota);
        }
        setError(text);
        setRetryMessage(message);
        setSending(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';

      const handleEvent = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;
        const payload = trimmed.slice(5).trim();
        if (!payload) return;
        try {
          const event = JSON.parse(payload) as {
            type: 'delta' | 'done' | 'error';
            text?: string;
            error?: string;
            quota?: Quota;
            messageId?: number;
          };
          if (event.type === 'delta' && typeof event.text === 'string') {
            answer += event.text;
            setStreamingText(answer);
          } else if (event.type === 'done') {
            if (event.quota) setQuota(event.quota);
            // ใช้ฉบับสุดท้ายจาก server (อาจถูกตัดที่ประโยคสมบูรณ์) ให้ตรงกับที่บันทึกลง DB
            const finalText = typeof event.text === 'string' ? event.text : answer;
            if (finalText) {
              setEntries((current) => [...current, {
                key: `ai-${event.messageId ?? Date.now()}`,
                role: 'ai',
                content: finalText,
                id: event.messageId,
                feedback: null,
              }]);
            }
            setStreamingText('');
          } else if (event.type === 'error') {
            if (answer) {
              setEntries((current) => [...current, { key: `ai-${Date.now()}`, role: 'ai', content: answer }]);
            }
            setStreamingText('');
            setError(event.error ?? 'AI ตอบไม่สำเร็จ กรุณาลองใหม่');
            setRetryMessage(message);
          }
        } catch {
          // ข้าม event ที่อ่านไม่ได้
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) handleEvent(line);
      }
      if (buffer) handleEvent(buffer);
    } catch {
      setError('เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองใหม่');
      setRetryMessage(message);
    } finally {
      setSending(false);
    }
  }, [answerProof, isLive, questionId, quotaExhausted, sending]);

  /**
   * ส่งจากช่องพิมพ์ — อ่านค่าจาก DOM (ช่องพิมพ์เป็น uncontrolled) แล้วล้างช่องทันที
   * กันข้อความที่เพิ่งพิมพ์หายเมื่อมีการอัปเดตสถานะพร้อมกัน
   */
  const sendFromInput = useCallback(() => {
    const raw = inputRef.current?.value ?? '';
    const value = raw.trim() ? raw : chatInput;
    if (inputRef.current) inputRef.current.value = '';
    setChatInput('');
    void send(value);
  }, [chatInput, send]);

  /** กด 👍/👎 ต่อคำตอบของโมเดล (เก็บไว้ให้วิเคราะห์) */
  const sendFeedback = useCallback(async (messageId: number, value: 'up' | 'down') => {
    try {
      const response = await fetch('/api/ai-tutor/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, value }),
      });
      if (!response.ok) return;
      setEntries((current) => current.map((entry) => (
        entry.id === messageId
          ? { ...entry, feedback: entry.feedback === value ? null : value }
          : entry
      )));
    } catch {
      // กดไม่สำเร็จ — ไม่ต้องรบกวนผู้เรียน
    }
  }, []);

  const handleReset = useCallback(async () => {
    if (!isLive) return;
    setError(null);
    setRetryMessage(null);
    setStreamingText('');
    try {
      const response = await fetch('/api/ai-tutor/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      const body = await response.json().catch(() => null);
      if (body?.quota) setQuota(body.quota);
      setEntries([]);
    } catch {
      setError('เริ่มคำถามใหม่ไม่สำเร็จ กรุณาลองใหม่');
    }
  }, [isLive, questionId]);

  const quotaText = quota
    ? `ถามแล้ว ${quota.used} คำถาม`
    : 'ถามแล้ว 0 คำถาม';

  return (
    <div
      className="relative w-full max-w-[788px] shrink-0 rounded-[15px] border border-[#e9cd62] bg-[#fffffd] px-[14px] pt-[11px] pb-[16px] min-[890px]:h-[573px] min-[890px]:px-[22px] min-[890px]:pb-[22px]"
      aria-label="AI Tutor"
    >
      {/* content frame 580:27962 อยู่ที่ (23,12) w742 — padding ของกรอบทำให้ได้ 742 เป๊ะ */}
      <div className="flex w-full flex-col gap-[14px]">
        {/* header (580:27963) 737×46: identity flex-1 + actions ชิดขวาสุดของ 737
            จอแคบ (<890px) ให้ส่วนหัวสูงตามเนื้อหา เพื่อไม่ให้ข้อความกันเหตุถูกตัด */}
        <div className="flex h-auto min-h-[46px] w-full max-w-[737px] shrink-0 items-start gap-[9px] overflow-clip pt-[2px] min-[890px]:h-[46px]">
          <div className="flex min-w-px flex-1 flex-col overflow-clip">
            <div className="flex items-center gap-[6px]">
              <p className="text-[18px] whitespace-nowrap font-bold leading-[24px] text-[#334155]">โหมด AI</p>
              {showBetaLabels && (
                <span className="shrink-0 rounded-full bg-[#f6ecc4] px-[7px] py-[1px] text-[10px] leading-[14px] font-semibold whitespace-nowrap text-[#6d5b16]">
                  ทดลองใช้ (Beta)
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[2px]">
              <p className="text-[12px] whitespace-nowrap font-semibold leading-[15px] text-[#081425]">
                {quotaText} <span className="text-[#6d5b16]">(เหลือโควตา {quota ? quota.remaining : 5} ครั้ง)</span>
              </p>
              {showBetaLabels && (
                <p className="ml-auto shrink-0 text-[11px] leading-[15px] whitespace-nowrap text-[#8a7a4e]">
                  AI อาจตอบผิดได้
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-[22px] pt-[8px]">
            {isLive ? (
              <button
                type="button"
                onClick={handleReset}
                aria-label="เริ่มคำถามใหม่"
                className="shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-50"
                disabled={sending}
              >
                <img src={`${ASSET}/rotate-cw.svg`} alt="" className="size-[15px]" />
              </button>
            ) : (
              <img src={`${ASSET}/rotate-cw.svg`} alt="รีเฟรช" className="size-[15px]" />
            )}
            <img src={`${ASSET}/maximize-2.svg`} alt="ขยาย" className="size-[15px]" />
          </div>
        </div>
        {/* เส้นแบ่ง (580:27973) */}
        <img src={`${ASSET}/line.svg`} alt="" className="w-full shrink-0" />
        {/* Frame 915 (580:27974) 462.5px: แชท 379 + footer 83.5 ติดกัน (ไม่มี gap) */}
        <div className="w-full shrink-0">
          {/* แชทเลื่อนได้ (580:27975) h-379 — มือถือใช้ clamp ตามความสูงจอ */}
          <div
            ref={chatRef}
            className="flex h-[clamp(220px,38vh,379px)] w-full shrink-0 flex-col items-end gap-[12px] overflow-x-clip overflow-y-auto [scrollbar-width:none] min-[890px]:h-[379px]"
          >
            {isLive ? (
              <>
                {introMessage && <AiIntroTurn message={introMessage} />}
                {entries.map((entry) => (
                  entry.role === 'user'
                    ? <UserLiveBubble key={entry.key} text={entry.content} index={entry.index ?? 0} />
                    : (
                      <div key={entry.key} className="flex w-full flex-col items-start gap-[4px]">
                        <AiLiveBubble text={entry.content} />
                        {/* ปุ่มความเห็น — เฉพาะข้อความที่มาจากโมเดล (มี id ใน DB) */}
                        {entry.id ? (
                          <div className="flex items-center gap-[6px] pl-[33px]">
                            <button
                              type="button"
                              onClick={() => { void sendFeedback(entry.id!, 'up'); }}
                              aria-label="คำตอบนี้ช่วยได้"
                              aria-pressed={entry.feedback === 'up'}
                              className={`rounded-[8px] px-[6px] py-[1px] text-[12px] leading-[18px] transition-colors ${entry.feedback === 'up' ? 'bg-[#e8f4ff] text-[#0d6d97]' : 'text-[#94a3b8] hover:bg-[#f1f5f9]'}`}
                            >
                              👍
                            </button>
                            <button
                              type="button"
                              onClick={() => { void sendFeedback(entry.id!, 'down'); }}
                              aria-label="คำตอบนี้ไม่ช่วย"
                              aria-pressed={entry.feedback === 'down'}
                              className={`rounded-[8px] px-[6px] py-[1px] text-[12px] leading-[18px] transition-colors ${entry.feedback === 'down' ? 'bg-[#fdecec] text-[#b42318]' : 'text-[#94a3b8] hover:bg-[#f1f5f9]'}`}
                            >
                              👎
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                ))}
                {streamingText && <AiLiveBubble text={streamingText} />}
                {sending && !streamingText && <TypingIndicator />}
                {error && (
                  <div className="flex w-full flex-col items-start gap-[6px] rounded-[12px] border border-[#f0c9c9] bg-[#fff5f5] px-[12px] py-[10px]">
                    <p className="text-[13px] leading-[20px] text-[#b42318]">{error}</p>
                    {retryMessage && !quotaExhausted && (
                      <button
                        type="button"
                        onClick={() => { void send(retryMessage); }}
                        className="rounded-[8px] border border-[#e6b3b3] bg-white px-[10px] py-[4px] text-[12px] font-semibold text-[#b42318] hover:bg-[#fff0f0]"
                      >
                        ลองใหม่
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <AiTurn />
                <UserAnswerBubble />
                <AiTurn />
                <UserAnswerBubble />
              </>
            )}
          </div>
          {/* ช่องพิมพ์ (580:28021) — line + ช่อง 65px ห่างกัน 18 */}
          <div className="flex w-full flex-col gap-[18px] pt-[1px]">
            <img src={`${ASSET}/line.svg`} alt="" className="w-full" />
            <div className="flex h-[65px] items-center gap-[16px] overflow-clip rounded-[13px] bg-[#f4f4f4] pl-[14px] pr-[8px] min-[890px]:gap-[16px] min-[890px]:pl-[26px]">
              <textarea
                ref={inputRef}
                rows={1}
                defaultValue=""
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendFromInput();
                  }
                }}
                placeholder="พิมพ์คำถามต่อในเธรดนี้ (เช่น ขอตัวอย่างโจทย์คล้ายกัน)..."
                disabled={quotaExhausted}
                aria-label="พิมพ์คำถามถึง AI"
                /* scroll-mb เผื่อแถบล่างแบบ fixed ของหน้าสอบไม่ทับช่องพิมพ์ตอนคีย์บอร์ดเปิด */
                className="max-h-[45px] min-w-px flex-1 scroll-mb-[96px] resize-none overflow-y-auto bg-transparent text-[16px] leading-[22px] font-medium text-[#334155] outline-none placeholder:text-[#868686] disabled:cursor-not-allowed min-[890px]:text-[14px]"
              />
              {/* ปุ่มส่ง — AI จริงยังไม่ต่อ จึงปิดไว้ (580:28019) */}
              <button
                type="button"
                disabled={!isLive || sending || quotaExhausted || chatInput.trim().length === 0}
                onClick={sendFromInput}
                aria-label="ส่งคำถาม"
                className="flex size-[34px] shrink-0 cursor-default items-center justify-center rounded-[10px] bg-[#6f9cc1] enabled:cursor-pointer disabled:opacity-50"
              >
                <img src={`${ASSET}/arrow-up.svg`} alt="" className="size-[16px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* แจ้งเก็บข้อมูล — ซ้อนมุมขวาล่างของพื้นที่แชท (absolute) จึงไม่กระทบ layout ตาม Figma
          (bottom คือระยะจากขอบล่างกรอบ: ช่องพิมพ์สูง ~65px + padding ล่าง 22px
           → วางที่ 92px จึงอยู่เหนือช่องพิมพ์ ในพื้นที่ว่างท้ายแชท) */}
      {showBetaLabels && (
        <p className="pointer-events-none absolute right-[12px] bottom-[92px] max-w-[calc(100%-24px)] rounded-[6px] bg-[#fffffd]/85 px-[6px] py-[1px] text-right text-[10px] leading-[14px] text-[#a08a4a]">
          ระบบบันทึกคำถามเพื่อนำไปปรับปรุงการสอน อย่าพิมพ์ข้อมูลส่วนตัว
        </p>
      )}
    </div>
  );
}
