// Restore script for Step 2: Run 'node restore_step2.cjs' to roll back to pre-Step 2 state
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups', 'restore_point_step2');

const filesToRestore = [
  { src: 'server.ts', dest: 'server.ts' },
  { src: 'AppDataContext.tsx', dest: 'src/context/AppDataContext.tsx' },
  { src: 'Contact.tsx', dest: 'src/pages/Contact.tsx' },
  { src: 'Reviews.tsx', dest: 'src/pages/Reviews.tsx' },
  { src: 'ForClient.tsx', dest: 'src/pages/ForClient.tsx' },
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
