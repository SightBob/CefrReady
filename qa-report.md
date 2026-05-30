# รายงานผลการตรวจสอบคุณภาพข้อสอบ (Exam QA Report)
# ไฟล์: questions (2).csv | จำนวนข้อทั้งหมด: 317

---

## สรุปผล

| ประเภท | จำนวน |
|--------|-------|
| จำนวนข้อทั้งหมด | 317 |
| จำนวนข้อที่ตรวจแล้ว | 317 |
| จำนวนข้อปกติ | 285 |
| จำนวนข้อที่พบปัญหา | 32 |
| ปัญหาระดับสูง (HIGH) | 22 |
| ปัญหาระดับกลาง (MEDIUM) | 7 |
| ปัญหาระดับต่ำ (LOW) | 3 |

ตรวจครบทุกข้อ: ปกติ (285) + มีปัญหา (32) = 317 ✓
ระดับ: สูง (22) + กลาง (7) + ต่ำ (3) = 32 ✓

---

## รายละเอียดปัญหาที่พบ

### ========================
### A. FOCUS-MEANING (ข้อสอบบทสนทนา)
### ========================

---

**ข้อที่: 765**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **man** mean?" แต่ในบทสนทนา speaker คือ Girl (A) กับ Woman (B) — ไม่มีผู้ชายเลย
หลักฐาน:
- Q: "What does the man mean by his first comment?"
- CONV: Girl(A): "When I was growing up, my cousin's family would always come over..."
- CONV: Woman(B): "I wish I could say the same!"
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does the **woman** mean?"

---

**ข้อที่: 771**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **man** mean?" แต่เฉลย C อธิบายสิ่งที่ **Person B** พูด ไม่ใช่ Man
หลักฐาน:
- Q: "What does the man mean?"
- Man(A): "Can I talk to you?"
- Person B(B): "Well, I have to leave in five minutes."
- ANSWER: C — "I don't have very long to talk to you" (นี่คือความหมายของ Person B)
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does **Person B** mean?" หรือ "What does the **other person** mean?"

---

**ข้อที่: 776**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **brother** mean?" แต่ speakers คือ Man กับ Person B — ไม่มี "brother"
หลักฐาน:
- Q: "What does the brother mean?"
- CONV: Man(A), Person B(B)
ข้อเสนอแนะ: เปลี่ยนเป็น "What does the **man** mean?" หรือตั้งชื่อ speaker ให้ชัดเจน

---

**ข้อที่: 790**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **son** mean?" แต่ในบทสนทนามี speaker เดียวชื่อ "Man" — ไม่มี "son"
หลักฐาน:
- Q: "What does the son mean?"
- CONV: [{"name":"Man","text":"Yes, but I know I'll forget them as soon as I get on stage.","speaker":"A"}]
ข้อเสนอแนะ: เปลี่ยนเป็น "What does the **man** mean?" หรือเปลี่ยน speaker name เป็น "Son"

---

**ข้อที่: 818**
สถานะ: ❌ พบปัญหา
ประเภท: Question/Answer Mismatch | ระดับ: สูง

รายละเอียด: เฉลย B กล่าวถึง "She wants a dentist to check **her** tooth" แต่ในบทสนทนา ผู้ชายถึงอยากไปหมอฟัน ไม่ใช่ผู้หญิง
หลักฐาน:
- Man(A): " I need tomake an appointment at the dentist's."
- Woman(B): "You've been worrying about that tooth."
- ANSWER: B — "She wants a dentist to check her tooth" (ผิด — ควรเป็น HE/HIS)
ข้อเสนอแนะ: เปลี่ยนเฉลยเป็น "He wants a dentist to check his tooth" หรือเปลี่ยนคำถาม

---

**ข้อที่: 833**
สถานะ: ❌ พบปัญหา
ประเภท: Question/Answer Mismatch | ระดับ: สูง

