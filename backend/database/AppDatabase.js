import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Load better-sqlite3 from project root
const require = createRequire(join(projectRoot, 'package.json'));
const Database = require('better-sqlite3');

/**
 * Application database abstraction layer
 * Uses SQLite as default storage
 */
export class AppDatabase {
  constructor(dbPath = join(projectRoot, 'app_data.sqlite')) {
    this.db = new Database(dbPath);
    this.initializeTables();
    console.log('✓ Application database initialized:', dbPath);
  }

  initializeTables() {
    // Integrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        status TEXT DEFAULT 'disconnected',
        last_sync TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Test sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id TEXT PRIMARY KEY,
        test_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        result TEXT,
        logs TEXT,
        user_id TEXT
      );
    `);

    // Yelp users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS yelp_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        config TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // ===== INTEGRATIONS =====

  getAllIntegrations() {
    const stmt = this.db.prepare('SELECT * FROM integrations ORDER BY created_at DESC');
    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      config: JSON.parse(row.config)
    }));
  }

  getIntegration(id) {
    const stmt = this.db.prepare('SELECT * FROM integrations WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      row.config = JSON.parse(row.config);
    }
    return row;
  }

  createIntegration({ name, type, config, status = 'disconnected' }) {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO integrations (id, name, type, config, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, type, JSON.stringify(config || {}), status);
    return this.getIntegration(id);
  }

  updateIntegration(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(updates.config));
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.last_sync !== undefined) {
      fields.push('last_sync = ?');
      values.push(updates.last_sync);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE integrations SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getIntegration(id);
  }

  deleteIntegration(id) {
    const stmt = this.db.prepare('DELETE FROM integrations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ===== TEST SESSIONS =====

  getAllTestSessions() {
    const stmt = this.db.prepare('SELECT * FROM test_sessions ORDER BY started_at DESC');
    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      result: row.result ? JSON.parse(row.result) : null,
      logs: row.logs ? JSON.parse(row.logs) : null
    }));
  }

  getTestSession(id) {
    const stmt = this.db.prepare('SELECT * FROM test_sessions WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      row.result = row.result ? JSON.parse(row.result) : null;
      row.logs = row.logs ? JSON.parse(row.logs) : null;
    }
    return row;
  }

  createTestSession({ test_name, user_id, status = 'pending' }) {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO test_sessions (id, test_name, status, user_id)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, test_name, status, user_id || null);
    return this.getTestSession(id);
  }

  updateTestSession(id, updates) {
    const fields = [];
    const values = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.result !== undefined) {
      fields.push('result = ?');
      values.push(JSON.stringify(updates.result));
    }
    if (updates.logs !== undefined) {
      fields.push('logs = ?');
      values.push(JSON.stringify(updates.logs));
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE test_sessions SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getTestSession(id);
  }

  // ===== YELP USERS =====

  getAllYelpUsers() {
    const stmt = this.db.prepare('SELECT * FROM yelp_users ORDER BY created_at DESC');
    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      config: row.config ? JSON.parse(row.config) : null,
      is_active: row.is_active === 1
    }));
  }

  getYelpUser(id) {
    const stmt = this.db.prepare('SELECT * FROM yelp_users WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      row.config = row.config ? JSON.parse(row.config) : null;
      row.is_active = row.is_active === 1;
    }
    return row;
  }

  getYelpUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM yelp_users WHERE username = ?');
    const row = stmt.get(username);
    if (row) {
      row.config = row.config ? JSON.parse(row.config) : null;
      row.is_active = row.is_active === 1;
    }
    return row;
  }

  createYelpUser({ username, email, config, is_active = true }) {
    const id = randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO yelp_users (id, username, email, config, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, username, email, JSON.stringify(config || {}), is_active ? 1 : 0);
    return this.getYelpUser(id);
  }

  updateYelpUser(id, updates) {
    const fields = [];
    const values = [];

    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(updates.config));
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE yelp_users SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getYelpUser(id);
  }

  close() {
    this.db.close();
  }
}
