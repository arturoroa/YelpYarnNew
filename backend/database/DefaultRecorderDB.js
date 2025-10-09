import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const require = createRequire(join(projectRoot, 'package.json'));

let Database = null;
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.error('better-sqlite3 not available');
}

export class DefaultRecorderDB {
  constructor(dbPath = null) {
    if (!Database) {
      throw new Error('better-sqlite3 is required but not available');
    }

    const finalPath = dbPath || join(projectRoot, 'defaultRecorder.db');
    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL');

    this.initializeTables();
    console.log(`✓ DefaultRecorderDB initialized at ${finalPath}`);
  }

  initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        created_by TEXT,
        creation_time TEXT DEFAULT CURRENT_TIMESTAMP,
        type_of_user TEXT NOT NULL DEFAULT 'TestUser'
      );

      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'disconnected',
        config TEXT DEFAULT '{}',
        last_sync TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS test_sessions (
        id TEXT PRIMARY KEY,
        integration_id TEXT,
        yelp_user_id TEXT,
        status TEXT DEFAULT 'pending',
        start_time TEXT,
        end_time TEXT,
        results TEXT DEFAULT '{}',
        logs TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        integrations TEXT DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        loginTime TEXT NOT NULL,
        logoutTime TEXT,
        ipAddress TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    this.insertDefaultUsers();
  }

  insertDefaultUsers() {
    try {
      const existingUsers = this.db.prepare('SELECT COUNT(*) as count FROM users').get();

      if (existingUsers.count === 0) {
        const stmt = this.db.prepare(`
          INSERT INTO users (id, username, password, email, created_by, creation_time, type_of_user)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const now = new Date().toISOString();

        stmt.run(randomUUID(), 'aroa', '123456789', 'aroa@example.com', 'system', now, 'SystemUser');
        stmt.run(randomUUID(), 'testuser', 'testpass', 'test@example.com', 'system', now, 'TestUser');
        stmt.run(randomUUID(), 'john_doe', 'password123', 'john@example.com', 'system', now, 'TestUser');

        console.log('✓ Default users created (aroa/123456789 as SystemUser)');
      } else {
        console.log(`✓ Users table already has ${existingUsers.count} user(s)`);
      }
    } catch (error) {
      console.error('Error inserting default users:', error);
    }
  }

  createIntegration(data) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO integrations (id, name, type, status, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.type,
      data.status || 'disconnected',
      JSON.stringify(data.config || {}),
      now,
      now
    );

    return this.getIntegration(id);
  }

  getIntegrations() {
    const rows = this.db.prepare('SELECT * FROM integrations ORDER BY created_at DESC').all();
    return rows.map(row => ({
      ...row,
      config: JSON.parse(row.config || '{}')
    }));
  }

  getAllIntegrations() {
    return this.getIntegrations();
  }

  exportAllData() {
    return {
      integrations: this.getIntegrations(),
      users: this.getAllUsers(),
      test_sessions: this.getTestSessions(),
      system_logs: this.getSystemLogs(1000)
    };
  }

  getIntegration(id) {
    const row = this.db.prepare('SELECT * FROM integrations WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      config: JSON.parse(row.config || '{}')
    };
  }

  updateIntegration(id, data) {
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(data.config));
    }
    if (data.last_sync !== undefined) {
      updates.push('last_sync = ?');
      values.push(data.last_sync);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`
      UPDATE integrations
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    return this.getIntegration(id);
  }

  deleteIntegration(id) {
    const result = this.db.prepare('DELETE FROM integrations WHERE id = ?').run(id);
    return result.changes > 0;
  }

  createTestSession(data) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO test_sessions (id, integration_id, yelp_user_id, status, start_time, results, logs, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.integration_id || null,
      data.yelp_user_id || null,
      data.status || 'pending',
      data.start_time || now,
      JSON.stringify(data.results || {}),
      JSON.stringify(data.logs || []),
      now
    );

    return this.getTestSession(id);
  }

  getTestSessions() {
    const rows = this.db.prepare('SELECT * FROM test_sessions ORDER BY created_at DESC').all();
    return rows.map(row => ({
      ...row,
      results: JSON.parse(row.results || '{}'),
      logs: JSON.parse(row.logs || '[]')
    }));
  }

  getTestSession(id) {
    const row = this.db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      results: JSON.parse(row.results || '{}'),
      logs: JSON.parse(row.logs || '[]')
    };
  }

  updateTestSession(id, data) {
    const updates = [];
    const values = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(data.end_time);
    }
    if (data.results !== undefined) {
      updates.push('results = ?');
      values.push(JSON.stringify(data.results));
    }
    if (data.logs !== undefined) {
      updates.push('logs = ?');
      values.push(JSON.stringify(data.logs));
    }

    values.push(id);

    this.db.prepare(`
      UPDATE test_sessions
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    return this.getTestSession(id);
  }

  getAllUsers() {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY creation_time DESC').all();
    return rows;
  }

  getUsersByType(type) {
    const rows = this.db.prepare('SELECT * FROM users WHERE type_of_user = ? ORDER BY creation_time DESC').all(type);
    return rows;
  }

  getUser(id) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row || null;
  }

  getUserByUsername(username) {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    return row || null;
  }

  createUser(data) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO users (id, username, password, email, created_by, creation_time, type_of_user)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.username,
      data.password,
      data.email || null,
      data.created_by || null,
      now,
      data.type_of_user || 'TestUser'
    );

    return this.getUser(id);
  }

  updateUser(id, data) {
    const updates = [];
    const values = [];

    if (data.username !== undefined) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.password !== undefined) {
      updates.push('password = ?');
      values.push(data.password);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.type_of_user !== undefined) {
      updates.push('type_of_user = ?');
      values.push(data.type_of_user);
    }

    if (updates.length === 0) return this.getUser(id);

    values.push(id);

    this.db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    return this.getUser(id);
  }

  deleteUser(id) {
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  logSystemAction(userId, action, details = {}) {
    try {
      const id = randomUUID();
      const now = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO system_logs (id, user_id, action, details, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId || null,
        action,
        JSON.stringify(details),
        now,
        now
      );
      console.log(`✓ System log written: ${action}`);
    } catch (error) {
      console.error('Error writing system log:', error);
    }
  }

  getSystemLogs(limit = 100) {
    const rows = this.db.prepare(`
      SELECT * FROM system_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    return rows.map(row => ({
      ...row,
      details: JSON.parse(row.details || '{}')
    }));
  }

  exportData() {
    return {
      integrations: this.getIntegrations(),
      test_sessions: this.getTestSessions(),
      users: this.getAllUsers(),
      system_logs: this.getSystemLogs(1000)
    };
  }

  verifyUser(username, password) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ? AND password = ? AND (type_of_user = "SystemUser" OR type_of_user = "RegularUser")');
    const user = stmt.get(username, password);
    return user || null;
  }

  getEnvironments() {
    const rows = this.db.prepare('SELECT * FROM environments ORDER BY created_at DESC').all();
    return rows.map(row => ({
      ...row,
      integrations: JSON.parse(row.integrations || '{}')
    }));
  }

  getEnvironment(id) {
    const row = this.db.prepare('SELECT * FROM environments WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      integrations: JSON.parse(row.integrations || '{}')
    };
  }

  createEnvironment(data) {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO environments (id, name, integrations, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      JSON.stringify(data.integrations || {}),
      now,
      now
    );

    return this.getEnvironment(id);
  }

  updateEnvironment(id, data) {
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.integrations !== undefined) {
      updates.push('integrations = ?');
      values.push(JSON.stringify(data.integrations));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE environments
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.getEnvironment(id);
  }

  deleteEnvironment(id) {
    const stmt = this.db.prepare('DELETE FROM environments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // User Session methods
  createUserSession(sessionData) {
    const id = sessionData.id || randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (id, username, loginTime, logoutTime, ipAddress, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionData.username,
      sessionData.loginTime || now,
      sessionData.logoutTime || null,
      sessionData.ipAddress || null,
      sessionData.status || 'active',
      now,
      now
    );

    return this.getUserSession(id);
  }

  getUserSession(id) {
    const stmt = this.db.prepare('SELECT * FROM user_sessions WHERE id = ?');
    return stmt.get(id);
  }

  getAllUserSessions() {
    const stmt = this.db.prepare('SELECT * FROM user_sessions ORDER BY created_at DESC');
    return stmt.all();
  }

  updateUserSession(id, updates) {
    const allowedFields = ['logoutTime', 'status', 'ipAddress'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      return this.getUserSession(id);
    }

    updateFields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE user_sessions
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.getUserSession(id);
  }

  deleteUserSession(id) {
    const stmt = this.db.prepare('DELETE FROM user_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
