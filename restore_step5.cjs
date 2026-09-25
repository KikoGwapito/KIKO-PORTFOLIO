// Restore script for Step 5: Run 'node restore_step5.cjs' to roll back to pre-Step 5 state
const fs = require('fs');
const path = require('path');

const backupDir = fs.existsSync(path.join(__dirname, 'backups', 'restore_point_step5'))
  ? path.join(__dirname, 'backups', 'restore_point_step5')
  : path.join('/backups', 'restore_point_step5');

const filesToRestore = [
  { src: 'server.ts', dest: 'server.ts' },
  { src: 'AdminDashboard.tsx', dest: 'src/pages/AdminDashboard.tsx' },
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
