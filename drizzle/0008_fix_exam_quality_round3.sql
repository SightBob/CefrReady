-- Migration: Fix exam quality issues — Round 3 (questions (2).csv audit)
-- Categories: speaker mismatches, pronoun errors in options, wrong answers,
--           explanation mismatches, duplicates, Thai typos
-- Date: 2026-05-30

-- ============================================================
-- PART 1: Fix question_text speaker mismatches (focus-meaning)
-- Note: 0006 fixed some conversations but NOT the question_text
-- ============================================================

-- 765: 0006 fixed conv to Girl/Woman but question_text still says "the man"
UPDATE questions SET question_text = 'What does the woman mean by her first comment?' WHERE id = 765;

-- 771: Question asks "the man" but answer describes Person B's response
UPDATE questions SET question_text = 'What does the second speaker mean?' WHERE id = 771;

-- 776: Question asks "the brother" but speakers are Man/Person B
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 776;

-- 790: Question asks "the son" but speaker is "Man"
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 790;

-- 835: Question asks "the woman" but answer describes man's schedule
UPDATE questions SET question_text = 'What does the man mean?',
  option_c = 'He works on Saturday and Sunday.' WHERE id = 835;

-- 837: Question asks "the woman" but answer describes man giving the dictionary
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 837;

-- 848: Question asks "the woman" but answer describes man's restaurant info
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 848;

-- 868: Question asks "the husband" but the husband only asks; Man(B) gives the answer
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 868;

-- 873: Question asks "the woman" but answer describes man's question about flight time
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 873;


-- ============================================================
-- PART 2: Fix pronoun errors in options (He↔She mismatches)
-- ============================================================

-- 818: Option B says "She wants a dentist to check her tooth" but MAN needs dentist
UPDATE questions SET option_b = 'He wants a dentist to check his tooth.' WHERE id = 818;

-- 849: Option A says "She likes many types of art" but MAN spoke
UPDATE questions SET option_a = 'He likes many types of art.' WHERE id = 849;

-- 855: Option C says "the man" but speakers are Mother/Daughter
UPDATE questions SET option_c = 'She thinks her daughter needs to use the computer more.',
  explanation = 'แม่บอกลูกสาวว่า "You need to get with the times!" (คุณต้องทำตัวให้ทันสมัยสิ!) และ "you''ve hardly touched it" (แทบไม่ได้ใช้เลย) แสดงว่าแม่คิดว่าลูกสาวควรใช้คอมพิวเตอร์ให้มากขึ้น' WHERE id = 855;

-- 871: Option A says "He knows the town well" but WOMAN said it
UPDATE questions SET option_a = 'She knows the town well.' WHERE id = 871;


-- ============================================================
-- PART 3: Fix option_a for ID 833 (wrong blame attribution)
-- ============================================================

-- 833: Man blames woman for wrong traffic prediction ("You said the traffic would be light")
-- Current option A "It's the man's fault they are late" is wrong — man blames woman
UPDATE questions SET option_a = 'The traffic is heavier than she expected.' WHERE id = 833;


-- ============================================================
-- PART 4: Fix conversation speaker names
-- ============================================================

-- 775: Both speakers named "Boy" — fix speaker B to "Friend"
UPDATE questions SET conversation = '[{"name":"Boy","text":"What sort of books do you like reading?","speaker":"A"},{"name":"Friend","text":"Well, anything really.","speaker":"B"}]'::jsonb WHERE id = 775;

-- 825: Speakers are "Person A"/"Person B" — fix to proper names
UPDATE questions SET conversation = '[{"name":"Student","text":"May I use your computer next week?","speaker":"A"},{"name":"Teacher","text":"That''s not really up to me.","speaker":"B"}]'::jsonb WHERE id = 825;

-- 776: Speakers are "Man"/"Person B" — fix Person B name
UPDATE questions SET conversation = '[{"name":"Man","text":"I don''t know what you see in fishing…","speaker":"A"},{"name":"Boy","text":"You just don''t get it, do you? It''s not about how many fish you catch.","speaker":"B"}]'::jsonb WHERE id = 776;

-- 790: Only 1 speaker "Man" — keep as is, question_text already fixed above


-- ============================================================
-- PART 5: Fix focus-form wrong answers
-- ============================================================

