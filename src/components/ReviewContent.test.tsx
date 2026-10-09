import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReviewContent from './ReviewContent';

const practiceTopic = {
  type: 'practice' as const,
  heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
  practice: {
    questions: [
      {
        sentence: '"Did she ____ to the university yesterday?"',
        options: ['went', 'go', 'goes'],
        answerIndex: 0,
        explanation: "เพราะประธานเป็น she เลยต้องต่อด้วย Do / Doesn't",
      },
      {
        sentence: '"Did they ____ home yesterday?"',
        options: ['go', 'went', 'goes'],
        answerIndex: 0,
        // ไม่มี explanation → ห้ามโผล่แถบเฉลย
      },
    ],
  },
};

describe('ReviewContent Typography (Figma 419:57569)', () => {
  it('ใช้ IBM Plex Sans Thai กับเนื้อหาทั้งหน้าอธิบาย แทนฟอนต์ global', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[{
      type: 'rule' as const,
      heading: 'IN (เมือง / ปี / ช่วงเวลา)',
      chip: 'เมืองใหญ่ใช้ in',
      description: 'ใช้กับพื้นที่ใหญ่ เมือง ประเทศ เดือน ปี และช่วงเวลา',
      rows: [{ left: 'เมืองใหญ่ใช้ in', right: 'He lives in Bangkok.' }],
      tip: 'In ฐานกว้าง',
    }]} />);

    expect(html).toMatch(/<div class="[^"]*font-ibm[^"]*">/);
  });
});

describe('ReviewContent Mini Quiz เฉลย (ตาม Figma 249:1099)', () => {
  it('ยังไม่ตอบ: ไม่แสดงแถบเฉลย', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[practiceTopic]} />);
    expect(html).not.toContain('เฉลยลองทำโจทย์');
    expect(html).not.toContain("เพราะประธานเป็น she เลยต้องต่อด้วย Do / Doesn't");
  });

  it('ตอบแล้ว (ถูกหรือผิด): แสดงแถบเฉลยตาม design — พื้น #FFFEFA border #E9CD62 ข้อความ #76641C', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[practiceTopic]} initialPracticeAnswers={{ 0: 1 }} />,
    );
    expect(html).toContain('aria-label="เฉลยลองทำโจทย์"');
    expect(html).toContain('bg-[#FFFEFA]');
    expect(html).toContain('border-[#E9CD62]');
    expect(html).toContain('text-[#76641C]');
    expect(html).toContain('rounded-[15px]');
    expect(html).toContain('bg-[#C8E6FF]'); // badge ไอคอน
    expect(html).toContain('/logo-otter/explain-spark.svg'); // asset จาก Figma MCP
    expect(html).toContain('เพราะประธานเป็น she เลยต้องต่อด้วย Do / Doesn&#x27;t');
  });

  it('เฉลยของข้ออื่น (ข้อ 2) ไม่โผล่พร้อมกัน — แสดงเฉพาะข้อที่ตอบแล้ว', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[practiceTopic]} initialPracticeAnswers={{ 0: 1 }} />,
    );
    // แถบเฉลยปรากฏครั้งเดียว (เฉพาะข้อที่มี explanation) — ข้อ 2 ยังไม่เฉลย
    expect((html.match(/เฉลยลองทำโจทย์/g) ?? []).length).toBe(1);
  });

  it('practice แบบไม่มี explanation: ตอบแล้วไม่ต้องมีแถบเฉลย', () => {
    const noExplanation = {
      type: 'practice' as const,
      practice: {
        questions: [{ sentence: 'She ____ to school.', options: ['go', 'goes'], answerIndex: 1 }],
      },
    };
    const html = renderToStaticMarkup(
      <ReviewContent topics={[noExplanation]} initialPracticeAnswers={{ 0: 0 }} />,
    );
    expect(html).not.toContain('เฉลยลองทำโจทย์');
    expect(html).toContain('She <span'); // คำถามยังแสดงปกติ (blank เป็น span)
    expect(html).toContain('to school.');
  });
});