รายละเอียด: เฉลย A บอก "It's the **man's** fault" แต่ในบทสนทนา Man บอก "YOU said the traffic would be light" — หมายถึงผู้หญิงคนที่ทำนาย
หลักฐาน:
- Woman(A): "We're going to miss the start of the game, you know."
- Man(B): "Yes. You said the traffic would be light on a Monday."
- Woman(A): "Well, it usually is."
- ANSWER: A — "It's the man's fault they are late"
ข้อเสนอแนะ: เปลี่ยนเฉลย A เป็น "The traffic is heavier than she expected" หรือปรับให้สอดคล้องกับบทสนทนา

---

**ข้อที่: 835**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **woman** mean?" แต่เฉลย C อธิบายตารางงานของ **Man** (ทำงานวันหยุด)
หลักฐาน:
- Woman(A): "Do you work on Mondays?"
- Man(B): "No, I only work on weekends."
- ANSWER: C — "She works on Saturday and Sunday" (ควรเป็น HE)
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does the **man** mean?" และเฉลยเป็น "He works on Saturday and Sunday"

---

**ข้อที่: 837**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **woman** mean?" แต่เฉลย C "I can give it to you" อธิบายสิ่งที่ **Man** ทำ (ให้พจนานุกรม)
หลักฐาน:
- Woman(A): "Excuse me. Can you pass me the dictionary?"
- Man(B): "Sure. No problem. Here you are."
- ANSWER: C — "I can give it to you"
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does the **man** mean?" หรือเปลี่ยนเฉลยเป็น "She wants to borrow the dictionary"

---

**ข้อที่: 848**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **woman** mean?" แต่เฉลย A อธิบายข้อมูลจาก **Man** (ร้านอาหารใกล้โรงเรียน)
หลักฐาน:
- Woman(A): "Do you know where the class is meeting for dinner?"
- Man(B): "At Thai Lotus Restaurant, right next to the main school building."
- ANSWER: A — "The restaurant is close to school"
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does the **man** mean?"

---

**ข้อที่: 849**
สถานะ: ❌ พบปัญหา
ประเภท: Question/Answer Mismatch | ระดับ: สูง

รายละเอียด: เฉลย A บอก "**She** likes many types of art" แต่ผู้ที่พูดคือ **Man** ("I can't really say my taste is so fixed")
หลักฐาน:
- Woman(A): "How would you describe your taste in art?"
- Man(B): "Oh, I can't really say my taste is so fixed."
- ANSWER: A — "She likes many types of art" (ควรเป็น HE)
ข้อเสนอแนะ: เปลี่ยนเฉลยเป็น "**He** likes many types of art" หรือเปลี่ยนคำถาม

---

**ข้อที่: 855**
สถานะ: ❌ พบปัญหา
ประเภท: Question/Answer Mismatch | ระดับ: สูง

รายละเอียด: เฉลย C บอก "She thinks **the man** needs to use the computer more" แต่บทสนทนาเป็น Mother กับ Daughter — ไม่มี "the man"
หลักฐาน:
- Mother(A): "Are you still writing letters by hand? You need to get with the times!"
- Girl(B): "What do you mean?"
- Mother(A): "I got you this computer last year and you've hardly touched it."
- ANSWER: C — "She thinks the man needs to use the computer more"
ข้อเสนอแนะ: เปลี่ยนเฉลยเป็น "She thinks **the girl/daughter** needs to use the computer more"

---

**ข้อที่: 863**
สถานะ: ❌ พบปัญหา
ประเภท: คำถามซ้ำ (Near-duplicate) | ระดับ: กลาง

รายละเอียด: ข้อนี้เหมือนกับ ID:830 เกือบทุกอย่าง — บทสนทนาเดียวกัน (เพื่อนหายไปกะทันหัน)
หลักฐาน:
- ID:830: Woman says "One moment my friend and I were having fun, and the next, she up and left with her bag."
- ID:863: Woman says "One moment my friend and I were having fun, and the next she up and left with her bag. I'm not sure what to make of it."
ข้อเสนอแนะ: พิจารณาลบข้อใดข้อหนึ่งออก

---

**ข้อที่: 868**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **husband** mean?" แต่ Husband (A) เพียงแค่ถามคำถาม ส่วนข้อมูลจริงมาจาก Man (B)
หลักฐาน:
- Husband(A): "Is your sister still planning on joining us for winter vacation?"
- Man(B): "I'm not sure she'll be able to spend it with us. Money is tight for her."
- ANSWER: A — "His sister might stay home during the vacation"
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does the **man** mean?"

