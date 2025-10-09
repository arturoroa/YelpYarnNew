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
      CREATE TABLE IF NOT EXISTS system_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        type TEXT NOT NULL,
        email TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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

      CREATE TABLE IF NOT EXISTS yelp_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        config TEXT DEFAULT '{}',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    `);

    this.insertDefaultSystemUser();
    this.insertSampleUsers();
  }

  insertDefaultSystemUser() {
    try {
      const existingUsers = this.db.prepare('SELECT COUNT(*) as count FROM system_users').get();

      if (existingUsers.count === 0) {
        const stmt = this.db.prepare(`
          INSERT INTO system_users (id, username, password, type)
          VALUES (?, ?, ?, ?)
        `);

        stmt.run(randomUUID(), 'aroa', '123456789', 'systemadmin');
        console.log('✓ Default system admin user created (aroa/123456789)');
      } else {
        console.log(`✓ System users table already has ${existingUsers.count} user(s)`);
      }
    } catch (error) {
      console.error('Error inserting default system user:', error);
    }
  }

  insertSampleUsers() {
    const existingUsers = this.db.prepare('SELECT COUNT(*) as count FROM yelp_users').get();

    if (existingUsers.count === 0) {
      const sampleUsers = [
        {
          id: randomUUID(),
          username: 'john_doe_yelp',
          email: 'john@example.com',
          config: JSON.stringify({ cookies: [{ name: 'session', value: 'abc123' }] }),
          is_active: 1
        },
        {
          id: randomUUID(),
          username: 'jane_smith_yelp',
          email: 'jane@example.com',
          config: JSON.stringify({ cookies: [{ name: 'session', value: 'def456' }] }),
          is_active: 1
        },
        {
          id: randomUUID(),
          username: 'test_user_yelp',
          email: 'test@example.com',
          config: JSON.stringify({ cookies: [{ name: 'session', value: 'ghi789' }] }),
          is_active: 1
        }
      ];

      const stmt = this.db.prepare(`
        INSERT INTO yelp_users (id, username, email, config, is_active)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const user of sampleUsers) {
        stmt.run(user.id, user.username, user.email, user.config, user.is_active);
      }

      console.log('✓ Sample Yelp users inserted');
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

  // Export all data for migration
  exportAllData() {
    return {
      integrations: this.getIntegrations(),
      yelp_users: this.getYelpUsers(),
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

  getYelpUsers() {
    const rows = this.db.prepare('SELECT * FROM yelp_users ORDER BY created_at DESC').all();
    return rows.map(row => ({
      ...row,
      config: JSON.parse(row.config || '{}'),
      is_active: Boolean(row.is_active)
    }));
  }

  getYelpUser(id) {
    const row = this.db.prepare('SELECT * FROM yelp_users WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      config: JSON.parse(row.config || '{}'),
      is_active: Boolean(row.is_active)
    };
  }

  createYelpUser(data) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO yelp_users (id, username, email, config, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.username,
      data.email || null,
      JSON.stringify(data.config || {}),
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      now,
      now
    );

    return this.getYelpUser(id);
  }

  updateYelpUser(id, data) {
    const updates = [];
    const values = [];

    if (data.username !== undefined) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(data.config));
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`
      UPDATE yelp_users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    return this.getYelpUser(id);
  }

  deleteYelpUser(id) {
    const result = this.db.prepare('DELETE FROM yelp_users WHERE id = ?').run(id);
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
      yelp_users: this.getYelpUsers(),
      system_logs: this.getSystemLogs(1000)
    };
  }

  verifySystemUser(username, password) {
    const stmt = this.db.prepare('SELECT * FROM system_users WHERE username = ? AND password = ?');
    const user = stmt.get(username, password);
    return user || null;
  }

  getAllSystemUsers() {
    const stmt = this.db.prepare('SELECT id, username, type, email, created_at, updated_at FROM system_users');
    return stmt.all();
  }

  createSystemUser(username, password, type = 'user', email = null) {
    const id = randomUUID();

    // Check if email column exists, if not add it
    try {
      const columns = this.db.prepare("PRAGMA table_info(system_users)").all();
      const hasEmailColumn = columns.some(col => col.name === 'email');

      if (!hasEmailColumn) {
        this.db.exec(`ALTER TABLE system_users ADD COLUMN email TEXT;`);
      }
    } catch (error) {
      console.error('Error checking/adding email column:', error);
    }

    const stmt = this.db.prepare(`
      INSERT INTO system_users (id, username, password, type, email)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, username, password, type, email);
    return { id, username, type, email };
  }

  getSystemUser(id) {
    const stmt = this.db.prepare('SELECT id, username, type, email, created_at, updated_at FROM system_users WHERE id = ?');
    return stmt.get(id);
  }

  updateSystemUser(id, data) {
    const updates = [];
    const values = [];

    if (data.username) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.password) {
      updates.push('password = ?');
      values.push(data.password);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.type) {
      updates.push('type = ?');
      values.push(data.type);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE system_users
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.getSystemUser(id);
  }

  deleteSystemUser(id) {
    const stmt = this.db.prepare('DELETE FROM system_users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
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

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