/**
 * เลขข้อ 1 2 3 ของ Mini Quiz ต้องบอก “ผลการตอบ” เสมอบนสีพื้น
 * (บั๊กเดิม: เช็ค active ก่อน answered — เลขข้อที่กำลังเปิดดูอยู่จึงถูกบังด้วยสีเทา
 *  ต้องคลิกไปข้ออื่นก่อนถึงเห็นสีเขียว/แดง และสีเทาของ “ข้อที่กำลังดู”
 *  ซ้ำกับสีเทาของ “ยังไม่ตอบ” จึงแยกไม่ออก)
 * “ข้อที่กำลังดู” บอกด้วยวงแหวนด้านใน (ring-2 ring-inset) ทับบนสีพื้น
 */
describe('ReviewContent Mini Quiz เลขข้อ (nav) — สีบอกผลการตอบ', () => {
  const ACTIVE_RING = 'ring-2 ring-inset ring-[#E9CD62]';
  /** คลาสของปุ่มเลขข้อ (aria-label = "ข้อ N …") */
  const navButtonClass = (html: string, questionNumber: number) => {
    const match = html.match(
      new RegExp(`<button[^>]*aria-label="ข้อ ${questionNumber}[^"]*"[^>]*class="([^"]*)"`),
    );
    return match?.[1] ?? '';
  };

  it('ข้อที่กำลังเปิดดูอยู่ + ตอบถูก → พื้นเขียว และมีวงแหวนบอกข้อที่กำลังดู', () => {
    // question 0 = answerIndex 0 → ตอบถูก, active เริ่มที่ 0
    const html = renderToStaticMarkup(
      <ReviewContent topics={[practiceTopic]} initialPracticeAnswers={{ 0: 0 }} />,
    );
    const first = navButtonClass(html, 1);
    expect(first).toContain('bg-emerald-100');
    expect(first).toContain('text-emerald-700');
    expect(first).toContain(ACTIVE_RING);
    expect(first).not.toContain('bg-[#F2F2F2]'); // ห้ามถูกแทนที่ด้วยสีเทาของ active
    expect(html).toContain('aria-current="step"'); // ยังบอกว่าเป็นข้อที่กำลังดูอยู่
    expect(html).toContain('aria-label="ข้อ 1 ตอบถูก"');
  });

  it('ข้อที่กำลังเปิดดูอยู่ + ตอบผิด → พื้นแดง ไม่ใช่เทา และมีวงแหวนเหมือนกัน', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[practiceTopic]} initialPracticeAnswers={{ 0: 2 }} />,
    );
    const first = navButtonClass(html, 1);
    expect(first).toContain('bg-rose-100');
    expect(first).toContain('text-rose-700');
    expect(first).toContain(ACTIVE_RING);
    expect(first).not.toContain('bg-[#F2F2F2]');
  });

  it('ข้อยังไม่ตอบ → เทา ไม่มีสีถูก/ผิด และไม่มีวงแหวนของข้อที่กำลังดู', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[practiceTopic]} initialPracticeAnswers={{ 0: 0 }} />,
    );
    const second = navButtonClass(html, 2);
    expect(second).toContain('bg-[#F2F2F2]');
    expect(second).toContain('hover:bg-slate-200');
    expect(second).not.toContain('bg-emerald-100');
    expect(second).not.toContain('bg-rose-100');
    expect(second).not.toContain(ACTIVE_RING);
  });

  it('ข้อยังไม่ตอบที่กำลังเปิดดูอยู่ → ยังมีวงแหวนบอกว่ากำลังดูข้อนี้', () => {
    // ยังไม่ตอบเลย → active (ข้อ 1) ต้องมีวงแหวน แต่สีพื้นยังเป็นเทา
    const html = renderToStaticMarkup(<ReviewContent topics={[practiceTopic]} />);
    const first = navButtonClass(html, 1);
    expect(first).toContain('bg-[#F2F2F2]');
    expect(first).toContain(ACTIVE_RING);
  });
});

