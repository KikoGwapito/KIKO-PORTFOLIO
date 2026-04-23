const fs = require('fs');
const path = require('path');

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      processDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      
      content = content.replace(/animate=\{\{\s*opacity:\s*1\s*,\s*filter:\s*"blur\(0px\)"\s*,/g, 'animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" },');
      content = content.replace(/animate=\{\{\s*opacity:\s*1\s*,\s*filter:\s*"blur\(0px\)"\s*\}\}/g, 'animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}');

      content = content.replace(/whileInView=\{\{\s*opacity:\s*1\s*,\s*filter:\s*"blur\(0px\)"\s*,/g, 'whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" },');
      content = content.replace(/whileInView=\{\{\s*opacity:\s*1\s*,\s*filter:\s*"blur\(0px\)"\s*\}\}/g, 'whileInView={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}');

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', filePath);
      }
    }
  }
}

processDir('./src');
