-- Questions: add sub-topic grammar label
-- เก็บ sub-topic ละเอียดยิบใต้ grammarTopic (เช่น "Present Perfect: ever/never")
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "sub_topic_grammar" varchar(200);