/**
 * การจัดกลุ่มกล่อง (design ล่าสุด): การ์ดกฎ + กล่องทริกสำคัญ + การ์ด Mini Quiz
 * ที่วางต่อกันต้องอยู่ในการ์ดสีขาวก้อนเดียวกัน เรียงตามลำดับที่แอดมินวางไว้จริง
 * (เดิม Mini Quiz ถูกดึงขึ้นไปบนสุดเสมอ — เทสต์ชุดนี้กันไม่ให้พฤติกรรมนั้นกลับมา)
 */
describe('ReviewContent การจัดกลุ่ม section (Mini Quiz ในกล่องเดียวกับ section อื่น)', () => {
  const ruleTopic = {
    type: 'rule' as const,
    heading: 'Superlative',
    chip: 'ขั้นที่สุด',
    rows: [{ left: '1 พยางค์: เติม -est', right: 'Tom is the tallest in the class.' }],
  };
  const tipTopic = {
    type: 'importantNote' as const,
    heading: 'ทริกสำคัญ',
    body: '1 พยางค์: เติม -est · 2 พยางค์ขึ้นไป: ใช้ the most',
  };
  const wrapperCount = (html: string) => (html.match(/rounded-\[28px\]/g) ?? []).length;

  // กล่องขาวที่ “คุม” Mini Quiz ต้องมี padding ซ้าย-ขวา เพื่อไม่ให้การ์ด quiz ชิดขอบกล่อง
  // (คำสั่งผู้ใช้: “เพิ่ม padding ให้กับกล่องที่คุม ลองทำโจทย์… เพราะอยู่ติดกันเกินไป”)
  it('กล่องขาวของแต่ละกลุ่ม: มี padding ซ้าย-ขวาบน desktop และคง max-md:px-[15px] เดิม', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[practiceTopic, ruleTopic]} />);
    const box = (html.match(/class="[^"]*rounded-\[28px\][^"]*"/g) ?? [])[0] ?? '';
    expect(box).toContain('px-[22.5px]'); // (713 − 668) / 2 — ให้การ์ด quiz เยื้องเท่าการ์ดเนื้อหา 668px
    expect(box).toContain('max-md:px-[15px]');
  });

  it('แสดง heading ของ Rule Card เหนือกล่องเนื้อหาสีขาว เหมือนตำแหน่ง Header ในดีไซน์', () => {
    const heading = 'Conditional Sentences (ประโยคเงื่อนไข)';
    const html = renderToStaticMarkup(<ReviewContent topics={[{ ...ruleTopic, heading }]} />);
    const headingTextIndex = html.indexOf(heading);
    const headingElementIndex = html.lastIndexOf('<h2', headingTextIndex);
    const whiteCardIndex = html.indexOf('rounded-xl bg-white', headingTextIndex);

    expect(headingTextIndex).toBeGreaterThan(-1);
    expect(headingElementIndex).toBeGreaterThan(-1);
    expect(whiteCardIndex).toBeGreaterThan(headingTextIndex);
    expect(html.slice(headingElementIndex, whiteCardIndex)).toContain('color:#3B3B3B');
  });

  it('Mini Quiz ที่วางถัดจากการ์ดกฎ อยู่ในกล่องเดียวกับกฎ และอยู่ใต้กฎ (ไม่ถูกดึงขึ้นบน)', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[ruleTopic, tipTopic, practiceTopic]} />);
    const ruleIndex = html.indexOf('Tom is the tallest in the class.');
    const tipIndex = html.indexOf('aria-label="ทริกสำคัญ"');
    const quizIndex = html.indexOf('เลือกข้อ Mini Quiz');

    expect(ruleIndex).toBeGreaterThan(-1);
    expect(tipIndex).toBeGreaterThan(ruleIndex);
    expect(quizIndex).toBeGreaterThan(tipIndex);
    expect(wrapperCount(html)).toBe(1);
  });

  it('Mini Quiz ที่มาก่อนการ์ดกฎตัวแรก ได้กล่องของตัวเอง', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[practiceTopic, ruleTopic]} />);
    const quizIndex = html.indexOf('เลือกข้อ Mini Quiz');
    const ruleIndex = html.indexOf('Tom is the tallest in the class.');

    expect(quizIndex).toBeGreaterThan(-1);
    expect(quizIndex).toBeLessThan(ruleIndex);
    expect(wrapperCount(html)).toBe(2);
  });

  it('การ์ด Mini Quiz ที่วางหลัง Core Formula breakdown อยู่ในกล่องเดียวกัน', () => {
    const formulaTopic = {
      type: 'formulaBreakdown' as const,
      heading: 'ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)',
      formula: {
        cases: [{
          label: 'เคส Is / Am / Are - ปฏิเสธ :',
          example: "It isn't cold today, is it?",
          left: { sentence: "It ==isn't== too cold today", note: 'ประโยคหน้าปฏิเสธ / มี is/am/are' },
          right: { sentence: '==is== it?', note: 'หลังใช้บอกเล่า' },
        }],
      },
    };
    const html = renderToStaticMarkup(<ReviewContent topics={[formulaTopic, practiceTopic]} />);

    expect(wrapperCount(html)).toBe(1);
    expect(html.indexOf('ประโยคหน้าปฏิเสธ')).toBeLessThan(html.indexOf('เลือกข้อ Mini Quiz'));
  });

  // เปลี่ยนพฤติกรรมตามคำสั่งผู้ใช้: การ์ดเนื้อหาที่วางติดกันอยู่ "กล่องขาวใบเดียวกัน"
  // (เดิม 1 การ์ด = 1 กล่อง ทำให้การ์ดที่ 2 ถูกกล่องขาว + ช่องว่างคั่นจนดูเป็นคนละกล่อง)
  it('การ์ดกฎ 2 อัน อยู่กล่องขาวใบเดียวกัน เรียงตามลำดับ และ Mini Quiz ต่อท้ายไปอยู่กล่องนั้น', () => {
    const secondRule = { type: 'rule' as const, rows: [{ left: 'ข้อยกเว้น', right: 'good → the best' }] };
    const html = renderToStaticMarkup(<ReviewContent topics={[ruleTopic, secondRule, practiceTopic]} />);

    expect(wrapperCount(html)).toBe(1);
    expect(html.indexOf('Tom is the tallest in the class.')).toBeLessThan(html.indexOf('good → the best'));
    expect(html.indexOf('good → the best')).toBeLessThan(html.indexOf('เลือกข้อ Mini Quiz'));
  });

  it('การ์ดเนื้อหาที่ไม่ติดกัน (คั่นด้วย Mini Quiz) ยังเรียงตามลำดับที่วางไว้', () => {
    const secondRule = { type: 'rule' as const, heading: 'กฎข้อ 2', rows: [{ left: 'ข้อยกเว้น', right: 'good → the best' }] };
    const html = renderToStaticMarkup(<ReviewContent topics={[ruleTopic, practiceTopic, secondRule]} />);

    expect(wrapperCount(html)).toBe(1);
    const rule1 = html.indexOf('Tom is the tallest in the class.');
    const quiz = html.indexOf('เลือกข้อ Mini Quiz');
    const rule2 = html.indexOf('good → the best');
    expect(rule1).toBeGreaterThan(-1);
    expect(quiz).toBeGreaterThan(rule1);
    expect(rule2).toBeGreaterThan(quiz);
  });
});

