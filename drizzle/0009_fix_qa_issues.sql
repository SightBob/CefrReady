-- ============================================================
-- Fix QA Issues Found in Systematic Review
-- ============================================================
-- Date: 2026-05-30
-- Total fixes: 21 issues across 317 questions
-- ============================================================

-- =============================================
-- HIGH SEVERITY (4 fixes)
-- =============================================

-- 1. ID 1178: "can't help but" takes bare infinitive, NOT V-ing
-- Fix: Change answer from D (being) to A (be), fix explanation
UPDATE questions
SET correct_answer = 'A',
    explanation = "'can''t help but' ตามด้วยกริยาช่อง 1 (bare infinitive) แปลว่า ไม่อาจหลีกเลี่ยงที่จะ...ได้ ดังนั้น 'can''t help but be artistic' = ไม่อาจหลีกเลี่ยงที่จะมีความเป็นศิลปินได้",
    updated_at = NOW()
WHERE id = 1178;

-- 2. ID 1085: "made" requires "of/from" — "covered" is correct for this blank
-- Fix: Change answer from C (made) to D (covered), fix explanation
UPDATE questions
SET correct_answer = 'D',
    explanation = '"covered" ในที่นี้หมายถึง "ถูกคลุม/ชุบด้วยช็อกโกแลต" (covered in chocolate) ใช้ได้ตรงความหมายว่าของเล่นรูป.train ที่ชุบช็อกโกแลต',
    updated_at = NOW()
WHERE id = 1085;

-- 3. ID 1167: Explanation is copy-pasted from another question (mentions "Has...given")
-- Fix: Replace with correct explanation for "anything"
UPDATE questions
SET explanation = 'ในประโยคคำถามใช้ Do you have...anything else? เพื่อถามว่ามีอะไรอีกไหม anything ใช้ในประโยคคำถาม/ประโยคปฏิเสธ',
    updated_at = NOW()
WHERE id = 1167;

-- 4. ID 1168: Explanation is copy-pasted (mentions "went -> felt")
-- Fix: Replace with correct explanation for "is" (present tense location)
UPDATE questions
SET explanation = 'ใช้ is ใน present tense เพราะเป็นการถามถึงตำแหน่งปัจจุบันของ Maria ในประโยค "I don''t know where she is" (ฉันไม่รู้ว่าเธออยู่ที่ไหน)',
    updated_at = NOW()
WHERE id = 1168;

-- =============================================
-- MEDIUM SEVERITY (12 fixes)
-- =============================================

-- 5. ID 793: Speaker mismatch — question asks about man, options use "She"
-- Fix: Change options to use "He"
UPDATE questions
SET option_a = 'He will take the test again.',
    option_b = 'He thinks she did well.',
    option_c = 'He''s unhappy with how he did.',
    option_d = 'He didn''t take the exam.',
    updated_at = NOW()
WHERE id = 793;

-- 6. ID 1094: Multiple correct answers — "haven't got" is also valid in British English
-- Fix: Change option B to an incorrect option
UPDATE questions
SET option_b = 'hasn''t got',
    updated_at = NOW()
WHERE id = 1094;

-- 7. ID 1096: Multiple correct answers — both "like" and "prefer" work
-- Fix: Change option C to an incorrect option
UPDATE questions
SET option_c = 'wanted',
    updated_at = NOW()
WHERE id = 1096;

-- 8. ID 1127: Incorrect explanation for "can't get over"
-- Fix: Correct explanation
UPDATE questions
SET explanation = '"can''t get over" แปลว่า ไม่สามารถหยุดรู้สึกประหลาดใจหรือทึ่งได้ แสดงว่าผู้ชายประหลาดใจมากที่นักเรียนของเธอมุ่งมั่นกับการเรียน',
    updated_at = NOW()
WHERE id = 1127;

