import { createRequire } from 'module';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const require = createRequire(join(projectRoot, 'package.json'));

export class DataMigrator {
  constructor(sourceDb) {
    this.sourceDb = sourceDb;
  }

  async migrateToPostgres(client, sourceDb = null) {
    const db = sourceDb || this.sourceDb;
    const data = db.exportData();

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Migrate integrations
      for (const integration of data.integrations) {
        await client.query(`
          INSERT INTO integrations (id, name, type, status, config, last_sync, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            status = EXCLUDED.status,
            config = EXCLUDED.config,
            last_sync = EXCLUDED.last_sync,
            updated_at = EXCLUDED.updated_at
        `, [
          integration.id,
          integration.name,
          integration.type,
          integration.status,
          JSON.stringify(integration.config),
          integration.last_sync,
          integration.created_at,
          integration.updated_at
        ]);
      }

      // Migrate test sessions
      for (const session of data.test_sessions) {
        await client.query(`
          INSERT INTO test_sessions (id, integration_id, yelp_user_id, status, start_time, end_time, results, logs, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            integration_id = EXCLUDED.integration_id,
            yelp_user_id = EXCLUDED.yelp_user_id,
            status = EXCLUDED.status,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            results = EXCLUDED.results,
            logs = EXCLUDED.logs
        `, [
          session.id,
          session.integration_id,
          session.yelp_user_id,
          session.status,
          session.start_time,
          session.end_time,
          JSON.stringify(session.results),
          JSON.stringify(session.logs),
          session.created_at
        ]);
      }

      // Migrate yelp users
      for (const user of data.yelp_users) {
        await client.query(`
          INSERT INTO yelp_users (id, username, email, config, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            config = EXCLUDED.config,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
        `, [
          user.id,
          user.username,
          user.email,
          JSON.stringify(user.config),
          user.is_active,
          user.created_at,
          user.updated_at
        ]);
      }

      // Migrate system logs
      for (const log of data.system_logs) {
        await client.query(`
          INSERT INTO system_logs (id, user_id, action, details, timestamp, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [
          log.id,
          log.user_id,
          log.action,
          JSON.stringify(log.details),
          log.timestamp,
          log.created_at
        ]);
      }

      // Commit transaction
      await client.query('COMMIT');

      return {
        success: true,
        migrated: {
          integrations: data.integrations.length,
          test_sessions: data.test_sessions.length,
          yelp_users: data.yelp_users.length,
          system_logs: data.system_logs.length
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  async migrateToMySQL(connection, sourceDb = null) {
    const db = sourceDb || this.sourceDb;
    const data = db.exportData();

    try {
      await connection.beginTransaction();

      // Migrate integrations
      for (const integration of data.integrations) {
        await connection.query(`
          INSERT INTO integrations (id, name, type, status, config, last_sync, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            type = VALUES(type),
            status = VALUES(status),
            config = VALUES(config),
            last_sync = VALUES(last_sync),
            updated_at = VALUES(updated_at)
        `, [
          integration.id,
          integration.name,
          integration.type,
          integration.status,
          JSON.stringify(integration.config),
          integration.last_sync,
          integration.created_at,
          integration.updated_at
        ]);
      }

      // Migrate test sessions
      for (const session of data.test_sessions) {
        await connection.query(`
          INSERT INTO test_sessions (id, integration_id, yelp_user_id, status, start_time, end_time, results, logs, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            integration_id = VALUES(integration_id),
            yelp_user_id = VALUES(yelp_user_id),
            status = VALUES(status),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time),
            results = VALUES(results),
            logs = VALUES(logs)
        `, [
          session.id,
          session.integration_id,
          session.yelp_user_id,
          session.status,
          session.start_time,
          session.end_time,
          JSON.stringify(session.results),
          JSON.stringify(session.logs),
          session.created_at
        ]);
      }

      // Migrate yelp users
      for (const user of data.yelp_users) {
        await connection.query(`
          INSERT INTO yelp_users (id, username, email, config, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            email = VALUES(email),
            config = VALUES(config),
            is_active = VALUES(is_active),
            updated_at = VALUES(updated_at)
        `, [
          user.id,
          user.username,
          user.email,
          JSON.stringify(user.config),
          user.is_active ? 1 : 0,
          user.created_at,
          user.updated_at
        ]);
      }

      // Migrate system logs
      for (const log of data.system_logs) {
        await connection.query(`
          INSERT IGNORE INTO system_logs (id, user_id, action, details, timestamp, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          log.id,
          log.user_id,
          log.action,
          JSON.stringify(log.details),
          log.timestamp,
          log.created_at
        ]);
      }

      await connection.commit();

      return {
        success: true,
        migrated: {
          integrations: data.integrations.length,
          test_sessions: data.test_sessions.length,
          yelp_users: data.yelp_users.length,
          system_logs: data.system_logs.length
        }
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  async migrateToSQLite(targetDb, sourceDb = null) {
    const db = sourceDb || this.sourceDb;
    const data = db.exportData();

    try {
      // Migrate integrations
      const intStmt = targetDb.db.prepare(`
        INSERT OR REPLACE INTO integrations (id, name, type, status, config, last_sync, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const integration of data.integrations) {
        intStmt.run(
          integration.id,
          integration.name,
          integration.type,
          integration.status,
          JSON.stringify(integration.config),
          integration.last_sync,
          integration.created_at,
          integration.updated_at
        );
      }

      // Migrate test sessions
      const sessStmt = targetDb.db.prepare(`
        INSERT OR REPLACE INTO test_sessions (id, integration_id, yelp_user_id, status, start_time, end_time, results, logs, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const session of data.test_sessions) {
        sessStmt.run(
          session.id,
          session.integration_id,
          session.yelp_user_id,
          session.status,
          session.start_time,
          session.end_time,
          JSON.stringify(session.results),
          JSON.stringify(session.logs),
          session.created_at
        );
      }

      // Migrate yelp users
      const userStmt = targetDb.db.prepare(`
        INSERT OR REPLACE INTO yelp_users (id, username, email, config, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const user of data.yelp_users) {
        userStmt.run(
          user.id,
          user.username,
          user.email,
          JSON.stringify(user.config),
          user.is_active ? 1 : 0,
          user.created_at,
          user.updated_at
        );
      }

      // Migrate system logs
      const logStmt = targetDb.db.prepare(`
        INSERT OR IGNORE INTO system_logs (id, user_id, action, details, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const log of data.system_logs) {
        logStmt.run(
          log.id,
          log.user_id,
          log.action,
          JSON.stringify(log.details),
          log.timestamp,
          log.created_at
        );
      }

      return {
        success: true,
        migrated: {
          integrations: data.integrations.length,
          test_sessions: data.test_sessions.length,
          yelp_users: data.yelp_users.length,
          system_logs: data.system_logs.length
        }
      };
    } catch (error) {
      throw error;
    }
  }
}