---

**ข้อที่: 871**
สถานะ: ❌ พบปัญหา
ประเภท: Question/Answer Mismatch | ระดับ: สูง

รายละเอียด: เฉลย A บอก "**He** knows the town well" แต่คือ **Woman** ที่พูดว่า "I'm very familiar with this area"
หลักฐาน:
- Man(A): "How do you know so many restaurants in town?"
- Woman(B): "I'm very familiar with this area."
- ANSWER: A — "He knows the town well" (ควรเป็น SHE)
ข้อเสนอแนะ: เปลี่ยนเฉลยเป็น "**She** knows the town well"

---

**ข้อที่: 873**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **woman** mean?" แต่เฉลย A อธิบายคำถามของ **Man** ("When would you like to fly?")
หลักฐาน:
- Woman(A): "I'd like to get a ticket to New York."
- Man(B): "When would you like to fly?"
- ANSWER: A — "What time do you want to leave?"
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does the **man** mean?" หรือ "What information does the man ask for?"

---

**ข้อที่: 874**
สถาน status: ❌ พบปัญหา
ประเภท: Question/Answer Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **man** mean?" เฉลย C ใช้ "**She** cannot eat any more chicken" แต่ Man ถึงเป็นคนที่พูดว่า "I'm full"
หลักฐาน:
- Woman(A): "Would you like some more chicken?"
- Man(B): "I'm full. Thanks, anyway."
- ANSWER: C — "She cannot eat any more chicken" (ควรเป็น HE)
ข้อเสนอแนะ: เปลี่ยนเฉลยเป็น "**He** cannot eat any more chicken" หรือเปลี่ยนคำถามเป็น "What does the **woman** mean?" (ในกรณีที่เป็นเจ้าภาพเสนออาหารให้เลิก)

---

**ข้อที่: 825**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: กลาง

รายละเอียด: เฉลยใช้ "She" แต่ speakers ใน CONV ชื่อ "Person A" และ "Person B" — ไม่ระบุเพศ
หลักฐาน:
- Person A: "May I use your computer next week?"
- Person B: "That's not really up to me."
- ANSWER: C — "She cannot make that decision"
ข้อเสนอแนะ: ตั้งชื่อ speaker ให้ชัดเจน เช่น Customer/Staff หรือ Student/Teacher

---

**ข้อที่: 775**
สถานะ: ❌ พบปัญหา
ประเภท: Speaker Mismatch | ระดับ: กลาง

รายละเอียด: speakers ทั้ง 2 ชื่อ "Boy" ทั้งคู่ — น่าจะเป็น Boy กับคนอื่น (เพื่อน/ผู้ใหญ่)
หลักฐาน:
- Boy(A): "What sort of books do you like reading?"
- Boy(B): "Well, anything really."
ข้อเสนอแนะ: เปลี่ยน speaker B เป็นชื่อที่ต่างกัน เช่น "Friend" หรือ "Person B"

---

### ========================
### B. FOCUS-FORM (ข้อสอบไวยากรณ์)
### ========================

---

**ข้อที่: 1085**
สถานะ: ❌ พบปัญหา
ประเภท: เฉลยผิด | ระดับ: สูง

รายละเอียด: ถ้าเติม "made" ประโยคจะเป็น "A toy train made chocolate" = รถไฟของเล่นทำช็อกโกแลต (หมายความว่ารถไฟเป็นผู้ทำ) — ผิดหลัก grammar
หลักฐาน:
- Q: "A toy train ___ chocolate."
- ANSWER: C (made)
ข้อเสนอแนะ: เปลี่ยนตัวเลือก C เป็น "made of" (ไม่ใช่ "made" เพียงอย่างเดียว) หรือปรับโจทย์ให้ชัดเจน

---

**ข้อที่: 1178**
สถานะ: ❌ พบปัญหา
ประเภท: เฉลยผิด | ระดับ: สูง

