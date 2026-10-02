INSERT INTO "test_types" ("id", "name", "description", "icon", "color", "duration", "question_count", "active")
VALUES (
  'tap-select',
  'Tap & Select',
  'แบบฝึกเลือกคำตอบจากสองตัวเลือก โดยแยกนับคะแนนแต่ละข้อย่อย',
  'MousePointer2',
  'cyan',
  20,
  20,
  'true'
)
ON CONFLICT ("id") DO NOTHING;