-- 1085: "A toy train ___ chocolate" with answer "made" = broken sentence
-- "A toy train made chocolate" makes no sense; must be "made of"
UPDATE questions SET option_c = 'made of' WHERE id = 1085;

-- 1178: "can't help but ___ artistic" — grammar rule: can't help but + base form
-- Answer D "being" is wrong; correct is A "be"
UPDATE questions SET correct_answer = 'A',
  explanation = 'can''t help but + กริยาช่อง 1 (base form) แปลว่า ไม่อาจหลีกเลี่ยง/จำเป็นต้องทำ เช่น she can''t help but be artistic' WHERE id = 1178;


-- ============================================================
-- PART 6: Fix explanation mismatches
-- ============================================================

-- 1127: "can't get over" in this context = "amazed/impressed", NOT "move on"
UPDATE questions SET explanation = 'can''t get over = ทึ่ง/ประทับใจมากจนเลิกทำใจไม่ได้ เช่น I can''t get over how focused they are = ทำไมพวกเขาตั้งใจดีขนาดนี้' WHERE id = 1127;

-- 1181: Explanation references "than" but question has NO "than"
UPDATE questions SET explanation = 'ใช้ comparative: more exciting = ตื่นเต้นกว่า เปรียบเทียบแบบปริยาย (ไม่จำเป็นต้องมี than ในประโยค)' WHERE id = 1181;

-- 1151: Explanation doesn't distinguish "getting" vs "having"
UPDATE questions SET explanation = 'getting a cold = กำลังจะเป็น/เริ่มมีอาการหวัด (ต่างจาก having a cold = เป็นหวัดอยู่แล้ว) บริบทสนทนาบ่งบอกว่าเพิ่งเริ่มมีอาการ' WHERE id = 1151;


-- ============================================================
-- PART 7: Fix form-meaning article blanks
-- ============================================================

-- 1213: Blank {{25}} answer "an" → "and" ("break eggs and into a bowl")
UPDATE questions SET article = jsonb_set(
  article::jsonb,
  '{blanks}',
  (
    SELECT jsonb_agg(
      CASE WHEN elem->>'id' = '25'
        THEN jsonb_set(elem, '{correctAnswer}', '"and"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(article::jsonb->'blanks') AS elem
  )
) WHERE id = 1213;

-- 1215: Blank {{25}} "how" → "why" (next sentence explains WHY, not HOW)
-- Also blank {{24}} "They" → "The bags" for clarity
UPDATE questions SET article = jsonb_set(
  article::jsonb,
  '{blanks}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = '24' THEN jsonb_set(elem, '{correctAnswer}', '"The bags"')
        WHEN elem->>'id' = '25' THEN jsonb_set(elem, '{correctAnswer}', '"why"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(article::jsonb->'blanks') AS elem
  )
) WHERE id = 1215;

-- 1217: "for him" → "for you" (direct address letter to Tim)
UPDATE questions SET article = jsonb_set(
  article::jsonb,
  '{blanks}',
  (
    SELECT jsonb_agg(
      CASE WHEN elem->>'id' = '23'
        THEN jsonb_set(elem, '{correctAnswer}', '"you"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(article::jsonb->'blanks') AS elem
  )
) WHERE id = 1217;


-- ============================================================
-- PART 8: Delete duplicate questions
-- ============================================================

-- 863: Near-duplicate of 830 (same conversation about friend leaving)
DELETE FROM questions WHERE id = 863;

-- 1043: Exact duplicate of 1111 ("How far is ___ to the bus stop?")
DELETE FROM questions WHERE id = 1043;


-- ============================================================
-- PART 9: Fix listening issues
-- ============================================================

-- 1256: Question asks "the man" but WOMAN said "I'm not sure who I'll vote for"
-- Man said "I don't know either" (agreeing) — change to ask about woman
UPDATE questions SET question_text = 'What does the woman say she''s unsure about?' WHERE id = 1256;

-- 1259: Option "boring" is confusing — she said "I'm never bored"
-- Change question so answer makes sense: "She says her family life is NOT ___"
UPDATE questions SET question_text = 'She says her family life is NOT ___.' WHERE id = 1259;

-- 1288: Thai typo "พูดคุม" → "พูดคุย"
UPDATE questions SET explanation = REPLACE(explanation, 'พูดคุม', 'พูดคุย') WHERE id = 1288;
