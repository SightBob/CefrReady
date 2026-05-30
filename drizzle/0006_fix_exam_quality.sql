-- Migration: Fix exam quality issues
-- Categories: wrong explanations, gender mismatches, duplicates, speaker names
-- Date: 2026-05-29

-- ============================================================
-- PART 1: Fix bulk copy-paste explanation errors (IDs 1169-1202)
-- ============================================================

-- 1169: "Has Julia ___ you her new email address yet?" -> given (present perfect)
UPDATE questions SET explanation = 'ประโยคใช้ present perfect (Has + subject + past participle) กริยา give รูป past participle คือ given' WHERE id = 1169;

-- 1170: "Sorry I didn't come to your party. I ___ sick." -> felt (past tense)
UPDATE questions SET explanation = 'ประโยคอธิบายเหตุการณ์ในอดีต (didn''t come) กริยา feel จึงต้องอยู่ในรูปอดีต felt' WHERE id = 1170;

-- 1171: "I met her two months ___." -> ago
UPDATE questions SET explanation = 'ใช้ ago บอกเวลาที่ผ่านพ้นมาแล้ว (two months ago = เมื่อ 2 เดือนก่อน)' WHERE id = 1171;

-- 1172: "Richard ___ the doctor every year." -> sees (present simple)
UPDATE questions SET explanation = 'every year = ทุกปี (present simple) ประธาน Richard เป็นเอกพจน์ กริยา see จึงเติม s เป็น sees' WHERE id = 1172;

-- 1173: "I was born ___ the United States." -> in
UPDATE questions SET explanation = 'บุพบท in ใช้กับประเทศ/ชื่อประเทศ เช่น in the United States' WHERE id = 1173;

-- 1174: "Jeff keeps ___ at his watch." -> looking
UPDATE questions SET explanation = 'keep + กริยาเติม -ing (keep doing something) แปลว่า ทำอะไรซ้ำๆ อย่างต่อเนื่อง' WHERE id = 1174;

-- 1175: "___ coat is this?" -> Whose
UPDATE questions SET explanation = 'Whose ใช้ถามความเป็นเจ้าของ เช่น Whose coat is this? = เสื้อโค้ทนี้ของใคร?' WHERE id = 1175;

-- 1176: "It was one of the ___ I've ever seen." -> worst
UPDATE questions SET explanation = 'one of the + superlative + นาม (พหูพจน์) ใช้ worst เป็น superlative ของ bad แปลว่า หนึ่งในที่แย่ที่สุดที่เคยเห็น' WHERE id = 1176;

-- 1177: "But I ___ the window five minutes ago." -> opened
UPDATE questions SET explanation = 'มี ago บ่งบอกเหตุการณ์ในอดีต ใช้กริยาช่อง 2 opened' WHERE id = 1177;

-- 1178: "she can't help but ___ artistic." -> being
UPDATE questions SET explanation = 'can''t help but + กริยา V-ing แปลว่า ไม่อาจทำอะไรได้ กริยาต้องเป็น -ing' WHERE id = 1178;

-- 1179: "Hello, Simon. ___ are you?" -> How
UPDATE questions SET explanation = 'ถามสารทุกข์ ใช้ How are you? เป็นประโยคถามสุภาพมาตรฐาน' WHERE id = 1179;

-- 1180: "I leave my house ___ 7 a.m." -> at
UPDATE questions SET explanation = 'บุพบท at ใช้กับเวลาที่ระบุชั่วโมง เช่น at 7 a.m.' WHERE id = 1180;

-- 1181: "It's ___ exciting that way." -> more
UPDATE questions SET explanation = 'มี than แสดงการเปรียบเทียบขั้นกว่า ใช้ comparative: more exciting = ตื่นเต้นกว่า' WHERE id = 1181;

-- 1182: "___ would you like to fly?" -> When
UPDATE questions SET explanation = 'ถามเวลาที่ออกเดินทาง ใช้ When (เมื่อไหร่)' WHERE id = 1182;

-- 1183: "Mostly ___ my boss." -> because of
UPDATE questions SET explanation = 'because of + คำนาม ใช้บอกเหตุผล เพราะเจ้านาย = Mostly because of my boss' WHERE id = 1183;

-- 1184: "___ a minute." -> hang on
UPDATE questions SET explanation = 'hang on = รอสักครู่ คือ phrasal verb ที่ใช้บอกให้รอเล็กน้อย' WHERE id = 1184;

