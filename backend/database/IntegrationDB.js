import { randomUUID } from 'crypto';
import pg from 'pg';
import mysql from 'mysql2/promise.js';
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

/**
 * IntegrationDB - Manages operations on the user-selected database integration
 */
export class IntegrationDB {
  constructor(integration) {
    this.integration = integration;
    this.connection = null;
    this.dbType = null;
  }

  async connect() {
    const { config, type } = this.integration;

    if (type !== 'database') {
      throw new Error('Only database integrations are supported');
    }

    const { host, port, database, username, password, protocol, connectionMethod } = config;
    const dbProtocol = (protocol || 'postgresql').toLowerCase();
    const connMethod = connectionMethod || 'on-prem';

    try {
      if (connMethod === 'sqlite' || dbProtocol === 'sqlite') {
        if (!Database) {
          throw new Error('SQLite support not available');
        }

        const path = await import('path');
        let dbFileName = database;
        if (!dbFileName.endsWith('.db') && !dbFileName.endsWith('.sqlite')) {
          dbFileName += '.sqlite';
        }
        const filePath = path.join(projectRoot, dbFileName);

        this.connection = new Database(filePath);
        this.dbType = 'sqlite';
      } else if (dbProtocol === 'postgresql') {
        const { Client } = pg;
        const client = new Client({
          host: host || 'localhost',
          port: port || 5432,
          database: database,
          user: username,
          password: password,
        });
        await client.connect();
        this.connection = client;
        this.dbType = 'postgresql';
      } else if (dbProtocol === 'mysql') {
        const connection = await mysql.createConnection({
          host: host || 'localhost',
          port: port || 3306,
          database: database,
          user: username,
          password: password,
        });
        this.connection = connection;
        this.dbType = 'mysql';
      } else {
        throw new Error(`Unsupported database protocol: ${dbProtocol}`);
      }

      return { success: true, dbType: this.dbType };
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  async disconnect() {
    if (!this.connection) return;

    try {
      if (this.dbType === 'sqlite') {
        this.connection.close();
      } else {
        await this.connection.end();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
    this.connection = null;
  }

  // CRUD Operations for integrations
  async getAllIntegrations() {
    if (!this.connection) await this.connect();

    try {
      if (this.dbType === 'sqlite') {
        const tableExists = this.connection.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='integrations'"
        ).get();
        if (!tableExists) return [];

        const stmt = this.connection.prepare('SELECT * FROM integrations ORDER BY created_at DESC');
        const rows = stmt.all();
        return rows.map(row => ({
          ...row,
          config: row.config ? JSON.parse(row.config) : {}
        }));
      } else if (this.dbType === 'postgresql') {
        const tableCheck = await this.connection.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'integrations')"
        );
        if (!tableCheck.rows[0].exists) return [];

        const result = await this.connection.query('SELECT * FROM integrations ORDER BY created_at DESC');
        return result.rows.map(row => ({
          ...row,
          config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
        }));
      } else if (this.dbType === 'mysql') {
        const [tableCheck] = await this.connection.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'integrations'"
        );
        if (tableCheck[0].count === 0) return [];

        const [rows] = await this.connection.query('SELECT * FROM integrations ORDER BY created_at DESC');
        return rows.map(row => ({
          ...row,
          config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
        }));
      }
    } catch (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }
  }

  async getIntegration(id) {
    if (!this.connection) await this.connect();

    try {
      if (this.dbType === 'sqlite') {
        const stmt = this.connection.prepare('SELECT * FROM integrations WHERE id = ?');
        const row = stmt.get(id);
        if (!row) return null;
        return {
          ...row,
          config: row.config ? JSON.parse(row.config) : {}
        };
      } else if (this.dbType === 'postgresql') {
        const result = await this.connection.query('SELECT * FROM integrations WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
          ...row,
          config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
        };
      } else if (this.dbType === 'mysql') {
        const [rows] = await this.connection.query('SELECT * FROM integrations WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
          ...row,
          config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
        };
      }
    } catch (error) {
      throw new Error(`Failed to fetch integration: ${error.message}`);
    }
  }

