const fs = require('fs');
let content = fs.readFileSync('c:/Code/CefrReady/CefrReady/src/components/FlashcardsClient.tsx', 'utf8');

content = content.replace(/<button([^>]*)>\s*<XCircle([^>]*)>\s*<\/button>/g, '<button aria-label="ลบ">\n                    <XCircle>\n                  </button>');
content = content.replace(/<button([^>]*)>\s*<RotateCcw([^>]*)>\s*<\/button>/g, '<button aria-label="ทบทวนใหม่">\n                    <RotateCcw>\n                  </button>');
content = content.replace(/<button([^>]*)>\s*<CheckCircle2([^>]*)>\s*<\/button>/g, '<button aria-label="จำได้แล้ว">\n                    <CheckCircle2>\n                  </button>');

fs.writeFileSync('c:/Code/CefrReady/CefrReady/src/components/FlashcardsClient.tsx', content, 'utf8');
console.log('Updated FlashcardsClient.tsx');
