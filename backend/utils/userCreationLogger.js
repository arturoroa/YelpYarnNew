import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE_PATH = path.join(__dirname, '../data/UserCreationLog.log');

export function logUserCreationToFile(logData) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...logData
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFileSync(LOG_FILE_PATH, logLine, 'utf8');
    console.log('User creation logged to file:', LOG_FILE_PATH);
  } catch (error) {
    console.error('Error writing to user creation log file:', error);
  }
}
