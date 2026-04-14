require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query("INSERT INTO test_sets (section_id, name, description, order_index) VALUES ('listening', 'Listening - Set 1', 'Set 1 for Listening Section', 1), ('listening', 'Listening - Set 2', 'Set 2 for Listening Section', 2) RETURNING id"))
  .then(res => { console.log(res.rows); client.end(); })
  .catch(console.error);
