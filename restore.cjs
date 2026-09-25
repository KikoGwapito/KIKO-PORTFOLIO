// Restore script: Run 'node restore.cjs' to roll back all files to the 2026-09-25 restore point
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups', 'restore_point_2026_09_25');

const filesToRestore = [
  { src: 'server.ts', dest: 'server.ts' },
  { src: 'firestore.rules', dest: 'firestore.rules' },
  { src: 'AdminDashboard.tsx', dest: 'src/pages/AdminDashboard.tsx' },
  { src: 'AppDataContext.tsx', dest: 'src/context/AppDataContext.tsx' },
  { src: 'data.json', dest: 'data.json' },
  { src: 'firebase-blueprint.json', dest: 'firebase-blueprint.json' },
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
