# แผนจัดชุดข้อสอบ Focus on Form ตามเรื่องไวยากรณ์

ที่มา: `Untitled spreadsheet - ปรับโจทย์แล้ว.csv` — 158 ข้อ, 26 เรื่อง (cefrLevel A2 156 / B1 2, difficulty medium ทั้งหมด)

จัดเป็น 11 ชุด แต่ละชุดเป็นกลุ่มเรื่องที่เรียนต่อเนื่องกัน ลำดับชุดคือ `order_index` ที่ผู้เรียนเห็น (พื้นฐาน → ซับซ้อน)
ชุดเดิม 9 ชุดในพาร์ท focus-form ถูกใช้ต่อโดยเปลี่ยนชื่อ/คำอธิบาย; 2 ชุดท้ายสร้างใหม่

| order | test set id | ชื่อชุด | ข้อ | เรื่องในชุด (จำนวนข้อ) |
|---|---|---|---|---|
| 1 | 15 | Present Simple & Present Continuous | 14 | Present Simple (11) · Present Continuous (3) |
| 2 | 16 | Past, Perfect & Future Tenses | 16 | Past Simple (8) · Present Perfect (2) · Past Perfect (1) · Time Expressions (2) · Future Forms (3) |
| 3 | 17 | Pronouns, Possessives & Articles | 17 | Pronouns & Possessives (15) · Articles & Determiners (2) |
| 4 | 18 | Quantifiers | 11 | Quantifiers (11) |
| 5 | 19 | Adjectives, Adverbs & Comparison | 12 | Adjectives & Adverbs (7) · Comparatives & Superlatives (5) |
| 6 | 20 | Modals & Auxiliaries | 16 | Modals & Semi-modals (10) · Auxiliaries & Verb Forms (6) |
| 7 | 21 | Gerunds, Infinitives, Passive & Agreement | 14 | Gerunds & Infinitives (8) · Passive Voice (4) · Subject-Verb Agreement (2) |
| 8 | 22 | Prepositions | 17 | Prepositions (17) |
| 9 | 56 | Connectors, Conditionals & Clauses | 12 | Conjunctions & Connectors (4) · Conditionals (3) · Relative Clauses (3) · Reported Speech (2) |
| 10 | 57 | Question Forms & Tag Questions | 11 | Question Forms (9) · Tag Questions (2) |
| 11 | 58 | Phrasal Verbs & Collocations | 18 | Phrasal Verbs (9) · Vocabulary & Collocations (9) |
| | | **รวม** | **158** | |

## หมายเหตุการใช้งานร่วมกับฟีเจอร์ intro/explain รายเรื่อง

- ข้อสอบถูกเรียงในชุดให้เรื่องเดียวกันอยู่ติดกัน (contiguous) → `buildTopicRuns()` ของหน้าสอบจะได้ run ละเรื่อง
  ครบทุกชุด (เช่น ชุด 6 = `Modals & Semi-modals` → `Auxiliaries & Verb Forms`)
- ทุกชุดมีมากกว่า 1 run → `usesSetLevelExplain()` คืน false จึงข้ามหน้า `/explain` ระดับชุด และใช้การเด้ง intro+explain ต่อเรื่องในหน้าสอบแทน
- `test_explains` ที่เผยแพร่อยู่ตอนนี้มี 1 อัน: `grammar_topic = "(Auxiliaries & Verb Forms)"` ผูกกับชุด 15
  **ยังใช้ไม่ได้** เพราะ `normalizeTopic()` trim อย่างเดียว → `"(Auxiliaries & Verb Forms)"` ไม่ตรงกับ topic ของข้อสอบ (`Auxiliaries & Verb Forms`)
  และการผูกกับชุด 15 ก็ไม่ตรงแล้ว (ชุด 15 = Present Simple & Present Continuous) ควรแก้เป็น
  `grammar_topic = 'Auxiliaries & Verb Forms'` และผูกกับชุด 20 (Modals & Auxiliaries)

## วิธีรันซ้ำ / ตรวจสอบ

```bash
npx tsx scripts/import-focus-form-by-topic.ts "<path-to.csv>"
```

สคริปต์จะหยุดทันทีถ้าพาร์ท focus-form มีข้อสอบอยู่แล้ว (กันนำเข้าซ้ำ) และเขียน audit CSV
(มี `testSetId` ครบทุกข้อ) ไว้ที่ `reports/focus-form-by-topic.csv`
