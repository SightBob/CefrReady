-- 0036: Remove the UnitsPath learning-path feature (/units, /admin/units and
-- all admin units/nodes/pages APIs). Drops the DB side so the schema and
-- database stay in sync. Order respects FK dependencies (children cascade,
-- listed explicitly for safety).

DROP TABLE IF EXISTS learning_path_backups CASCADE;
DROP TABLE IF EXISTS learning_node_progress CASCADE;
DROP TABLE IF EXISTS lesson_page_versions CASCADE;
DROP TABLE IF EXISTS lesson_pages CASCADE;
DROP TABLE IF EXISTS learning_nodes CASCADE;
DROP TABLE IF EXISTS learning_units CASCADE;
