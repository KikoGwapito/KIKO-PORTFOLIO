const fs = require('fs');
const path = './src/pages/AdminDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/focus:border-emerald-500/g, 'focus:border-[var(--color-primary)]');
content = content.replace(/accent-emerald-500/g, 'accent-[var(--color-primary)]');
fs.writeFileSync(path, content);
console.log('Replaced successfully');
