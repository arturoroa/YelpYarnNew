import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

const LOG_FILE = join(projectRoot, 'backend', 'data', 'UserCreationLog.log');

export function logUserCreationToFile(data) {
  try {
    const logDir = dirname(LOG_FILE);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      zip_code: data.zip_code,
      birth_date: data.birth_date,
      creation_method: data.creation_method || 'manual',
      created_by: data.created_by,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      automation_data: data.automation_data,
      status: data.status || 'success',
      error_message: data.error_message
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    appendFileSync(LOG_FILE, logLine, 'utf8');

    const readableLog = `
================================================================================
Timestamp: ${timestamp}
User ID: ${data.user_id}
Username: ${data.username}
Email: ${data.email || 'N/A'}
Password: ${data.password || 'N/A'}
First Name: ${data.first_name || 'N/A'}
Last Name: ${data.last_name || 'N/A'}
ZIP Code: ${data.zip_code || 'N/A'}
Birth Date: ${data.birth_date || 'N/A'}
Creation Method: ${data.creation_method || 'manual'}
Created By: ${data.created_by || 'N/A'}
IP Address: ${data.ip_address || 'N/A'}
User Agent: ${data.user_agent || 'N/A'}
Status: ${data.status || 'success'}
${data.error_message ? `Error Message: ${data.error_message}` : ''}
${data.automation_data ? `Automation Data: ${JSON.stringify(data.automation_data, null, 2)}` : ''}
================================================================================
`;

    appendFileSync(LOG_FILE, readableLog, 'utf8');

    console.log(`✓ User creation logged to ${LOG_FILE}`);
    return true;
  } catch (error) {
    console.error('Failed to log user creation to file:', error);
    return false;
  }
}

export function getLogFilePath() {
  return LOG_FILE;
}
