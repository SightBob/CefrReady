const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/questions/[id]/page.tsx',
  'src/app/admin/questions/page.tsx',
  'src/app/admin/questions/new/page.tsx',
  'src/app/admin/test-sets/[id]/page.tsx',
  'src/app/admin/test-types/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace alerts
  const alertRegex = /alert\((.+?)\)/g;
  let hasChanges = false;

  content = content.replace(alertRegex, (match, p1) => {
    hasChanges = true;
    if (p1.includes('สำเร็จ')) {
      return `toast.success(${p1})`;
    } else {
      return `toast.error(${p1})`;
    }
  });

  // Inject import if there were changes and not already imported
  if (hasChanges && !content.includes("from 'sonner'")) {
    // Find the last import line
    const importRegex = /^import .+;$/gm;
    let match;
    let lastImportIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    
    const importString = `\nimport { toast } from 'sonner';`;
    if (lastImportIndex > 0) {
      content = content.slice(0, lastImportIndex) + importString + content.slice(lastImportIndex);
    } else {
      content = importString + '\n' + content;
    }
  }

  if (hasChanges) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated', file);
  }
});