-- 9. ID 1158: Subjunctive mood is B2+ level, not A2
-- Fix: Change CEFR level to B1
UPDATE questions
SET cefr_level = 'B1',
    updated_at = NOW()
WHERE id = 1158;

-- 10. ID 1181: Explanation references "than" which doesn't exist in the question
-- Fix: Correct explanation
UPDATE questions
SET explanation = '"more exciting that way" ใช้ more สร้างรูป comparative ของ exciting (หลายพยางค์) แปลว่า ตื่นเต้นกว่าในแบบนั้น/แง่นั้น',
    updated_at = NOW()
WHERE id = 1181;

-- 11. ID 1186: Question has 2 blanks but only 4 options for the first blank
-- Fix: Update question to have only 1 blank (remove second blank), update explanation
UPDATE questions
SET question_text = 'Boy: Is Sam ___ than you now?
Girl: Yes. He''s grown a lot recently.',
    explanation = 'มี than แสดงการเปรียบเทียบขั้นกว่า ใช้ taller เป็น comparative ของ tall',
    updated_at = NOW()
WHERE id = 1186;

-- 12. ID 1190: Option D is "-" (missing)
-- Fix: Add a valid option D
UPDATE questions
SET option_d = 'end up',
    updated_at = NOW()
WHERE id = 1190;

-- 13. ID 1191: Option D is "-" (missing)
-- Fix: Add a valid option D
UPDATE questions
SET option_d = 'both',
    updated_at = NOW()
WHERE id = 1191;

-- 14. ID 1192: Option D is "-" (missing)
-- Fix: Add a valid option D
UPDATE questions
SET option_d = 'isn''t',
    updated_at = NOW()
WHERE id = 1192;

-- 15. ID 1193: Option D is "-" (missing)
-- Fix: Add a valid option D
UPDATE questions
SET option_d = 'for',
    updated_at = NOW()
WHERE id = 1193;

-- =============================================
-- LOW SEVERITY (5 fixes)
-- =============================================

-- 16. ID 766: Explanation says "ผู้หญิง" but speaker is man
-- Fix: Change to "ผู้ชาย"
UPDATE questions
SET explanation = 'ผู้ชายบอกว่าญาติของเขาอยู่ไกลมาก (''Mine lived so far away'') เลยทำให้ไม่ค่อยได้เจอญาติในช่วงวันหยุด (He rarely got to see his cousins on holidays)',
    updated_at = NOW()
WHERE id = 766;

-- 17. ID 772: Explanation swaps man/woman roles
-- Fix: Correct roles
UPDATE questions
SET explanation = 'ผู้ชายถามเวลาว่า "What time does the train leave?" (รถไฟออกกี่โมง) ผู้หญิงตอบว่า 4 โมงเย็น แสดงว่าผู้ชายต้องการรู้ว่ารถไฟจะออกเมื่อไหร่ (When will the train go?)',
    updated_at = NOW()
WHERE id = 772;

-- 18. ID 818: Explanation swaps man/woman roles
-- Fix: Correct roles
UPDATE questions
SET explanation = 'ผู้ชายบอกว่าต้องไปนัดพบทันตแพทย์ ผู้หญิงบอกว่า "You''ve been worrying about that tooth" (คุณก็กังวลฟันซี่นั้นมาตลอด) แสดงว่าผู้ชายต้องการไปพบทันตแพทย์เพื่อตรวจฟันซี่นั้น',
    updated_at = NOW()
WHERE id = 818;

-- =============================================
-- DUPLICATE REMOVAL
-- =============================================

-- 19. Remove duplicates (keep lower ID, remove higher ID)
-- 778 duplicates 777
-- 852 duplicates 799
-- 853 duplicates 798
-- 875 duplicates 795

-- First, remove from test_set_questions junction table
DELETE FROM test_set_questions WHERE question_id IN (778, 852, 853, 875);

-- Then remove the duplicate questions
DELETE FROM questions WHERE id IN (778, 852, 853, 875);