/**
 * Core Formula breakdown — ค่าในเทสต์นี้คัดมาจาก Figma node 419:56249
 * (ผ่าน get_design_context) ห้ามแก้ค่าสี/ขนาดโดยไม่วัดจากไฟล์จริงก่อน
 */
describe('ReviewContent Core Formula breakdown (Figma 419:56249)', () => {
  const topics = [{
    type: 'formulaBreakdown' as const,
    heading: 'ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)',
    formula: {
      cases: [
        {
          label: 'เคส Is / Am / Are - ปฏิเสธ :',
          example: "It isn't cold today, is it?",
          left: { sentence: "It ==isn't== too cold today", note: 'ประโยคหน้าปฏิเสธ / มี is/am/are' },
          right: { sentence: '==is== it?', note: "หลังใช้บอกเล่า / ดึง is ตัวเดิมมาใช้แบบไม่มี n't" },
        },
        {
          label: 'เคส Was / Were - ปฏิเสธ :',
          example: "They weren't at home, were they?",
          left: { sentence: "They ==weren't== at home", note: 'ประโยคหน้าปฏิเสธ / มี was/were' },
          right: { sentence: '==were== they?', note: 'หลังต้องใช้บอกเล่า / ดึง were ตัวเดิมมาใช้' },
        },
      ],
    },
  }];

  it('แสดงหัวเรื่อง, ป้ายเคส, ประโยคตัวอย่าง และคำอธิบายใต้แถบทั้งสองคอลัมน์', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    expect(html).toContain('ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)');
    expect(html).toContain('เคส Is / Am / Are - ปฏิเสธ :');
    expect(html).toContain('It isn&#x27;t cold today, is it?');
    expect(html).toContain('ประโยคหน้าปฏิเสธ / มี is/am/are');
    expect(html).toContain('เคส Was / Were - ปฏิเสธ :');
    expect(html).toContain('• '); // คำอธิบายใต้แถบเป็น bullet
  });

  it('ใช้ค่าจาก design: การ์ด #E6F0F8, เส้นคั่น #F4F4F4, ป้ายเคส #F2F2F0', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    expect(html).toContain('#E6F0F8');
    expect(html).toContain('#F4F4F4');
    expect(html).toContain('#F2F2F0');
    expect(html).toContain('rgba(85,73,29,0.68)'); // สีตัวอักษรของป้ายเคส
    expect(html).toContain('color:#6D5B16'); // ประโยคตัวอย่าง/ประโยคในแถบสี
    expect(html).toContain('color:#555555'); // คำอธิบายใต้แถบสี
  });

  it('คอลัมน์ซ้ายพื้น #E6E6FC และขวาพื้น #FFF5CF ตาม design', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    expect(html).toContain('#E6E6FC');
    expect(html).toContain('#FFF5CF');
    expect(html).toContain('rounded-t-[7px]');
    expect(html).toContain('rounded-b-[7px]');
    expect(html).toContain('#F8F8F8'); // แถบคำอธิบายใต้แถบสี
  });

  it('คำที่ห่อด้วย ==...== ถูกเน้นเป็นชิปพื้นขาวในประโยค', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    // RichText วาด ==...== เป็น <mark> พื้นขาว ตาม design ของแถบประโยค
    expect(html).toContain('<mark');
    expect(html).toContain('background:#FFFFFF');
  });

  it('ไม่มีเคส → ไม่เรนเดอร์การ์ดสูตร (กันการ์ดเปล่า)', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[{ type: 'formulaBreakdown' as const, heading: 'หัวเรื่อง', formula: { cases: [] } }]} />,
    );
    expect(html).not.toContain('หัวเรื่อง');
  });
});

