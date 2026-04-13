const fs = require('fs');
const parse = (str) => {
    const lines = str.trim().split('\n');
    return lines.map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                if (j + 1 < line.length && line[j + 1] === '"') {
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
        return values;
    });
};

const escapeCSV = (val) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
};

const lines = fs.readFileSync('csv_data/formatted-form-meaning.csv', 'utf8');
const rows = parse(lines);

const output = [rows[0].map(escapeCSV).join(',')];

for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // the article json is at index 11
    let articleStr = row[11];
    if (articleStr) {
        try {
            const article = JSON.parse(articleStr);
            if (article && article.blanks) {
                article.blanks.forEach(b => {
                    delete b.hint;
                });
            }
            row[11] = JSON.stringify(article);
        } catch(e) {
            console.error(e);
        }
    }
    output.push(row.map(escapeCSV).join(','));
}

fs.writeFileSync('csv_data/formatted-form-meaning.csv', output.join('\n'), 'utf8');
console.log('Successfully removed hints from article JSON.');