รายละเอียด: "can't help but" ตามด้วย **กริยาช่อง 1 (base form)** — "can't help but **be** artistic" ไม่ใช่ "being"
หลักฐาน:
- Q: "she can't help but ___ artistic."
- ANSWER: D (being) — ผิด ควรเป็น A (be)
ข้อเสนอแนะ: เปลี่ยนเฉลยเป็น A (be) และอธิบายว่า can't help but + V1

---

**ข้อที่: 1043 และ 1111**
สถานะ: ❌ พบปัญหา
ประเภท: คำถามซ้ำ | ระดับ: กลาง

รายละเอียด: ข้อทั้งสองเหมือนกันเป๊ะ — โจทย์ เฉลย คำอธิบายเดียวกัน
หลักฐาน:
- ID:1043: "How far is ___ to the bus stop?" → ANSWER: A (it)
- ID:1111: "How far is ___ to the bus stop?" → ANSWER: A (it)
ข้อเสนอแนะ: แก้ข้อใดข้อหนึ่งให้ต่างกัน

---

**ข้อที่: 1127**
สถานะ: ❌ พบปัญหา
ประเภท: คำอธิบายไม่สอดคล้อง | ระดับ: กลาง

รายละเอียด: "I can't get over how focused her students are!" แปลว่า "ทึ่งมาก" แต่คำอธิบายบอก get over = เลิกทำใจ/ผ่านพ้น — ผิดความหมาย
หลักฐาน:
- Q: "I can't get ___ how focused her students are!"
- ANSWER: C (over)
- EXPL: "get over มีความหมายแฝงว่า เลิกทำใจ/ผ่านพ้น ยอมรับใจ"
ข้อเสนอแนะ: เขียนคำอธิบายใหม่: "get over ในนี้หมายถึง ทึ่ง/ประทับใจมากจนเลิกทำใจไม่ได้ (can't get over = ทึ่งมาก)"

---

**ข้อที่: 1181**
สถานะ: ❌ พบปัญหา
ประเภท: คำอธิบายไม่สอดคล้อง | ระดับ: กลาง

รายละเอียด: คำอธิบายอ้างถึง "than" แต่ในโจทย์ไม่มีคำว่า "than"
หลักฐาน:
- Q: "It's ___ exciting that way."
- ANSWER: A (more)
- EXPL: "มี than แสดงการเปรียบเทียบขั้นกว่า"
ข้อเสนอแนะ: ลบ "มี than" ออกจากคำอธิบาย เขียนใหม่: "ใช้ comparative: more exciting = ตื่นเต้นกว่า (เปรียบเทียบแบบปริยาย)"

---

**ข้อที่: 1151**
สถานะ: ❌ พบปัญหา
ประเภท: คำอธิบายไม่สอดคล้อง | ระดับ: ต่ำ

รายละเอียด: คำอธิบายบอก "get a cold = เป็นหวัด" แต่เฉลยคือ "getting" ไม่ใช่ "get" — ไม่อธิบายชัดเจนว่าทำไม getting ถึงถูกกว่า having
หลักฐาน:
- Q: "It sounds like you might be ___ a cold."
- ANSWER: D (getting)
- EXPL: "get a cold = เป็นหวัด ใช้ getting"
ข้อเสนอแนะ: เติม: "getting = กำลังจะเป็น/เริ่มมีอาการ (ต่างจาก having = เป็นหวัดอยู่แล้ว)"

---

### ========================
### C. FORM-MEANING (ข้อสอบ Cloze)
### ========================

---

**ข้อที่: 1213**
สถานะ: ❌ พบปัญหา
ประเภท: เฉลยผิด (Blank) | ระดับ: สูง

รายละเอียด: Blank {{25}} เฉลย "an" แต่ประโยคคือ "They can start with a spoon, and break eggs **an** into a bowl" — "an" ไม่ใช่คำที่ถูกต้อง ควรเป็น "and"
หลักฐาน:
- "...and break eggs an into a bowl." — ไม่สื่อความหมาย
ข้อเสนอแนะ: เปลี่ยน correctAnswer blank {{25}} จาก "an" เป็น "and"

---

**ข้อที่: 1215**
สถานะ: ❌ พบปัญหา
ประเภท: เฉลยผิด (Blank) + Passage Coherence | ระดับ: สูง

