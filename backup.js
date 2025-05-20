const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to backup
const dirsToBackup = [
  'app',
  'components',
  'constants',
  'context',
  'hooks',
  'lib',
  'types',
  'supabase'
];

// Files to backup
const filesToBackup = [
  'package.json',
  'tsconfig.json',
  'app.json',
  'eas.json',
  '.env',
  '.prettierrc'
];

// Create backup directory with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(process.cwd(), `backup-${timestamp}`);

try {
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });

  // Backup directories
  dirsToBackup.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.mkdirSync(path.join(backupDir, dir), { recursive: true });
      execSync(`cp -R ${dir}/* ${path.join(backupDir, dir)}`);
      console.log(`✓ Backed up ${dir} directory`);
    }
  });

  // Backup individual files
  filesToBackup.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(backupDir, file));
      console.log(`✓ Backed up ${file}`);
    }
  });

  console.log(`\nBackup completed successfully!\nLocation: ${backupDir}`);
} catch (error) {
  console.error('Error creating backup:', error);
  process.exit(1);
}