const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JpgC2CWLqh!@localhost:5432/CEFR_DB' });
async function query() {
  try {
    const typesRes = await pool.query('SELECT * FROM test_types WHERE id = $1', ['form-meaning']);
    console.log('Test Types:', typesRes.rows);
    const setsRes = await pool.query('SELECT * FROM test_sets WHERE section_id = $1', ['form-meaning']);
    console.log('Existing Test Sets for form-meaning:', setsRes.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
query();