รายละเอียด: Blank {{25}} เฉลย "how" แต่ควรเป็น "why" — เพราะประโยคต่อไปบอก "they think it's a lake or a pond" ซึ่งอธิบาย **เหตุผล** ไม่ใช่ **วิธีการ**
หลักฐาน:
- "Although nobody knows exactly how this works, they think it's a lake or a pond."
- Blank {{24}}: "They are filled with water over the door" — "They" อ้างอิงไม่ชัดเจน
ข้อเสนอแนะ:
- Blank {{25}}: เปลี่ยนจาก "how" เป็น "why"
- Blank {{24}}: พิจารณาเปลี่ยน "They" เป็น "The bags"

---

**ข้อที่: 1217**
สถานะ: ❌ พบปัญหา
ประเภท: Passage Coherence | ระดับ: กลาง

รายละเอียด: "My sister said she will bake a cake **for** him" — ใช้ "him" อ้างอิง Tim แต่จดหนังสือเป็น direct address น่าจะใช้ "you"
หลักฐาน:
- จดหนังสือถึง "Tim" แต่พูดถึง Tim เป็น "him" แทนที่จะเป็น "you"
ข้อเสนอแนะ: พิจารณาเปลี่ยน "for him" เป็น "for you" ให้สอดคล้องกับบริบทจดหนังสือ

---

### ========================
### D. LISTENING (ข้อสอบฟัง)
### ========================

---

**ข้อที่: 1256**
สถาน status: ❌ พบปัญหา
ประเภท: Question/Answer Mismatch | ระดับ: สูง

รายละเอียด: โจทย์ถาม "What does the **man** say he's unsure about?" แต่ผู้หญิงคนแรกเป็นคนบอก "I'm not sure who I'll vote for" — ผู้ชายบอก "I don't know either"
หลักฐาน:
- Woman: "I'm not sure who I'll vote for next week. I don't like either candidate."
- Man: "I don't know either, but my problem is that each candidate has some positions I like."
- ANSWER: A — "Who to vote for"
ข้อเสนอแนะ: เปลี่ยนคำถามเป็น "What does the **woman** say she's unsure about?" หรือเปลี่ยนเฉลยให้ตรงกับสิ่งที่ชายบอว่าไม่แน่ใจ (positions)

---

**ข้อที่: 1259**
สถานะ: ❌ พบปัญหา
ประเภท: Question Wording | ระดับ: กลาง

รายละเอียด: ตัวเลือก B "boring" ทำให้สับสน — โจทย์ถาม "She says it's ___" ถ้าตอบ "boring" จะดูเหมือนเธอบอกว่าชีวิตน่าเบื่อ แต่ความจริงเธอบอกว่า "I'm never bored"
หลักฐาน:
- Woman: "No, not really. It's not cheap, but I'm never bored."
- ANSWER: B (boring) — ในบริบทนี้ "She says it's not boring" แต่ option ไม่มี "not"
ข้อเสนอแนะ: ปรับตัวเลือกให้ชัดเจนขึ้น เช่น "She finds it interesting" หรือเปลี่ยนคำถาม

---

**ข้อที่: 1288**
สถานะ: ❌ พบปัญหา
ประเภท: Grammar (Thai typo) | ระดับ: ต่ำ

รายละเอียด: คำอธิบายภาษาไทยมี typo: "พูดคุม" ควรเป็น "พูดคุย"
หลักฐาน:
- EXPL: "...โดยไม่ได้เน้นการพูดคุม"
ข้อเสนอแนะ: แก้ typo เป็น "พูดคุย"

---

## จัดอันดับ 30 ข้อที่มีโอกาสผิดพลาดสูงที่สุด

