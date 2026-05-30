const fs = require('fs');
let layout = fs.readFileSync('c:/Code/CefrReady/CefrReady/src/app/layout.tsx', 'utf8');

if (!layout.includes('export const viewport')) {
    layout = layout.replace(
        'export const metadata: Metadata = {',
        export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
    );
    fs.writeFileSync('c:/Code/CefrReady/CefrReady/src/app/layout.tsx', layout, 'utf8');
    console.log('Added viewport to layout.tsx');
}