/**
 * Type Breakdown — ค่าในเทสต์นี้คัดมาจาก Figma node 419:56446 (ผ่าน get_design_context)
 * ห้ามแก้ค่าสี/ขนาดโดยไม่วัดจากไฟล์จริงก่อน
 */
describe('ReviewContent Type Breakdown (Figma 419:56446)', () => {
  const topics = [{
    type: 'typeBreakdown' as const,
    heading: 'Conditional Sentences (ประโยคเงื่อนไข)',
    description: 'พูดถึงเรื่องสมมติหรือเงื่อนไข “ถ้า... ก็...”',
    typeBreakdown: {
      cases: [
        {
          label: 'Type 1 :',
          color: '#8ACB66',
          description: 'มีโอกาสเกิดขึ้นจริงในอนาคต',
          structure: 'โครงสร้าง: If + V.1 , will + V.1',
          example: 'If I ==study== , I ==will pass.==',
          note: 'ปัจจุบันคู่กับอนาคต (V.1 คู่ will)',
        },
        {
          label: 'Type 2 :',
          color: '#B3B252',
          description: 'สมมติเพ้อฝัน / เป็นไปได้ยากในปัจจุบัน',
          structure: 'โครงสร้าง: If + V.2 , would + V.1',
          example: 'If I ==studied== , I ==would pass.==',
          note: 'อดีตสมมติ (V.2 คู่ would + V.1)',
        },
      ],
    },
  }];

  it('แสดงหัวการ์ด, คำโปรย, ป้าย Type, ช่องโครงสร้าง, ประโยคตัวอย่าง และบรรทัดสรุปท้ายเคส', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    expect(html).toContain('Conditional Sentences (ประโยคเงื่อนไข)');
    const cardStart = html.indexOf('aria-label="Conditional Sentences (ประโยคเงื่อนไข)"');
    const headingStart = html.indexOf('<h2', cardStart);
    const whiteCardStart = html.indexOf('rounded-xl bg-white', cardStart);
    expect(cardStart).toBeGreaterThan(-1);
    expect(headingStart).toBeGreaterThan(cardStart);
    expect(whiteCardStart).toBeGreaterThan(headingStart);
    expect(html.slice(headingStart, whiteCardStart)).toContain('Conditional Sentences (ประโยคเงื่อนไข)');
    expect(html).toContain('พูดถึงเรื่องสมมติหรือเงื่อนไข');
    expect(html).toContain('Type 1 :');
    expect(html).toContain('มีโอกาสเกิดขึ้นจริงในอนาคต');
    expect(html).toContain('โครงสร้าง: If + V.1 , will + V.1');
    expect(html).toContain('ปัจจุบันคู่กับอนาคต (V.1 คู่ will)');
    expect(html).toContain('Type 2 :');
    expect(html).toContain('อดีตสมมติ (V.2 คู่ would + V.1)');
  });

  it('ใช้ค่าจาก design: หัวการ์ด #3B3B3B, ป้าย Type สีตามเคส, ช่องโครงสร้าง #F5F5F5, แถบตัวอย่าง #FFF5CF', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    expect(html).toContain('#3B3B3B');
    expect(html).toContain('#8ACB66');
    expect(html).toContain('#B3B252');
    expect(html).toContain('#F5F5F5');
    expect(html).toContain('#FFF5CF');
    expect(html).toContain('color:#6D5B16'); // ข้อความในแถบตัวอย่าง
    expect(html).toContain('color:#555555'); // ช่องโครงสร้าง/บรรทัดสรุป
    expect(html).toContain('#C8E6FF'); // กล่องไอคอนของบรรทัดสรุป
    expect(html).toContain('#E6F0F8'); // พื้นการ์ด
  });

  it('ใช้ไอคอนที่ดาวน์โหลดมาจาก Figma (reuse asset ที่มีในโปรเจกต์) และมีเส้นคั่น #F4F4F4', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    expect(html).toContain('/logo-otter/explain-spark.svg');
    expect(html).toContain('size-[17px]');
    expect(html).toContain('#F4F4F4');
  });

  it('คำที่ห่อด้วย ==...== ในประโยคตัวอย่างถูกเน้นเป็นชิปพื้นขาว มุมโค้ง 5px เผื่อข้าง 4px ตามดีไซน์', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={topics} />);

    expect(html).toContain('<mark');
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('border-radius:5px');
    expect(html).toContain('padding-inline:4px');
  });

  it('เคสที่ไม่ระบุสี → ใช้สีมาตรฐานของดีไซน์ #8ACB66', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[{
      type: 'typeBreakdown' as const,
      heading: 'หัวการ์ด',
      typeBreakdown: { cases: [{ label: 'Type 1 :', description: 'คำอธิบาย', structure: 'If + V.1', example: 'If I study.', note: '' }] },
    }]} />);

    expect(html).toContain('#8ACB66');
  });

  it('ไม่มีเคส → ไม่เรนเดอร์การ์ด (กันการ์ดเปล่า)', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[{ type: 'typeBreakdown' as const, heading: 'หัวการ์ด', typeBreakdown: { cases: [] } }]} />,
    );
    expect(html).not.toContain('หัวการ์ด');
  });

  it('Mini Quiz ที่ฝังท้ายการ์ด Type Breakdown อยู่ในกล่องขาวเดียวกัน', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[{
      ...topics[0],
      practice: { questions: [{ sentence: 'If I ____ hard, I will pass.', options: ['study', 'studied'], answerIndex: 0 }] },
    }]} />);

    const wrapperCount = (html.match(/rounded-\[28px\]/g) ?? []).length;
    expect(wrapperCount).toBe(1);
    expect(html.indexOf('ปัจจุบันคู่กับอนาคต')).toBeLessThan(html.indexOf('เลือกข้อ Mini Quiz'));
  });
});

