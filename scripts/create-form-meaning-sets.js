const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: 'postgresql://postgres:JpgC2CWLqh!@localhost:5432/CEFR_DB' });

async function run() {
  try {
    // 1. Create 5 test sets for form-meaning
    const testSets = [];
    for (let i = 1; i <= 5; i++) {
        const res = await pool.query(
            "INSERT INTO test_sets (section_id, name, description) VALUES ($1, $2, $3) RETURNING id",
            ['form-meaning', `Form & Meaning - Set ${i}`, `Set ${i} for Form and Meaning Section`]
        );
        testSets.push(res.rows[0].id);
        console.log(`Created test set "Form & Meaning - Set ${i}" with ID: ${res.rows[0].id}`);
    }

    // 2. Read the CSV and assign testSetId
    const csvData = fs.readFileSync('csv_data/formatted-form-meaning.csv', 'utf8');
    const lines = csvData.trim().split('\n');
    
    // Header
    const header = lines[0];
    
    // We assume lines 1-5 correspond to the 5 articles
    const outputLines = [header];
    
    for (let i = 1; i < lines.length; i++) {
        if(i <= testSets.length) {
            const row = lines[i];
            
            // split row by comma, but be careful with quotes
            // Use a simple split but find the testSetId column, which is index 10
            // Since there are only 5 specific rows and no internal commas before JSON usually...
            // Wait, JSON has commas. We can just use replace regex to find the empty testSetId.
            // In our previous format, testSetId was right before the article JSON string.
            // Example part of the row: 'B1', 'medium', '', '{"title":...'
            // We can replace `"medium",,"{""title"""` with `"medium",${testSets[i-1]},"{""title"""`
            
            // Safer way: our regex to split by comma outside quotes
            const values = [];
            let current = '';
            let inQuotes = false;
            for (let j = 0; j < row.length; j++) {
                const char = row[j];
                if (char === '"') {
                    if (j + 1 < row.length && row[j + 1] === '"') {
                        current += '"';
                        j++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    values.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current);
            
            values[10] = testSets[i-1];
            
            const outRow = values.map(v => {
                const val = String(v);
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    // escape quotes
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            });
            outputLines.push(outRow.join(','));
        }
    }
    
    fs.writeFileSync('csv_data/formatted-form-meaning.csv', outputLines.join('\n'), 'utf8');
    console.log('Successfully assigned Test Set IDs to formatted-form-meaning.csv');

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
