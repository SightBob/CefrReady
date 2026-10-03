-- 0037: Test explains can be pinned to specific test sets. When a learner
-- opens one of the listed sets, the explain overlay shows automatically.
-- Empty array = not pinned (lookup still works via grammarTopic).

ALTER TABLE test_explains
  ADD COLUMN IF NOT EXISTS test_set_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