/**
 * Mini Quiz ที่ฝังมากับตัวการ์ด (section.practice บน type อื่น ไม่ใช่ type 'practice')
 * — แอดมินกด “เพิ่ม Mini Quiz ท้ายการ์ดนี้” แล้ว quiz ติดอยู่กับการ์ดนั้นเสมอ
 * โดยไม่ต้องพึ่งลำดับของ section
 */
describe('ReviewContent Mini Quiz ที่ฝังท้ายการ์ด (ไม่ต้องพึ่งลำดับ section)', () => {
  const ruleTopic = {
    type: 'rule' as const,
    heading: 'Superlative',
    chip: 'ขั้นที่สุด',
    examples: [{ en: 'Tom is the tallest in the class.', ok: true }],
  };
  const embeddedQuiz = {
    questions: [{
      sentence: 'She is the ____ (good) student in class.',
      options: ['best', 'better', 'goodest'],
      answerIndex: 0,
      explanation: 'good → the best (ขั้นที่สุด)',
    }],
  };
  const wrapperCount = (html: string) => (html.match(/rounded-\[28px\]/g) ?? []).length;

  it('การ์ดกฎ + quiz ที่ฝังอยู่ในการ์ดเดียวกัน → กล่องขาวเดียว และ quiz อยู่ใต้เนื้อหาการ์ด', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[{ ...ruleTopic, practice: embeddedQuiz }]} />,
    );

    const cardIndex = html.indexOf('Tom is the tallest in the class.');
    const quizIndex = html.indexOf('เลือกข้อ Mini Quiz');
    expect(wrapperCount(html)).toBe(1);
    expect(cardIndex).toBeGreaterThan(-1);
    expect(quizIndex).toBeGreaterThan(cardIndex);
    expect(html).toContain('ลองทำโจทย์เพื่อทบทวนความเข้าใจ'); // หัวข้อมาตรฐาน
  });

  it('quizHeading ที่กำหนดเองถูกใช้เป็นหัวข้อของกล่อง quiz', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[{ ...ruleTopic, practice: embeddedQuiz, quizHeading: 'ลองทำโจทย์: Comparatives' }]} />,
    );

    expect(html).toContain('ลองทำโจทย์: Comparatives');
    expect(html).not.toContain('ลองทำโจทย์เพื่อทบทวนความเข้าใจ');
  });

  it('Core Formula breakdown ก็ฝัง quiz ได้ และอยู่กล่องเดียวกัน', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[{
      type: 'formulaBreakdown' as const,
      heading: 'ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)',
      formula: {
        cases: [{
          label: 'เคส Is / Am / Are - ปฏิเสธ :',
          example: "It isn't cold today, is it?",
          left: { sentence: "It ==isn't== too cold today", note: 'ประโยคหน้าปฏิเสธ / มี is/am/are' },
          right: { sentence: '==is== it?', note: 'หลังใช้บอกเล่า' },
        }],
      },
      practice: embeddedQuiz,
    }]} />);

    expect(wrapperCount(html)).toBe(1);
    expect(html.indexOf('ประโยคหน้าปฏิเสธ')).toBeLessThan(html.indexOf('เลือกข้อ Mini Quiz'));
  });

  it('โจทย์ที่ยังว่าง (ยังไม่พิมพ์ประโยค) → ไม่เรนเดอร์กล่อง quiz', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[{
      ...ruleTopic,
      practice: { questions: [{ sentence: '   ', options: ['a', 'b'], answerIndex: 0 }] },
    }]} />);

    expect(html).not.toContain('เลือกข้อ Mini Quiz');
    expect(html).toContain('Tom is the tallest in the class.');
  });

  it('Core Formula breakdown: ระบุ `tone` ในข้อมูล = ใช้สีนั้น (Figma 419:56107 ฝั่งซ้ายเป็นเหลือง)', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[{
      type: 'formulaBreakdown' as const,
      heading: 'ประโยคบอกเล่า (+) ต้องตามด้วย ประโยคปฏิเสธ (-)',
      formula: { cases: [{
        label: 'Is / Am / Are',
        example: "You are a student, aren't you?",
        left: { sentence: 'You ==are== a student', note: 'ประโยคหน้าบอกเล่า', tone: 'yellow' as const },
        right: { sentence: "==aren't== you?", note: 'หลังต้องใช้ปฏิเสธ', tone: 'purple' as const },
      }] },
    }]} />);

    const yellow = html.indexOf('background:#FFF5CF');
    const purple = html.indexOf('background:#E6E6FC');
    expect(yellow).toBeGreaterThan(-1);
    expect(purple).toBeGreaterThan(-1);
    expect(yellow).toBeLessThan(purple);
  });

  it('Core Formula breakdown: ไม่ระบุ `tone` = สีตามตำแหน่งคอลัมน์เหมือนเดิม (ซ้ายม่วง ขวาเหลือง)', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[{
      type: 'formulaBreakdown' as const,
      heading: 'ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)',
      formula: { cases: [{
        label: 'เคส Is / Am / Are - ปฏิเสธ :',
        example: "It isn't cold today, is it?",
        left: { sentence: "It ==isn't== too cold today", note: 'ประโยคหน้าปฏิเสธ' },
        right: { sentence: '==is== it?', note: 'หลังใช้บอกเล่า' },
      }] },
    }]} />);

    const purple = html.indexOf('background:#E6E6FC');
    const yellow = html.indexOf('background:#FFF5CF');
    expect(purple).toBeGreaterThan(-1);
    expect(yellow).toBeGreaterThan(-1);
    expect(purple).toBeLessThan(yellow);
  });

  it('quiz ที่ฝังมากับการ์ด ยังตามด้วย section ทริกสำคัญได้ในกล่องเดียวกัน', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[
      { ...ruleTopic, practice: embeddedQuiz },
      { type: 'importantNote' as const, heading: 'ทริกสำคัญ', body: 'ใช้ the + ขั้นที่สุด' },
    ]} />);

    expect(wrapperCount(html)).toBe(1);
    const quizIndex = html.indexOf('เลือกข้อ Mini Quiz');
    const tipIndex = html.indexOf('aria-label="ทริกสำคัญ"');
    expect(quizIndex).toBeGreaterThan(-1);
    expect(tipIndex).toBeGreaterThan(quizIndex);
  });
});
