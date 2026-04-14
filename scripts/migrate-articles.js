require('dotenv').config();
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await client.connect();
  console.log('Connected.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      slug VARCHAR(200) UNIQUE,
      content TEXT NOT NULL DEFAULT '',
      category VARCHAR(50),
      cefr_level VARCHAR(10),
      tags TEXT[],
      is_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS articles_slug_idx ON articles(slug);
    CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category);
    CREATE INDEX IF NOT EXISTS articles_published_idx ON articles(is_published);

    CREATE TABLE IF NOT EXISTS article_questions (
      id SERIAL PRIMARY KEY,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS aq_article_idx ON article_questions(article_id);
    CREATE INDEX IF NOT EXISTS aq_question_idx ON article_questions(question_id);
  `);

  console.log('Migration complete: articles + article_questions tables created.');
  await client.end();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
