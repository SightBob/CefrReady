import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ExplainCoveragePanel from './ExplainCoveragePanel';
import { explainCoverage } from '@/lib/explain-coverage';

const sections = [{ chip: 'Do' }, { chip: 'Did' }];

const render = (questions: Parameters<typeof explainCoverage>[0], loading = false) =>
  renderToStaticMarkup(<ExplainCoveragePanel coverage={explainCoverage(questions, sections)} loading={loading} />);

describe('ExplainCoveragePanel', () => {
  it('แจ้งชัดว่าเป็นการเตือน ไม่ได้กั้นการเผยแพร่', () => {
    expect(render([])).toContain('เตือนเท่านั้น ไม่บล็อกการเผยแพร่');
  });

  it('หัวข้อที่ยังไม่มีข้อสอบ — ไม่โชว์คำเตือน', () => {
    const html = render([]);
    expect(html).toContain('หัวข้อนี้ยังไม่มีข้อสอบใช้');
    expect(html).not.toContain('บทนี้อาจอธิบายไม่ครบทุกข้อ');
  });

  it('บอกหัวข้อย่อยของบท และจำนวนข้อที่ครอบคลุม', () => {
    const html = render([
      { id: 1, questionText: 'She ___ like tea.', subTopicGrammar: 'Do' },
      { id: 2, questionText: 'I ___ go yesterday.', subTopicGrammar: 'Did' },
    ]);
    expect(html).toContain('ครอบคลุมครบ 2 ข้อ');
    expect(html).toContain('หัวข้อย่อยในบทนี้ (2):');
    expect(html).toContain('Do · Did');
    expect(html).toContain('อธิบายแล้ว');
  });

  it('ลิสต์ข้อที่ยังไม่มีหัวข้อย่อยในบท พร้อมหัวข้อย่อยของข้อนั้น', () => {
    const html = render([
      { id: 1, questionText: 'She ___ like tea.', subTopicGrammar: 'Do' },
      { id: 2, questionText: 'How many books ___ you got?', subTopicGrammar: 'have got' },
    ]);
    expect(html).toContain('ครอบคลุม 1/2 ข้อ');
    expect(html).toContain('ยังไม่มีหัวข้อย่อย: have got (1 ข้อ)');
    expect(html).toContain('หัวข้อย่อยของข้อ: have got');
    expect(html).toContain('#2');
  });

  it('เตือนเมื่อข้อยังไม่ระบุหัวข้อย่อย ทำให้เทียบไม่ได้', () => {
    const html = render([{ id: 1, questionText: 'Please ___ run.', subTopicGrammar: null }]);
    expect(html).toContain('ยังตรวจความครอบคลุมไม่ได้');
    expect(html).toContain('ข้อยังไม่ระบุหัวข้อย่อย (ตรวจไม่ได้)');
  });

  it('บอกให้ใส่หัวข้อย่อยในบทเมื่อบทไม่มีป้ายเลย', () => {
    const html = renderToStaticMarkup(
      <ExplainCoveragePanel coverage={explainCoverage([{ id: 1, questionText: 'x', subTopicGrammar: 'Do' }], [])} />,
    );
    expect(html).toContain('บทนี้ยังไม่มีหัวข้อย่อย');
    expect(html).toContain('ใส่ช่อง “หัวข้อย่อย” ของการ์ดกฎ');
  });

  it('ระหว่างโหลด แสดงข้อความโหลดแทนรายการ', () => {
    const html = render([{ id: 1, questionText: 'x', subTopicGrammar: 'Do' }], true);
    expect(html).toContain('กำลังโหลดข้อสอบของหัวข้อนี้…');
    expect(html).not.toContain('หัวข้อย่อยในบทนี้');
  });
});