-- 1185: "I stopped ___ to my friend at school." -> to talk
UPDATE questions SET explanation = 'stop to + กริยา = หยุดชั่วคราวเพื่อไปทำอย่างอื่น คือหยุดเดินเพื่อไปคุยกับเพื่อน' WHERE id = 1185;

-- 1186: "Is Sam ___ than you now?" -> taller
UPDATE questions SET explanation = 'มี than แสดงการเปรียบเทียบขั้นกว่า ใช้ taller เป็น comparative ของ tall' WHERE id = 1186;

-- 1187: "I don't know where she ___." -> is
UPDATE questions SET explanation = 'ถามตำแหน่งปัจจุบันของเธอ ใช้กริยา is (present simple)' WHERE id = 1187;

-- 1188: "what I'm putting on my plate" -> what
UPDATE questions SET explanation = 'กริยานามจำพวกในบุพบท about ใช้ what เป็น relative pronoun แปลว่า สิ่งที่...ไปทำ' WHERE id = 1188;

-- 1189: "I'm still getting ___ it." -> used
UPDATE questions SET explanation = 'get used to + คำนาม/V-ing = คุ้นเคย/เริ่มชินกับ get + used + to' WHERE id = 1189;

-- 1190: "we'll ___ with something special." -> come up
UPDATE questions SET explanation = 'come up with = คิดหา/นึกบางสิ่งออกมา เช่น come up with an idea = คิดไอเดียออกมา' WHERE id = 1190;

-- 1191: "___ of them have computers." -> neither
UPDATE questions SET explanation = 'neither of + พหูพจน์ = ไม่มีอันไหนเลย (negative meaning) ใช้ with neither กริยาเป็นเอกพจน์' WHERE id = 1191;

-- 1192: "No, I ___ invited." -> wasn't
UPDATE questions SET explanation = 'ประโยคอดีต ใช้ wasn''t (was not) เป็น past passive แปลว่า ไม่ได้รับเชิญ' WHERE id = 1192;

-- 1193: "I'm worried ___ my job interview." -> about
UPDATE questions SET explanation = 'worried about + สิ่งที่กังวล เป็น collocation มาตรฐาน เช่น worried about the exam' WHERE id = 1193;

-- 1194: "if we ___ more time, we'd go out" -> had
UPDATE questions SET explanation = 'if clause Type 2 (สมมติในปัจจุบัน) กริยาใน if clause ต้องเป็น past simple (had)' WHERE id = 1194;

-- 1195: "I ___ there for six years now." -> have lived
UPDATE questions SET explanation = 'มี for six years (ระยะเวลาต่อเนื่องจนถึงปัจจุบัน) ใช้ present perfect: have lived' WHERE id = 1195;

-- 1196: "I ___ to Vietnam last year." -> went
UPDATE questions SET explanation = 'มี last year บ่งบอกเหตุการณ์ในอดีต ใช้กริยาช่อง 2: went' WHERE id = 1196;

-- 1197: "I ___ ride the bus." -> never
UPDATE questions SET explanation = 'ผู้ชายบอกว่าเดินทุกวัน แปลว่าไม่เคยนั่งรถเลย ใช้ never' WHERE id = 1197;

-- 1198: "What do you ___?" -> do
UPDATE questions SET explanation = 'What do you do? = คุณทำงานอะไร? เป็นประโยคถามอาชีพมาตรฐาน' WHERE id = 1198;

-- 1199: "So ___ I." -> do
UPDATE questions SET explanation = 'เห็นด้วยกับประโยคบอกเล่ากริยา present ใช้ So do I = ฉันก็เหมือนกัน' WHERE id = 1199;

-- 1200: "She's much ___, thank you." -> better
UPDATE questions SET explanation = 'much + comparative = ...กว่ามาก เช่น much better = ดีขึ้นมาก' WHERE id = 1200;

-- 1201: "___ do you do?" -> What
UPDATE questions SET explanation = 'ถามอาชีพ ใช้ What do you do?' WHERE id = 1201;

-- 1202: "he ___ 20 minutes ago." -> left
UPDATE questions SET explanation = 'มี ago บ่งบอกเหตุการณ์ในอดีต ใช้กริยาช่อง 2: left' WHERE id = 1202;


-- ============================================================
-- PART 2: Fix gender mismatches in question_text + correct_answer
-- ============================================================

-- 772: Question asks "the woman" but answer paraphrases the man's question
UPDATE questions SET question_text = 'What does the man want to know?' WHERE id = 772;