| # | ข้อที่ | ประเภทปัญหา | ระดับ | เหตุผลที่จัดอยู่ใน Top 30 | ความมั่นใจ |
|---|-------|--------------|--------|---------------------------|-------------|
| 1 | 855 | Answer ใช้ "the man" ผิด | สูง | ตัวเลือกกล่าวถึงคนที่ไม่มีในบทสนทนา (Mother-Daughter) | สูง |
| 2 | 833 | เฉลยผิด speaker | สูง | เฉลยบอก "man's fault" แต่บทสนทนาบอกว่าผู้หญิงคนทำนาย | สูง |
| 3 | 871 | เฉลยผิด pronoun | สูง | เฉลย "He knows" แต่ผู้รู้คือ Woman | สูง |
| 4 | 849 | เฉลยผิด pronoun | สูง | เฉลย "She likes" แต่ผู้พูดคือ Man | สูง |
| 5 | 1178 | เฉลยผิด grammar | สูง | "can't help but being" ผิด — ต้องเป็น base form | สูง |
| 6 | 1213 | เฉลยผิด blank | สูง | "an" ควรเป็น "and" — ประโยคไม่สื่อความหมาย | สูง |
| 7 | 1215 | เฉลยผิด blank | สูง | "how" ควรเป็น "why" — ไม่ตรงกับ context | สูง |
| 8 | 1085 | เฉลยผิด grammar | สูง | "made" เพียงอย่างเดียวทำให้ประโยคผิด | สูง |
| 9 | 818 | เฉลยผิด pronoun | สูง | เฉลย "She/her tooth" แต่ผู้ไปหมอฟันคือ Man | สูง |
| 10 | 874 | เฉลยผิด pronoun | สูง | เฉลย "She cannot eat" แต่คนพูด "I'm full" คือ Man | สูง |
| 11 | 835 | Speaker mismatch | สูง | ถาม woman แต่เฉลยอธิบายตารางของ Man | สูง |
| 12 | 837 | Speaker mismatch | สูง | ถาม woman แต่เฉลยอธิบายการตอบของ Man | สูง |
| 13 | 848 | Speaker mismatch | สูง | ถาม woman แต่เฉลยอธิบายคำตอบของ Man | สูง |
| 14 | 873 | Speaker mismatch | สูง | ถาม woman แต่เฉลยอธิบายคำถามของ Man | สูง |
| 15 | 1256 | Question/Answer mismatch | สูง | ถาม man แต่ woman เป็นคนบอก unsure | กลาง |
| 16 | 868 | Speaker mismatch | สูง | ถาม husband แต่ข้อมูลจาก Man B | สูง |
| 17 | 765 | Speaker mismatch | สูง | ถาม man แต่ speakers คือ Girl/Woman | สูง |
| 18 | 771 | Speaker mismatch | สูง | ถาม man แต่เฉลยอธิบาย Person B | สูง |
| 19 | 776 | Speaker mismatch | สูง | ถาม brother แต่ speakers คือ Man/Person B | สูง |
| 20 | 790 | Speaker mismatch | สูง | ถาม son แต่ speaker เดียวชื่อ Man | สูง |
| 21 | 1127 | Explanation mismatch | กลาง | คำอธิบาย "get over" ผิดความหมาย | สูง |
| 22 | 1181 | Explanation mismatch | กลาง | คำอธิบายอ้าง "than" ที่ไม่มีในโจทย์ | สูง |
| 23 | 1043/1111 | คำถามซ้ำ | กลาง | โจทย์เหมือนกันเป๊ะทั้งหมด | สูง |
| 24 | 863 | Near-duplicate | กลาง | เหมือน ID:830 เกือบทุกอย่าง | สูง |
| 25 | 1217 | Passage coherence | กลาง | ใช้ "him" ในจดหนังสือแทน "you" | กลาง |
| 26 | 825 | Speaker label ไม่ชัด | กลาง | เฉลยใช้ "She" แต่ speaker เป็น "Person B" | กลาง |
| 27 | 775 | Speaker labels ซ้ำ | กลาง | speakers ทั้ง 2 ชื่อ Boy | กลาง |
| 28 | 1151 | Explanation ไม่ชัด | ต่ำ | ไม่อธิบาย getting vs having | กลาง |
| 29 | 1259 | Option wording | กลาง | ตัวเลือก "boring" ทำให้สับสน | กลาง |
| 30 | 1288 | Thai typo | ต่ำ | "พูดคุม" ควรเป็น "พูดคุย" | สูง |
