const fs = require('fs');
const path = require('path');

const dirs = ['./src/pages', './src/components', './src'];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) continue;
    if (!filePath.endsWith('.tsx')) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    content = content.replace(/initial=\{\{\s*opacity:\s*0\s*,/g, 'initial={{ opacity: 0, filter: "blur(10px)",');
    content = content.replace(/initial=\{\{\s*opacity:\s*0\s*\}\}/g, 'initial={{ opacity: 0, filter: "blur(10px)" }}');
    
    content = content.replace(/animate=\{\{\s*opacity:\s*1\s*,/g, 'animate={{ opacity: 1, filter: "blur(0px)",');
    content = content.replace(/animate=\{\{\s*opacity:\s*1\s*\}\}/g, 'animate={{ opacity: 1, filter: "blur(0px)" }}');
    
    content = content.replace(/whileInView=\{\{\s*opacity:\s*1\s*,/g, 'whileInView={{ opacity: 1, filter: "blur(0px)",');
    content = content.replace(/whileInView=\{\{\s*opacity:\s*1\s*\}\}/g, 'whileInView={{ opacity: 1, filter: "blur(0px)" }}');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
}

dirs.forEach(processDir);

