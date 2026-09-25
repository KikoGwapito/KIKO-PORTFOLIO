// Restore script for Step 3: Run 'node restore_step3.cjs' to roll back to pre-Step 3 state
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups', 'restore_point_step3');

const filesToRestore = [
  { src: 'server.ts', dest: 'server.ts' },
];

console.log('Restoring files from backup point: ' + backupDir);

filesToRestore.forEach(({ src, dest }) => {
  const sourcePath = path.join(backupDir, src);
  const destPath = path.join(__dirname, dest);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Restored: ${dest}`);
  } else {
    console.warn(`Backup file not found: ${src}`);
  }
});

console.log('Restore complete!');