-- 774: Question asks "the man" but answer paraphrases the woman's question
UPDATE questions SET question_text = 'What does the woman want to know?' WHERE id = 774;

-- 793: Question asks "the woman" but answer describes the man's feelings
UPDATE questions SET question_text = 'What does the man imply?' WHERE id = 793;

-- 795: Question asks "the woman" but the MAN replied "No, but I can begin in two weeks"
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 795;

-- 839: Question asks "the woman" but answer says she doesn't like it (she actually praised it)
UPDATE questions SET question_text = 'What does the man mean?',
  option_a = 'He doesn''t know the artist.',
  option_b = 'He doesn''t like the painting.',
  option_c = 'He doesn''t understand the question.' WHERE id = 839;

-- 874: Question asks "the woman mean" but Speaker B (Man) is the one who said "I'm full"
UPDATE questions SET question_text = 'What does the man mean?' WHERE id = 874;

-- 869: Answer C says "He agrees Liza won" but the man said "challenge the result" (disagrees)
-- Original option D was "—" (empty dash), replace it with a meaningful option
UPDATE questions SET correct_answer = 'A', option_a = 'He thinks Liza may not have won fairly.', option_b = 'He agrees Liza Ferretti really won.', option_c = 'Few people voted for Liza Ferretti.', option_d = 'He wants to challenge the election result.' WHERE id = 869;
UPDATE questions SET explanation = 'ผู้ชายบอกว่าควร "challenge the result in court" (ท้าทานผลการเลือกตั้งในศาล) แสดงว่าเขาไม่เห็นด้วยกับผลลัพธ์ และคิดว่า Liza อาจชนะมาไม่โดยชอบธรรม' WHERE id = 869;

-- 766: Question asks "the woman" but answer describes the MAN's situation
UPDATE questions SET question_text = 'What does the man mean?',
  option_a = 'He regularly saw his cousins during the holidays.',
  option_b = 'He rarely got to see his cousins on holidays.',
  option_c = 'He usually traveled long distances for holidays.' WHERE id = 766;


-- ============================================================
-- PART 3: Delete duplicate questions
-- ============================================================

-- 1287 is a duplicate of 1264 (identical listening transcript about Jane/beach)
DELETE FROM questions WHERE id = 1287;

-- 877 is a duplicate of 844 (identical focus-meaning about "mother feeling much better")
DELETE FROM questions WHERE id = 877;

-- 850 is a duplicate of 809 (identical focus-meaning about "husband/wife getting ready")
DELETE FROM questions WHERE id = 850;

-- 838 is a duplicate of 766 (same conversation about cousins)
DELETE FROM questions WHERE id = 838;

-- 857 is a duplicate of 766 (same conversation, already updated above)
DELETE FROM questions WHERE id = 857;

-- 819 is a duplicate of 763 (same conversation about "too soon for promotion")
DELETE FROM questions WHERE id = 819;


-- ============================================================
-- PART 4: Fix conversation speaker names
-- ============================================================

-- 765: Speaker A is "Girl" but question asks about "the man"
UPDATE questions SET conversation = '[{"name":"Girl","text":"When I was growing up, my cousin''s family would always come over to our place for the holidays.","speaker":"A"},{"name":"Woman","text":"I wish I could say the same! Mine lived so far away.","speaker":"B"}]'::jsonb WHERE id = 765;

-- 783: Two speakers merged into one line — split properly
UPDATE questions SET conversation = '[{"name":"Son","text":"Can I have £6 for the cinema, please?","speaker":"A"},{"name":"Mother","text":"But I gave you £10 this morning!","speaker":"B"}]'::jsonb WHERE id = 783;

-- 784: Both speakers named "Father" — fix to Son + Father
UPDATE questions SET conversation = '[{"name":"Son","text":"I don''t understand tonight''s history homework.","speaker":"A"},{"name":"Father","text":"Why don''t you ask John about it?","speaker":"B"}]'::jsonb WHERE id = 784;

-- 785: All three speakers named "Girl" — fix to differentiate
UPDATE questions SET conversation = '[{"name":"Girl","text":"How many people do we need for tomorrow''s tennis match?","speaker":"A"},{"name":"Boy","text":"Four – but we only have three at the moment.","speaker":"B"},{"name":"Girl","text":"John is a good tennis player, I''ll ask him.","speaker":"A"}]'::jsonb WHERE id = 785;