  async createIntegration(data) {
    if (!this.connection) await this.connect();

    const id = randomUUID();
    const { name, type, status = 'disconnected', config = {} } = data;
    const configJson = JSON.stringify(config);
    const now = new Date().toISOString();

    try {
      if (this.dbType === 'sqlite') {
        const stmt = this.connection.prepare(`
          INSERT INTO integrations (id, name, type, status, config, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, name, type, status, configJson, now, now);
      } else if (this.dbType === 'postgresql') {
        await this.connection.query(`
          INSERT INTO integrations (id, name, type, status, config, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, name, type, status, configJson, now, now]);
      } else if (this.dbType === 'mysql') {
        await this.connection.query(`
          INSERT INTO integrations (id, name, type, status, config, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, name, type, status, configJson, now, now]);
      }

      return { id, name, type, status, config, created_at: now, updated_at: now };
    } catch (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }
  }

  async updateIntegration(id, updates) {
    if (!this.connection) await this.connect();

    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push(this.dbType === 'postgresql' ? `name = $${values.length + 1}` : 'name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push(this.dbType === 'postgresql' ? `type = $${values.length + 1}` : 'type = ?');
      values.push(updates.type);
    }
    if (updates.status !== undefined) {
      fields.push(this.dbType === 'postgresql' ? `status = $${values.length + 1}` : 'status = ?');
      values.push(updates.status);
    }
    if (updates.config !== undefined) {
      fields.push(this.dbType === 'postgresql' ? `config = $${values.length + 1}` : 'config = ?');
      values.push(JSON.stringify(updates.config));
    }
    if (updates.last_sync !== undefined) {
      fields.push(this.dbType === 'postgresql' ? `last_sync = $${values.length + 1}` : 'last_sync = ?');
      values.push(updates.last_sync);
    }

    fields.push(this.dbType === 'postgresql' ? `updated_at = $${values.length + 1}` : 'updated_at = ?');
    values.push(now);

    try {
      if (this.dbType === 'sqlite') {
        const stmt = this.connection.prepare(`UPDATE integrations SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values, id);
      } else if (this.dbType === 'postgresql') {
        await this.connection.query(`UPDATE integrations SET ${fields.join(', ')} WHERE id = $${values.length + 1}`, [...values, id]);
      } else if (this.dbType === 'mysql') {
        await this.connection.query(`UPDATE integrations SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
      }

      return await this.getIntegration(id);
    } catch (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }
  }

  async deleteIntegration(id) {
    if (!this.connection) await this.connect();

    try {
      if (this.dbType === 'sqlite') {
        const stmt = this.connection.prepare('DELETE FROM integrations WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
      } else if (this.dbType === 'postgresql') {
        const result = await this.connection.query('DELETE FROM integrations WHERE id = $1', [id]);
        return result.rowCount > 0;
      } else if (this.dbType === 'mysql') {
        const [result] = await this.connection.query('DELETE FROM integrations WHERE id = ?', [id]);
        return result.affectedRows > 0;
      }
    } catch (error) {
      throw new Error(`Failed to delete integration: ${error.message}`);
    }
  }

  async getSystemLogs(limit = 100) {
    if (!this.connection) await this.connect();

    try {
      let rows;
      if (this.dbType === 'sqlite') {
        const tableExists = this.connection.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='system_logs'"
        ).get();
        if (!tableExists) return [];

        const stmt = this.connection.prepare(`
          SELECT * FROM system_logs
          ORDER BY timestamp DESC
          LIMIT ?
        `);
        rows = stmt.all(limit);
      } else if (this.dbType === 'postgresql') {
        const tableCheck = await this.connection.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_logs')"
        );
        if (!tableCheck.rows[0].exists) return [];

        const result = await this.connection.query(`
          SELECT * FROM system_logs
          ORDER BY timestamp DESC
          LIMIT $1
        `, [limit]);
        rows = result.rows;
      } else if (this.dbType === 'mysql') {
        const [tableCheck] = await this.connection.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'system_logs'"
        );
        if (tableCheck[0].count === 0) return [];

        const [results] = await this.connection.query(`
          SELECT * FROM system_logs
          ORDER BY timestamp DESC
          LIMIT ?
        `, [limit]);
        rows = results;
      }

      return rows.map(row => ({
        ...row,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
      }));
    } catch (error) {
      throw new Error(`Failed to get system logs: ${error.message}`);
    }
  }

  async getTestSessions() {
    if (!this.connection) await this.connect();

    try {
      let rows;
      if (this.dbType === 'sqlite') {
        const tableExists = this.connection.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='test_sessions'"
        ).get();
        if (!tableExists) return [];

        const stmt = this.connection.prepare('SELECT * FROM test_sessions ORDER BY created_at DESC');
        rows = stmt.all();
      } else if (this.dbType === 'postgresql') {
        const tableCheck = await this.connection.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'test_sessions')"
        );
        if (!tableCheck.rows[0].exists) return [];

        const result = await this.connection.query('SELECT * FROM test_sessions ORDER BY created_at DESC');
        rows = result.rows;
      } else if (this.dbType === 'mysql') {
        const [tableCheck] = await this.connection.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'test_sessions'"
        );
        if (tableCheck[0].count === 0) return [];

        const [results] = await this.connection.query('SELECT * FROM test_sessions ORDER BY created_at DESC');
        rows = results;
      }

      return rows.map(row => ({
        ...row,
        results: typeof row.results === 'string' ? JSON.parse(row.results) : row.results,
        logs: typeof row.logs === 'string' ? JSON.parse(row.logs) : row.logs
      }));
    } catch (error) {
      throw new Error(`Failed to get test sessions: ${error.message}`);
    }
  }

  async getYelpUsers() {
    if (!this.connection) await this.connect();

    try {
      let rows;
      if (this.dbType === 'sqlite') {
        const tableExists = this.connection.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='yelp_users'"
        ).get();
        if (!tableExists) return [];

        const stmt = this.connection.prepare('SELECT * FROM yelp_users ORDER BY created_at DESC');
        rows = stmt.all();
      } else if (this.dbType === 'postgresql') {
        const tableCheck = await this.connection.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'yelp_users')"
        );
        if (!tableCheck.rows[0].exists) return [];

        const result = await this.connection.query('SELECT * FROM yelp_users ORDER BY created_at DESC');
        rows = result.rows;
      } else if (this.dbType === 'mysql') {
        const [tableCheck] = await this.connection.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'yelp_users'"
        );
        if (tableCheck[0].count === 0) return [];

        const [results] = await this.connection.query('SELECT * FROM yelp_users ORDER BY created_at DESC');
        rows = results;
      }

      return rows.map(row => ({
        ...row,
        config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
      }));
    } catch (error) {
      throw new Error(`Failed to get yelp users: ${error.message}`);
    }
  }

  async exportAllData() {
    if (!this.connection) await this.connect();

    try {
      const integrations = await this.getAllIntegrations();
      const testSessions = await this.getTestSessions();
      const yelpUsers = await this.getYelpUsers();
      const systemLogs = await this.getSystemLogs(1000);

      return {
        integrations,
        test_sessions: testSessions,
        yelp_users: yelpUsers,
        system_logs: systemLogs
      };
    } catch (error) {
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }
}
