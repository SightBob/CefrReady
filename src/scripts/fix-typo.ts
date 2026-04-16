import { db } from '../db/index'; 
import { questions } from '../db/schema'; 
import { inArray, eq } from 'drizzle-orm'; 

async function main() {
  const q = await db.select().from(questions).where(inArray(questions.id, [1051, 1052]));
  console.log(q.map(r => ({id: r.id, q: r.questionText}))); 
  
  if (q[1].questionText === 'John Jones lives ___ the United States with his wife, Mary.') {
    await db.update(questions).set({ questionText: 'John Jones lives in the United States with ___ wife, Mary.' }).where(eq(questions.id, 1052));
    console.log('Fixed 1052');
  }
  process.exit(0); 
}
main();