-- 786: Both speakers named "Waitress" — fix to Customer + Waitress
UPDATE questions SET conversation = '[{"name":"Customer","text":"Can I have one coffee and two teas, please?","speaker":"A"},{"name":"Waitress","text":"I''m sorry. The coffee machine''s just being fixed.","speaker":"B"}]'::jsonb WHERE id = 786;

-- 769: Speaker B is "Teacher" should be more descriptive
UPDATE questions SET conversation = '[{"name":"Student","text":"I hear this professor''s class is challenging.","speaker":"A"},{"name":"Student","text":"Actually, he really bent over backwards for us with those extra sessions.","speaker":"B"}]'::jsonb WHERE id = 769;

-- 815: Both speakers named "Teacher" — fix to Teacher + Student
UPDATE questions SET conversation = '[{"name":"Teacher","text":"Don''t forget your bag.","speaker":"A"},{"name":"Student","text":"That bag isn''t mine.","speaker":"B"}]'::jsonb WHERE id = 815;

-- 810: Speaker B named "Man" but question asks about the woman
UPDATE questions SET conversation = '[{"name":"Man","text":"Do you often work at the weekends?","speaker":"A"},{"name":"Woman","text":"Only once a month.","speaker":"B"}]'::jsonb WHERE id = 810;

-- 809/850: Both speakers named "Husband" — fix to Wife + Husband
UPDATE questions SET conversation = '[{"name":"Wife","text":"I''ve been so late leaving for work in the morning.","speaker":"A"},{"name":"Husband","text":"That''s because you take your time getting ready.","speaker":"B"}]'::jsonb WHERE id = 809;


-- ============================================================
-- PART 5: Fix form-meaning cloze issues
-- ============================================================

-- 1214: Blank 22 "develop adults" is grammatically wrong
UPDATE questions SET article = '{"text":"Mary {{20}} Lillian are best friends. They went {{21}} the same elementary school in Philadelphia. Now Mary and Lillian {{22}} adults and live in Chicago. Mary is 23 {{23}} nurse and Lillian works in marketing. Lillian {{24}} one daughter and two sons. Mary is more active {{25}} Lillian. Mary likes swimming {{26}} doing yoga. Lillian prefers to {{27}} television.","title":"Mary and Lillian''s Friendship","blanks":[{"id":20,"correctAnswer":"and"},{"id":21,"correctAnswer":"to"},{"id":22,"correctAnswer":"are"},{"id":23,"correctAnswer":"a"},{"id":24,"correctAnswer":"has"},{"id":25,"correctAnswer":"than"},{"id":26,"correctAnswer":"and"},{"id":27,"correctAnswer":"watch"}]}'::jsonb WHERE id = 1214;

-- 1216: Blank 21 "my" doesn't fit context + fragmented sentence + blank 26 "is" should be "gives"
UPDATE questions SET article = '{"text":"John Jones lives {{20}} the United States with his wife, Mary. They {{21}} two children. Sally {{22}} Billy. The Jones family spends a lot {{23}} time together. The family often goes {{24}} the park. Mary likes to sit {{25}} a park bench. Sometimes she {{26}} a piece of bread to the birds.","title":"Family Weekend","blanks":[{"id":20,"correctAnswer":"in"},{"id":21,"correctAnswer":"have"},{"id":22,"correctAnswer":"and"},{"id":23,"correctAnswer":"of"},{"id":24,"correctAnswer":"to"},{"id":25,"correctAnswer":"on"},{"id":26,"correctAnswer":"gives"}]}'::jsonb WHERE id = 1216;

-- 1215: Grammar issues — "remove it." fragment + blank 27 "prove" incomplete
UPDATE questions SET article = '{"text":"People {{20}} not want flies around their houses. The best way of reducing the fly population is {{21}} find out where their food comes from {{22}} remove it. However, {{23}} this doesn''t work, you can try hanging clear plastic bags. {{24}} are filled with water over the door. Although nobody knows exactly {{25}} this works, they think it''s a lake {{26}} a pond. But whatever the reason might {{27}}, lots of people are sure it works.","title":"No More Flies","blanks":[{"id":20,"correctAnswer":"do"},{"id":21,"correctAnswer":"to"},{"id":22,"correctAnswer":"and"},{"id":23,"correctAnswer":"if"},{"id":24,"correctAnswer":"They"},{"id":25,"correctAnswer":"how"},{"id":26,"correctAnswer":"or"},{"id":27,"correctAnswer":"be"}]}'::jsonb WHERE id = 1215;
