const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replace text-slate-400 with text-slate-500 for better contrast
            content = content.replace(/text-slate-400/g, 'text-slate-500');

            // Add aria-label to some known buttons
            content = content.replace(/<button([^>]*)onClick=\{\(\) => setIsMenuOpen\(\!isMenuOpen\)\}([^>]*)>/g, '<button={() => setIsMenuOpen(!isMenuOpen)} aria-label="เมนู">');
            content = content.replace(/<button([^>]*)onClick=\{handleLogout\}([^>]*)>/g, '<button={handleLogout} aria-label="ออกจากระบบ">');
            content = content.replace(/<button([^>]*)onClick=\{\(\) => setShowMobileNav\(\!showMobileNav\)\}([^>]*)>/g, '<button={() => setShowMobileNav(!showMobileNav)} aria-label="เมนู">');
            content = content.replace(/<button([^>]*)onClick=\{\(\) => setShowNavPanel\(false\)\}([^>]*)>/g, '<button={() => setShowNavPanel(false)} aria-label="ปิดแผงการนำทาง">');
            content = content.replace(/<button([^>]*)onClick=\{\(\) => setShowNavPanel\(true\)\}([^>]*)>/g, '<button={() => setShowNavPanel(true)} aria-label="เปิดแผงการนำทาง">');
            content = content.replace(/<button([^>]*)onClick=\{onFlag\}([^>]*)>/g, '<button={onFlag} aria-label="ติดธงข้อนี้">');
            content = content.replace(/<button([^>]*)onClick=\{\(\) => setShowReportModal\(true\)\}([^>]*)>/g, '<button={() => setShowReportModal(true)} aria-label="รายงานข้อผิดพลาด">');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

replaceInDir('c:/Code/CefrReady/CefrReady/src');
