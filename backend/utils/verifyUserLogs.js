import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

const require = createRequire(join(projectRoot, 'package.json'));
const Database = require('better-sqlite3');

const LOG_FILE = join(projectRoot, 'UserCreationLog.log');
const DB_FILE = join(projectRoot, 'defaultRecorder.db');

export function verifyUserLogsConsistency() {
  const results = {
    logExists: false,
    dbExists: false,
    logUsers: [],
    dbUsers: [],
    missingInDB: [],
    missingInLog: [],
    consistent: false,
    summary: ''
  };

  try {
    results.dbExists = existsSync(DB_FILE);
    results.logExists = existsSync(LOG_FILE);

    if (!results.dbExists) {
      results.summary = '❌ Database file does not exist';
      return results;
    }

    const db = new Database(DB_FILE);

    try {
      const dbUsers = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY id').all();
      results.dbUsers = dbUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        created_at: u.created_at
      }));
    } catch (err) {
      results.summary = `❌ Error reading users from database: ${err.message}`;
      db.close();
      return results;
    }

    try {
      const logUsers = db.prepare('SELECT * FROM user_creation_logs ORDER BY created_at DESC').all();
      results.logUsers = logUsers.map(u => ({
        user_id: u.user_id,
        username: u.username,
        email: u.email,
        status: u.status,
        created_at: u.created_at
      }));
    } catch (err) {
      console.log('Note: user_creation_logs table might not exist yet');
    }

    db.close();

    if (!results.logExists) {
      if (results.dbUsers.length === 0) {
        results.summary = '✓ No users created yet. Both log and database are empty.';
        results.consistent = true;
      } else {
        results.summary = `⚠️ Database has ${results.dbUsers.length} users but log file doesn't exist yet`;
        results.consistent = false;
      }
      return results;
    }

    const logContent = readFileSync(LOG_FILE, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim().startsWith('{'));

    const logUserMap = new Map();
    logLines.forEach(line => {
      try {
        const entry = JSON.parse(line);
        if (entry.user_id && entry.user_id !== 'failed') {
          logUserMap.set(parseInt(entry.user_id), {
            user_id: entry.user_id,
            username: entry.username,
            email: entry.email,
            status: entry.status
          });
        }
      } catch (err) {
        console.error('Failed to parse log line:', err.message);
      }
    });

    const dbUserMap = new Map();
    results.dbUsers.forEach(user => {
      dbUserMap.set(user.id, user);
    });

    results.missingInDB = Array.from(logUserMap.values()).filter(
      logUser => !dbUserMap.has(parseInt(logUser.user_id))
    );

    results.missingInLog = results.dbUsers.filter(
      dbUser => !logUserMap.has(dbUser.id)
    );

    results.consistent = results.missingInDB.length === 0 && results.missingInLog.length === 0;

    if (results.consistent) {
      results.summary = `✓ All ${results.dbUsers.length} users are consistent between database and log file`;
    } else {
      const issues = [];
      if (results.missingInDB.length > 0) {
        issues.push(`${results.missingInDB.length} users in log but not in DB`);
      }
      if (results.missingInLog.length > 0) {
        issues.push(`${results.missingInLog.length} users in DB but not in log`);
      }
      results.summary = `❌ Inconsistency detected: ${issues.join(', ')}`;
    }

    return results;
  } catch (error) {
    results.summary = `❌ Error during verification: ${error.message}`;
    return results;
  }
}

export function getDetailedReport() {
  const verification = verifyUserLogsConsistency();

  let report = '\n';
  report += '═══════════════════════════════════════════════════════════\n';
  report += '           USER LOGS VERIFICATION REPORT\n';
  report += '═══════════════════════════════════════════════════════════\n\n';

  report += `Database Exists: ${verification.dbExists ? '✓' : '✗'}\n`;
  report += `Log File Exists: ${verification.logExists ? '✓' : '✗'}\n\n`;

  report += `Users in Database: ${verification.dbUsers.length}\n`;
  report += `Users in Log Table: ${verification.logUsers.length}\n\n`;

  report += `Status: ${verification.summary}\n\n`;

  if (verification.missingInDB.length > 0) {
    report += '─────────────────────────────────────────────────────────\n';
    report += `Users in Log File but NOT in Database (${verification.missingInDB.length}):\n`;
    report += '─────────────────────────────────────────────────────────\n';
    verification.missingInDB.forEach(user => {
      report += `  - ID: ${user.user_id}, Username: ${user.username}, Email: ${user.email}\n`;
    });
    report += '\n';
  }

  if (verification.missingInLog.length > 0) {
    report += '─────────────────────────────────────────────────────────\n';
    report += `Users in Database but NOT in Log File (${verification.missingInLog.length}):\n`;
    report += '─────────────────────────────────────────────────────────\n';
    verification.missingInLog.forEach(user => {
      report += `  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}\n`;
    });
    report += '\n';
  }

  if (verification.consistent && verification.dbUsers.length > 0) {
    report += '─────────────────────────────────────────────────────────\n';
    report += 'All Users (Verified Consistent):\n';
    report += '─────────────────────────────────────────────────────────\n';
    verification.dbUsers.forEach((user, index) => {
      report += `  ${index + 1}. ID: ${user.id}, Username: ${user.username}, Email: ${user.email}\n`;
    });
    report += '\n';
  }

  report += '═══════════════════════════════════════════════════════════\n';

  return report;
}
