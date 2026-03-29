const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../backups');

function backup() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Error: Database file not found at ' + DB_FILE);
    return;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `dev-backup-${timestamp}.db`);

  try {
    fs.copyFileSync(DB_FILE, backupFile);
    console.log('SUCCESS: Database backed up to ' + backupFile);
  } catch (err) {
    console.error('FAILED to backup database:', err);
  }
}

backup();
