import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('lucide-react');
  return { ...actual, Loader2: () => null };
});

import VerbBankPanel from './VerbBankPanel';

/** ตรวจว่า panel เรนเดอร์ได้จริงและคงโครงสร้างตาม Figma (ต้องผ่านก่อนข้อมูลมา) */
describe('VerbBankPanel (server render)', () => {
  it('renders the heading, search box and three filter chips', () => {
    const html = renderToStaticMarkup(<VerbBankPanel />);
    expect(html).toContain('คลังกริยา 3 ช่องจากข้อสอบจริง');
    expect(html).toContain('ค้นหาคำศัพท์');
    expect(html).toContain('V.1');
    expect(html).toContain('V.2');
    expect(html).toContain('V.3');
  });

  it('shows the loading state on first paint (no hardcoded verbs)', () => {
    const html = renderToStaticMarkup(<VerbBankPanel />);
    expect(html).toContain('กำลังโหลดคลังกริยา');
    expect(html).not.toContain('gone');
  });

  it('keeps the divider marks that the Figma puts between pills', () => {
    const html = renderToStaticMarkup(<VerbBankPanel />);
    // 2 เส้นคั่นต่อแถว (ขณะโหลดยังไม่มีแถว) — เช็คว่าการ์ด/กริดถูกต้องด้วยการมี class ของ panel
    expect(html).toContain('rounded-2xl');
    expect(html).toContain('grid-cols-3');
  });
});

/** การ์ดใน modal ตาม Figma 249:8290 — ค่าของ variant="modal" ต้องไม่ไปกระทบ sidebar */
describe('VerbBankPanel variant="modal" (Figma 249:8290)', () => {
  it('uses the modal card: r19, px21, py15 and the 4.95px drop shadow', () => {
    const html = renderToStaticMarkup(<VerbBankPanel variant="modal" />);
    expect(html).toContain('rounded-[19px]');
    expect(html).toContain('px-[21px]');
    expect(html).toContain('pt-[15px]');
    expect(html).toContain('pb-[15px]');
    expect(html).toContain('shadow-[0_0_4.95px_0_rgba(0,0,0,0.09)]');
    // การ์ด sidebar (ค่าเดิม) ต้องไม่หลุดมาใน modal
    expect(html).not.toContain('rounded-2xl');
  });

  it('renders the 24px icon from Figma 249:8294 next to the heading', () => {
    const html = renderToStaticMarkup(<VerbBankPanel variant="modal" />);
    // next/image เข้ารหัสพาธใน src/srcSet จึงต้องเช็คชื่อไฟล์ที่ encode แล้ว
    expect(html).toContain('verb-bank-icon.png');
    expect(html).toContain('width="24"');
    expect(html).toContain('h-6 w-6');
  });

  it('lets a long verb list scroll down inside the card, never sideways', () => {
    const html = renderToStaticMarkup(<VerbBankPanel variant="modal" />);
    expect(html).toContain('max-h-[min(58vh,420px)]');
    expect(html).toContain('overflow-y-auto');
    // overflow-x-hidden กันไม่ให้กริดกริยาเกิด scroll แนวนอน
    expect(html).toContain('overflow-x-hidden');
    expect(html).toContain('overscroll-contain');
    // ซ่อนแถบเลื่อนแนวตั้งด้วย ไม่ให้กินความกว้างจนคอลัมน์ V.1–V.3 บีบ
    // (markup ที่ renderToStaticMarkup คืนมาจะ escape & เป็น &amp;)
    expect(html).toContain('[scrollbar-width:none]');
    expect(html).toContain('[&amp;::-webkit-scrollbar]:hidden');
    // ไม่มี padding ขวาสำรองไว้ให้ scrollbar แล้วบีบคอลัมน์ให้แคบลง
    expect(html).not.toContain('pr-0.5');
  });
});
