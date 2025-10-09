import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import pg from 'pg';
import mysql from 'mysql2/promise.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { AppDatabase } from './database/AppDatabase.js';
import SchemaManager from './database/SchemaManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Create require for loading native modules (like better-sqlite3 if available)
const require = createRequire(join(projectRoot, 'package.json'));

// Try to load better-sqlite3 for database connections (optional)
let Database = null;
try {
  Database = require('better-sqlite3');
  console.log('✓ better-sqlite3 loaded (for SQLite connections)');
} catch (err) {
  console.log('! better-sqlite3 not available (SQLite connections disabled)');
}

dotenv.config();

// Initialize SQLite database with defaultRecorder.db
let appDb = null;
try {
  const { DefaultRecorderDB } = await import('./database/DefaultRecorderDB.js');
  appDb = new DefaultRecorderDB();
  console.log('✓ DefaultRecorderDB initialized successfully');
} catch (error) {
  console.error('! Failed to initialize DefaultRecorderDB:', error.message);
  console.log('! Falling back to in-memory database');
  appDb = new AppDatabase();
}

// Using local SQLite database only
console.log('✓ Database ready for use');

// Helper function to log actions to local DB
async function logSystemAction(userId, action, details = {}) {
  try {
    if (appDb && typeof appDb.logSystemAction === 'function') {
      appDb.logSystemAction(userId, action, details);
    } else {
      console.log('Cannot log: appDb or logSystemAction not available');
    }
  } catch (error) {
    console.error('Failed to log to local database:', error);
  }
}

async function setupIntegrationSchema(integration) {
  const { config, type } = integration;

  if (type !== 'database') {
    return { success: false, message: 'Schema setup only supported for database integrations' };
  }

  const { host, port, database, username, password, protocol, connectionMethod } = config;
  const dbProtocol = (protocol || 'postgresql').toLowerCase();
  const connMethod = connectionMethod || 'on-prem';

  let dbConnection = null;
  let dbType = null;

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

      dbConnection = new Database(filePath);
      dbType = 'sqlite';
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
      dbConnection = client;
      dbType = 'postgresql';
    } else if (dbProtocol === 'mysql') {
      const connection = await mysql.createConnection({
        host: host || 'localhost',
        port: port || 3306,
        database: database,
        user: username,
        password: password,
      });
      dbConnection = connection;
      dbType = 'mysql';
    } else {
      throw new Error(`Unsupported database protocol: ${dbProtocol}`);
    }

    const schemaManager = new SchemaManager(dbConnection, dbType);
    const results = await schemaManager.setupRequiredTables();

    if (dbType === 'sqlite') {
      dbConnection.close();
    } else {
      await dbConnection.end();
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    if (dbConnection) {
      try {
        if (dbType === 'sqlite') {
          dbConnection.close();
        } else {
          await dbConnection.end();
        }
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }

    throw error;
  }
}

// Crear aplicación Express
const app = express();

// Middlewares con CORS específico para localhost
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Ruta básica para verificar si el servidor está funcionando
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!appDb || !appDb.verifySystemUser) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const user = appDb.verifySystemUser(username, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await logSystemAction(user.id, 'system_user_login', {
      username: user.username,
      user_type: user.type
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        type: user.type
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { username, sessionId } = req.body;

    await logSystemAction(null, 'system_user_logout', {
      username,
      session_id: sessionId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/system-users', async (req, res) => {
  try {
    if (!appDb || !appDb.getAllSystemUsers) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const users = appDb.getAllSystemUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching system users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/system-users', async (req, res) => {
  try {
    const { username, password, email, type } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!appDb || !appDb.createSystemUser) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const user = appDb.createSystemUser(username, password, type || 'user', email);

    await logSystemAction(null, 'system_user_created', {
      user_id: user.id,
      username: user.username,
      type: user.type
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating system user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

app.put('/api/system-users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, type } = req.body;

    if (!appDb || !appDb.updateSystemUser) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const user = appDb.updateSystemUser(id, { username, password, email, type });

    await logSystemAction(null, 'system_user_updated', {
      user_id: id,
      username: user.username,
      type: user.type
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating system user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

app.delete('/api/system-users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!appDb || !appDb.deleteSystemUser) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const user = appDb.getSystemUser(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    appDb.deleteSystemUser(id);

    await logSystemAction(null, 'system_user_deleted', {
      user_id: id,
      username: user.username
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting system user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Get primary database integration (first connected database from local SQLite)
function getPrimaryIntegration() {
  if (!appDb || !appDb.getAllIntegrations) {
    return null;
  }

  const integrations = appDb.getAllIntegrations();
  const connectedDb = integrations.find(i => i.type === 'database' && i.status === 'connected');
  return connectedDb || null;
}

// CRUD Endpoints for Integrations
// Integration metadata is ALWAYS stored in DefaultRecorderDB (local SQLite)
app.get('/api/integrations', async (req, res) => {
  try {
    if (!appDb || !appDb.getAllIntegrations) {
      return res.json([]);
    }
    const integrations = appDb.getAllIntegrations();
    res.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/integrations', async (req, res) => {
  try {
    const { name, type, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    if (!appDb || !appDb.createIntegration) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const newIntegration = appDb.createIntegration({ name, type, status: 'disconnected', config: config || {} });

    // Log the action
    await logSystemAction(null, 'integration_created', {
      integration_id: newIntegration.id,
      integration_name: name,
      integration_type: type
    });

    res.status(201).json(newIntegration);
  } catch (error) {
    console.error('Error creating integration:', error);

    // Log the error
    await logSystemAction(null, 'integration_creation_failed', {
      integration_name: req.body.name,
      integration_type: req.body.type,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

app.put('/api/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, config, status, last_sync } = req.body;


    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (config !== undefined) updateData.config = config;
    if (status !== undefined) updateData.status = status;
    if (last_sync !== undefined) updateData.last_sync = last_sync;

    if (!appDb || !appDb.updateIntegration) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const integration = appDb.updateIntegration(id, updateData);

    // Log the action
    await logSystemAction(null, 'integration_updated', {
      integration_id: id,
      integration_name: integration.name,
      updated_fields: Object.keys(updateData)
    });

    // If status changed to "connected", setup schema and migrate data
    if (status === 'connected' && type === 'database') {
      setImmediate(async () => {
        try {
          // Setup schema in the new database
          const schemaResult = await setupIntegrationSchema(integration);
          await logSystemAction(null, 'integration_schema_setup', {
            integration_id: id,
            integration_name: integration.name,
            schema_setup_result: schemaResult
          });

          // Migrate data from local SQLite to the new database
          const { DataMigrator } = await import('./database/DataMigrator.js');
          const migrator = new DataMigrator(appDb);
          const exportedData = appDb.exportData();

          console.log(`Migrating data to ${integration.name}...`, exportedData);

          const { IntegrationDB } = await import('./database/IntegrationDB.js');
          const targetDb = new IntegrationDB(integration);
          await targetDb.connect();

          // Migrate based on database type
          let migrationResult;
          const dbType = targetDb.dbType;

          if (dbType === 'postgresql') {
            migrationResult = await migrator.migrateToPostgres(targetDb.connection, appDb);
          } else if (dbType === 'mysql') {
            migrationResult = await migrator.migrateToMySQL(targetDb.connection, appDb);
          } else if (dbType === 'sqlite') {
            migrationResult = await migrator.migrateToSQLite({ db: targetDb.connection }, appDb);
          }

          await targetDb.disconnect();

          await logSystemAction(null, 'data_migrated_to_integration', {
            integration_id: id,
            integration_name: integration.name,
            migration_result: migrationResult
          });

          console.log('✓ Data migration completed:', migrationResult);
        } catch (error) {
          console.error('Error setting up schema or migrating data:', error);
          await logSystemAction(null, 'integration_setup_failed', {
            integration_id: id,
            integration_name: integration.name,
            error: error.message
          });
        }
      });
    }

    res.json(integration);
  } catch (error) {
    console.error('Error updating integration:', error);

    // Log the error
    await logSystemAction(null, 'integration_update_failed', {
      integration_id: req.params.id,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shouldMigrate = req.query.migrate === 'true';
    console.log('Deleting integration with id:', id);
    console.log('Should migrate data:', shouldMigrate);

    if (!appDb || !appDb.getIntegration || !appDb.deleteIntegration) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const integration = appDb.getIntegration(id);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // CRITICAL: Check database for environments using this integration
    const allEnvironments = appDb.getEnvironments ? appDb.getEnvironments() : [];

    console.log('Checking', allEnvironments.length, 'environments from database for integration usage');

    const usedInEnvironments = allEnvironments.filter(env => {
      const integrations = env.integrations || {};
      const isUsed = Object.values(integrations).includes(id);
      if (isUsed) {
        console.log(`Integration ${id} is used in environment: ${env.name}`);
      }
      return isUsed;
    });

    if (usedInEnvironments.length > 0) {
      const envNames = usedInEnvironments.map(env => env.name).join(', ');

      // Log the failed deletion attempt
      await logSystemAction(null, 'integration_deletion_blocked', {
        integration_id: id,
        integration_name: integration?.name,
        integration_type: integration?.type,
        reason: 'Integration linked to environments',
        used_in_environments: envNames
      });

      return res.status(400).json({
        error: `Cannot delete integration. It is currently linked to the following environments: ${envNames}. Please unlink it from these environments first.`,
        environmentNames: envNames,
        isLinked: true
      });
    }

    // If it's a database integration and migration is requested, migrate data before deletion
    let migrationResult = null;
    if (integration.type === 'database' && shouldMigrate) {
      console.log(`Migrating data from database integration ${integration.name} before deletion...`);

      try {
        const { IntegrationDB } = await import('./database/IntegrationDB.js');
        const { DataMigrator } = await import('./database/DataMigrator.js');

        const integrationDb = new IntegrationDB(integration);
        await integrationDb.connect();

        const exportedData = await integrationDb.exportAllData();
        console.log('Data exported:', {
          integrations: exportedData.integrations.length,
          test_sessions: exportedData.test_sessions.length,
          yelp_users: exportedData.yelp_users.length,
          system_logs: exportedData.system_logs.length
        });

        const migrator = new DataMigrator({ exportAllData: () => exportedData });
        migrationResult = await migrator.migrateToSQLite(appDb);

        await integrationDb.disconnect();

        console.log('Migration completed successfully:', migrationResult);

        await logSystemAction(null, 'integration_data_migrated_on_delete', {
          integration_id: id,
          integration_name: integration.name,
          migrated: migrationResult.migrated
        });
      } catch (migrationError) {
        console.error('Error during migration:', migrationError);
        await logSystemAction(null, 'integration_migration_warning', {
          integration_id: id,
          integration_name: integration.name,
          error: migrationError.message,
          note: 'Proceeding with deletion despite migration failure'
        });
      }
    } else if (integration.type === 'database' && !shouldMigrate) {
      console.log(`Deleting data from database integration ${integration.name} (data will be lost)`);

      try {
        const { IntegrationDB } = await import('./database/IntegrationDB.js');
        const integrationDb = new IntegrationDB(integration);
        await integrationDb.connect();

        // Clear all data except user 'aroa'
        if (integrationDb.dbType === 'sqlite') {
          const tables = ['test_sessions', 'system_logs', 'integrations', 'environments'];
          for (const table of tables) {
            const tableExists = integrationDb.connection.prepare(
              `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
            ).get();
            if (tableExists) {
              const stmt = integrationDb.connection.prepare(`DELETE FROM ${table}`);
              stmt.run();
              console.log(`Cleared data from table: ${table}`);
            }
          }

          // Delete all yelp_users except 'aroa'
          const usersTableExists = integrationDb.connection.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='yelp_users'"
          ).get();
          if (usersTableExists) {
            const deleteUsersStmt = integrationDb.connection.prepare("DELETE FROM yelp_users WHERE username != 'aroa'");
            deleteUsersStmt.run();
            console.log('Cleared yelp_users (kept user aroa)');
          }

          console.log('All data cleared from SQLite database (kept user aroa)');
        } else if (integrationDb.dbType === 'postgresql') {
          const tables = ['test_sessions', 'system_logs', 'integrations', 'environments'];
          for (const table of tables) {
            const tableCheck = await integrationDb.connection.query(
              `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`
            );
            if (tableCheck.rows[0].exists) {
              await integrationDb.connection.query(`DELETE FROM ${table}`);
              console.log(`Cleared data from table: ${table}`);
            }
          }

          const usersTableCheck = await integrationDb.connection.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'yelp_users')"
          );
          if (usersTableCheck.rows[0].exists) {
            await integrationDb.connection.query("DELETE FROM yelp_users WHERE username != 'aroa'");
            console.log('Cleared yelp_users (kept user aroa)');
          }

          console.log('All data cleared from PostgreSQL database (kept user aroa)');
        } else if (integrationDb.dbType === 'mysql') {
          const tables = ['test_sessions', 'system_logs', 'integrations', 'environments'];
          for (const table of tables) {
            const [tableCheck] = await integrationDb.connection.query(
              `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}'`
            );
            if (tableCheck[0].count > 0) {
              await integrationDb.connection.query(`DELETE FROM ${table}`);
              console.log(`Cleared data from table: ${table}`);
            }
          }

          const [usersTableCheck] = await integrationDb.connection.query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'yelp_users'"
          );
          if (usersTableCheck[0].count > 0) {
            await integrationDb.connection.query("DELETE FROM yelp_users WHERE username != 'aroa'");
            console.log('Cleared yelp_users (kept user aroa)');
          }

          console.log('All data cleared from MySQL database (kept user aroa)');
        }

        await integrationDb.disconnect();

        await logSystemAction(null, 'integration_data_cleared', {
          integration_id: id,
          integration_name: integration.name,
          note: 'All data cleared from integration database except user aroa'
        });
      } catch (clearError) {
        console.error('Error clearing data from integration database:', clearError);
        await logSystemAction(null, 'integration_data_clear_failed', {
          integration_id: id,
          integration_name: integration.name,
          error: clearError.message
        });
      }

      // IMPORTANT: Truncate ALL tables in defaultRecorder.db and restore only aroa user
      // since the app will switch back to using it after integration deletion
      console.log('Truncating ALL tables in defaultRecorder.db (appDb)...');
      try {
        if (appDb && appDb.db) {
          // Step 1: DELETE ALL data from ALL tables (complete truncate)
          console.log('Step 1: Deleting all data from all tables...');

          appDb.db.prepare('DELETE FROM test_sessions').run();
          console.log('  ✓ Truncated test_sessions');

          appDb.db.prepare('DELETE FROM system_logs').run();
          console.log('  ✓ Truncated system_logs');

          appDb.db.prepare('DELETE FROM user_sessions').run();
          console.log('  ✓ Truncated user_sessions');

          appDb.db.prepare('DELETE FROM integrations').run();
          console.log('  ✓ Truncated integrations');

          appDb.db.prepare('DELETE FROM environments').run();
          console.log('  ✓ Truncated environments');

          appDb.db.prepare('DELETE FROM yelp_users').run();
          console.log('  ✓ Truncated yelp_users');

          appDb.db.prepare('DELETE FROM system_users').run();
          console.log('  ✓ Truncated system_users');

          // Step 2: Verify tables are empty
          const yelpCount = appDb.db.prepare('SELECT COUNT(*) as count FROM yelp_users').get();
          const systemCount = appDb.db.prepare('SELECT COUNT(*) as count FROM system_users').get();
          console.log(`Step 2: Verification - yelp_users: ${yelpCount.count}, system_users: ${systemCount.count}`);

          // Step 3: Restore ONLY user aroa
          console.log('Step 3: Restoring ONLY user aroa...');

          // Restore user aroa in yelp_users with a fixed ID to ensure uniqueness
          appDb.db.prepare(`
            INSERT INTO yelp_users (id, username, email, config, is_active, created_at, updated_at)
            VALUES ('aroa-yelp-user', 'aroa', 'aroa@example.com', '{}', 1, datetime('now'), datetime('now'))
          `).run();
          console.log('  ✓ Restored yelp user: aroa (id=aroa-yelp-user)');

          // Restore system admin aroa in system_users with a fixed ID
          appDb.db.prepare(`
            INSERT INTO system_users (id, username, password, type, email, created_at, updated_at)
            VALUES ('aroa-system-admin', 'aroa', '123456789', 'systemadmin', 'aroa@example.com', datetime('now'), datetime('now'))
          `).run();
          console.log('  ✓ Restored system admin: aroa (id=aroa-system-admin, password=123456789)');

          // Step 4: Final verification
          const finalYelpCount = appDb.db.prepare('SELECT COUNT(*) as count FROM yelp_users').get();
          const finalSystemCount = appDb.db.prepare('SELECT COUNT(*) as count FROM system_users').get();
          const yelpUsers = appDb.db.prepare('SELECT username FROM yelp_users').all();
          const systemUsers = appDb.db.prepare('SELECT username FROM system_users').all();

          console.log(`Step 4: Final state - yelp_users: ${finalYelpCount.count} (${yelpUsers.map(u => u.username).join(', ')})`);
          console.log(`            system_users: ${finalSystemCount.count} (${systemUsers.map(u => u.username).join(', ')})`);
        }

        console.log('✓ All tables truncated and ONLY user aroa restored in defaultRecorder.db');
      } catch (appDbClearError) {
        console.error('Error clearing data from appDb:', appDbClearError);
        console.error('Error details:', appDbClearError.message);
      }

      // Integration was already deleted as part of clearing all integrations from appDb
      // No need to call deleteIntegration(id) again
    } else {
      // For migrations or non-database integrations, delete the integration normally
      const deleted = appDb.deleteIntegration(id);
      if (!deleted) {
        return res.status(500).json({ error: 'Failed to delete integration' });
      }
    }

    // Don't log to system_logs since they were cleared
    if (integration.type !== 'database' || shouldMigrate) {
      await logSystemAction(null, 'integration_deleted', {
        integration_id: id,
        integration_name: integration?.name,
        integration_type: integration?.type,
        data_migrated: !!migrationResult
      });
    }

    console.log('Successfully deleted integration');
    res.json({
      success: true,
      migrated: migrationResult ? migrationResult.migrated : null
    });
  } catch (error) {
    console.error('Error deleting integration:', error);

    // Log the error
    await logSystemAction(null, 'integration_deletion_failed', {
      integration_id: req.params.id,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

app.post('/api/integrations/:id/setup-schema', async (req, res) => {
  try {
    const { id } = req.params;
    if (!appDb || !appDb.getAllIntegrations) {
      return res.json([]);
    }
    const integrations = appDb.getAllIntegrations();
    const integration = integrations.find(i => i.id === id);

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const result = await setupIntegrationSchema(integration);

    await logSystemAction(null, 'integration_schema_setup', {
      integration_id: id,
      integration_name: integration.name,
      schema_setup_result: result
    });

    res.json(result);
  } catch (error) {
    console.error('Error setting up schema:', error);

    await logSystemAction(null, 'integration_schema_setup_failed', {
      integration_id: req.params.id,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// Endpoint to migrate data from integration DB back to defaultRecorder.db
app.post('/api/integrations/:id/migrate-to-default', async (req, res) => {
  try {
    const { id } = req.params;
    if (!appDb || !appDb.getAllIntegrations) {
      return res.json([]);
    }
    const integrations = appDb.getAllIntegrations();
    const integration = integrations.find(i => i.id === id);

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.type !== 'database') {
      return res.status(400).json({ error: 'Only database integrations can be migrated' });
    }

    console.log(`Migrating data from integration ${integration.name} to defaultRecorder.db...`);

    // Import required classes
    const { IntegrationDB } = await import('./database/IntegrationDB.js');
    const { DataMigrator } = await import('./database/DataMigrator.js');

    // Connect to the integration database
    const integrationDb = new IntegrationDB(integration);
    await integrationDb.connect();

    // Export all data from integration DB
    const exportedData = await integrationDb.exportAllData();
    console.log('Data exported:', {
      integrations: exportedData.integrations.length,
      test_sessions: exportedData.test_sessions.length,
      yelp_users: exportedData.yelp_users.length,
      system_logs: exportedData.system_logs.length
    });

    // Migrate to defaultRecorder.db (SQLite)
    const migrator = new DataMigrator({ exportAllData: () => exportedData });
    const result = await migrator.migrateToSQLite(appDb);

    // Disconnect from integration DB
    await integrationDb.disconnect();

    console.log('Migration completed successfully:', result);

    await logSystemAction(null, 'integration_data_migrated', {
      integration_id: id,
      integration_name: integration.name,
      migrated: result.migrated
    });

    res.json({
      success: true,
      message: 'Data migrated successfully to defaultRecorder.db',
      migrated: result.migrated
    });
  } catch (error) {
    console.error('Error migrating data:', error);

    await logSystemAction(null, 'integration_data_migration_failed', {
      integration_id: req.params.id,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// Endpoint para probar conexiones de integración
app.post('/api/integrations/test-connection', async (req, res) => {
  console.log('Testing connection for integration:', req.body.type);
  const { id, type, config, name } = req.body;

  if (!type || !config) {
    return res.status(400).json({
      success: false,
      error: 'Missing type or config'
    });
  }

  const testStartTime = new Date().toISOString();

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);
  let testResult = null;

  res.json = function(data) {
    testResult = data;
    return originalJson(data);
  };

  try {
    switch (type) {
      case 'database':
        await testDatabaseConnection(config, res);
        break;
      case 'proxy':
        await testProxyConnection(config, res);
        break;
      case 'vpn':
        await testVpnConnection(config, res);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown integration type: ${type}`
        });
    }

    // Log the test result after response is sent
    if (testResult) {
      setImmediate(async () => {
        await logSystemAction(null, 'integration_test', {
          integration_id: id || null,
          integration_name: name || 'Unknown',
          integration_type: type,
          test_start_time: testStartTime,
          test_end_time: new Date().toISOString(),
          test_result: testResult.success ? 'success' : 'failure',
          test_message: testResult.message || testResult.error,
          test_details: config
        });
      });
    }
  } catch (error) {
    console.error('Connection test error:', error);

    // Log the failed test
    setImmediate(async () => {
      await logSystemAction(null, 'integration_test', {
        integration_id: id || null,
        integration_name: name || 'Unknown',
        integration_type: type,
        test_start_time: testStartTime,
        test_end_time: new Date().toISOString(),
        test_result: 'error',
        test_message: error.message,
        test_details: config
      });
    });

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
});

async function testDatabaseConnection(config, res) {
  const { host, port, database, username, password, protocol, connectionMethod, apiToken } = config;
  const dbProtocol = (protocol || 'postgresql').toLowerCase();
  const connMethod = connectionMethod || 'on-prem';

  // Handle SQLite
  if (connMethod === 'sqlite' || dbProtocol === 'sqlite') {
    if (!database) {
      return res.json({
        success: false,
        error: 'Database name is required for SQLite'
      });
    }

    if (!Database) {
      return res.json({
        success: false,
        error: 'SQLite support not available in this environment. better-sqlite3 module could not be loaded.'
      });
    }

    try {
      // Create the file path in the project root
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const projectRoot = path.resolve(__dirname, '..');

      // Ensure database name ends with .db or .sqlite
      let dbFileName = database;
      if (!dbFileName.endsWith('.db') && !dbFileName.endsWith('.sqlite')) {
        dbFileName += '.sqlite';
      }

      const filePath = path.join(projectRoot, dbFileName);

      let db;
      let wasCreated = false;

      try {
        db = new Database(filePath, { readonly: true, fileMustExist: true });
      } catch (openErr) {
        if (openErr.code === 'SQLITE_CANTOPEN' || openErr.message.includes('ENOENT') || openErr.message.includes('does not exist')) {
          db = new Database(filePath);
          wasCreated = true;
        } else {
          throw openErr;
        }
      }

      const result = db.prepare('SELECT 1 as test').get();
      db.close();

      return res.json({
        success: true,
        message: wasCreated
          ? `SQLite database created and connected successfully at ${dbFileName}`
          : `Successfully connected to SQLite database at ${dbFileName}`
      });
    } catch (err) {
      console.error('SQLite connection error:', err);
      let errorMsg = err.message;

      if (err.message.includes('not a database')) {
        errorMsg = `File is not a valid SQLite database`;
      } else if (err.code === 'EACCES') {
        errorMsg = `Permission denied accessing database file`;
      } else {
        errorMsg = `Failed to connect to SQLite database: ${err.message}`;
      }

      return res.json({
        success: false,
        error: errorMsg
      });
    }
  }

  // For non-SQLite connections, require host
  if (!host) {
    return res.json({
      success: false,
      error: 'Host is required'
    });
  }

  const actualPort = parseInt(port) || (dbProtocol.includes('mysql') ? 3306 : 5432);
  const timeout = parseInt(config.timeout) || 15000;

  try {
    if (dbProtocol.includes('postgres') || dbProtocol === 'postgresql') {
      const { Client } = pg;

      const clientConfig = {
        host,
        port: actualPort,
        database: database || 'postgres',
        user: username || 'postgres',
        password: password || '',
        connectionTimeoutMillis: timeout,
      };

      // Add SSL configuration if enabled
      if (config.ssl) {
        clientConfig.ssl = {
          rejectUnauthorized: false
        };
      }

      const client = new Client(clientConfig);

      try {
        await client.connect();
        await client.query('SELECT 1');
        await client.end();

        return res.json({
          success: true,
          message: `Successfully connected to PostgreSQL database at ${host}:${actualPort}/${database || 'postgres'}`
        });
      } catch (err) {
        try { await client.end(); } catch {}

        let errorMsg = err.message;
        if (err.code === '28P01') {
          errorMsg = `Authentication failed for user "${username}". Check username and password.`;
        } else if (err.code === '3D000') {
          errorMsg = `Database "${database}" does not exist.`;
        } else if (err.code === 'ECONNREFUSED') {
          errorMsg = `Connection refused to ${host}:${actualPort}. PostgreSQL service may be down.`;
        } else if (err.code === 'ETIMEDOUT') {
          errorMsg = `Connection to ${host}:${actualPort} timed out.`;
        } else if (err.code === 'ENOTFOUND') {
          errorMsg = `Host ${host} not found. Check hostname.`;
        } else if (err.message.includes('no pg_hba.conf entry') || err.message.includes('no encryption')) {
          errorMsg = `PostgreSQL server rejected the connection: ${err.message}. This may require SSL configuration or pg_hba.conf adjustments on the server.`;
        }

        return res.json({
          success: false,
          error: errorMsg
        });
      }
    } else if (dbProtocol.includes('mysql')) {
      try {
        const mysqlConfig = {
          host,
          port: actualPort,
          database: database || 'mysql',
          user: username || 'root',
          password: password || '',
          connectTimeout: timeout,
        };

        // Add SSL configuration if enabled
        if (config.ssl) {
          mysqlConfig.ssl = {
            rejectUnauthorized: false
          };
        }

        const connection = await mysql.createConnection(mysqlConfig);

        await connection.query('SELECT 1');
        await connection.end();

        return res.json({
          success: true,
          message: `Successfully connected to MySQL database at ${host}:${actualPort}/${database || 'mysql'}`
        });
      } catch (err) {
        console.error('MySQL connection error:', err);
        let errorMsg = err.message;
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
          errorMsg = `Authentication failed for user "${username}". Check username and password.`;
        } else if (err.code === 'ER_BAD_DB_ERROR') {
          errorMsg = `Database "${database}" does not exist.`;
        } else if (err.code === 'ECONNREFUSED') {
          errorMsg = `Connection refused to ${host}:${actualPort}. MySQL service may be down or port is blocked.`;
        } else if (err.code === 'ETIMEDOUT') {
          errorMsg = `Connection to ${host}:${actualPort} timed out after ${timeout}ms. This could mean:\n- The host is not reachable\n- Firewall is blocking the connection\n- The server is not responding`;
        } else if (err.code === 'ENOTFOUND') {
          errorMsg = `Host ${host} not found. Check hostname or DNS settings.`;
        } else if (err.errno === -111) {
          errorMsg = `Connection refused to ${host}:${actualPort}. The MySQL service may be down or the port is blocked by a firewall.`;
        } else if (err.errno === 'ETIMEDOUT' || err.sqlState === 'HY000') {
          errorMsg = `Connection to ${host}:${actualPort} timed out (${timeout}ms). Possible causes:\n- Host is unreachable from this server\n- Firewall blocking port ${actualPort}\n- MySQL server not accepting remote connections`;
        }

        return res.json({
          success: false,
          error: errorMsg,
          details: {
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState
          }
        });
      }
    } else {
      return res.json({
        success: false,
        error: `Unsupported database protocol: ${dbProtocol}. Supported: postgresql, mysql, sqlite`
      });
    }
  } catch (err) {
    console.error('Database connection test error:', err);
    if (!res.headersSent) {
      return res.json({
        success: false,
        error: `Error testing connection: ${err.message}`
      });
    }
  }
}

async function testProxyConnection(config, res) {
  const { host, port, protocol } = config;

  if (!host) {
    return res.json({
      success: false,
      error: 'Host is required'
    });
  }

  const net = await import('net');

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;
    const actualPort = port || 8080;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      res.json({
        success: true,
        message: `Successfully connected to proxy ${host}:${actualPort}`
      });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection to ${host}:${actualPort} timed out after ${timeout}ms`
      });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      let errorMsg = err.message;
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Connection refused to ${host}:${actualPort}. Proxy service may be down or unreachable.`;
      } else if (err.code === 'ETIMEDOUT') {
        errorMsg = `Connection to ${host}:${actualPort} timed out.`;
      } else if (err.code === 'ENOTFOUND') {
        errorMsg = `Host ${host} not found. Check hostname.`;
      } else if (err.code === 'ENETUNREACH') {
        errorMsg = `Network unreachable to ${host}:${actualPort}.`;
      }
      res.json({
        success: false,
        error: errorMsg
      });
      resolve();
    });

    socket.connect(actualPort, host);
  });
}

async function testVpnConnection(config, res) {
  const { host, protocol } = config;

  if (!host) {
    return res.json({
      success: false,
      error: 'Host is required'
    });
  }

  if (!protocol) {
    return res.json({
      success: false,
      error: 'Protocol is required for VPN connections'
    });
  }

  const net = await import('net');

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;
    const port = protocol.toLowerCase() === 'openvpn' ? 1194 : 51820;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      res.json({
        success: true,
        message: `Successfully connected to VPN ${host}:${port} (${protocol})`
      });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.json({
        success: false,
        error: `Connection to ${host}:${port} timed out after ${timeout}ms`
      });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      let errorMsg = err.message;
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Connection refused to ${host}:${port}. VPN service may be down or unreachable.`;
      } else if (err.code === 'ETIMEDOUT') {
        errorMsg = `Connection to ${host}:${port} timed out.`;
      } else if (err.code === 'ENOTFOUND') {
        errorMsg = `Host ${host} not found. Check hostname.`;
      } else if (err.code === 'ENETUNREACH') {
        errorMsg = `Network unreachable to ${host}:${port}.`;
      }
      res.json({
        success: false,
        error: errorMsg
      });
      resolve();
    });

    socket.connect(port, host);
  });
}

// Endpoint principal para ejecutar código Puppeteer
app.post('/api/tests/execute-puppeteer', async (req, res) => {
  console.log('Received execute-puppeteer request');
  const { code, headless = true } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  let browser;
  try {
    console.log(`Launching browser with headless: ${headless}`);
    
    // Configuración de puppeteer
    browser = await puppeteer.launch({
      headless: Boolean(headless),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Capturar logs del navegador
    const logs = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
      // Eliminar/reemplazar las declaraciones import/export y otras construcciones ES módulos
      const strippedCode = code
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import removed')
        .replace(/export\s+async\s+function/g, 'async function')
        .replace(/export\s+function/g, 'function')
        .replace(/export\s+const/g, 'const')
        .replace(/export\s+let/g, 'let')
        .replace(/export\s+var/g, 'var')
        .replace(/export\s+default/g, '// export default removed')
        .replace(/import\.meta\.url/g, '"mock_import_meta_url"')
        .replace(/if\s*\(\s*process\s+&&\s+import\.meta\.url\s*===\s*url\.pathToFileURL\s*\(\s*process\.argv\s*\[\s*1\s*\]\s*\)\.href\s*\)\s*\{([\s\S]*?)\}/g, '// Removed process check block');

      console.log('Processed code:', strippedCode);
      
      // Crear mocks para módulos comunes
      const url = {
        pathToFileURL: (path) => ({ href: path })
      };
      
      // Mock básico para @puppeteer/replay
      const createRunner = (extension) => {
        console.log('Creating mock runner with extension:', extension);
        return {
          runBeforeAllSteps: async () => console.log('Mock: runBeforeAllSteps'),
          runAfterAllSteps: async () => console.log('Mock: runAfterAllSteps'),
          runStep: async (step) => {
            console.log(`Mock step: ${step.type}`);
            
            switch(step.type) {
              case 'navigate':
                await page.goto(step.url);
                break;
              case 'click':
                if (step.selectors && step.selectors.length > 0) {
                  try {
                    await page.waitForSelector(step.selectors[0][0], { timeout: 5000 });
                    await page.click(step.selectors[0][0]);
                  } catch (e) {
                    console.log('Click error:', e.message);
                  }
                }
                break;
              case 'setViewport':
                await page.setViewport({
                  width: step.width || 1280,
                  height: step.height || 800,
                  deviceScaleFactor: step.deviceScaleFactor || 1,
                  isMobile: !!step.isMobile,
                  hasTouch: !!step.hasTouch,
                  isLandscape: !!step.isLandscape
                });
                break;
              case 'change':
                if (step.selectors && step.selectors.length > 0) {
                  try {
                    await page.waitForSelector(step.selectors[0][0], { timeout: 5000 });
                    await page.type(step.selectors[0][0], step.value || '');
                  } catch (e) {
                    console.log('Change error:', e.message);
                  }
                }
                break;
              case 'keyDown':
              case 'keyUp':
                try {
                  await page.keyboard.press(step.key || 'Tab');
                } catch (e) {
                  console.log(`Key${step.type} error:`, e.message);
                }
                break;
              default:
                console.log(`Step type '${step.type}' not implemented in mock`);
            }
          }
        };
      };
      
      // Forzar la ejecución de la función run si está presente
      const runCodeWithForcedExecution = `
        ${strippedCode}
        
        // Llamar directamente a run()
        if (typeof run === 'function') {
          await run({});
        }
      `;
      
      // Ejecutar código modificado
      const executeUserCode = new Function('browser', 'page', 'url', 'createRunner', 'process', `
        return (async () => {
          try {
            ${runCodeWithForcedExecution}
            return { success: true, message: "Execition Done" };
          } catch (error) {
            return { error: error.toString() };
          }
        })();
      `);
      
      // Crear un mock para process
      const processMock = {
        argv: ['/path/to/node', '/path/to/script.js']
      };
      
      const result = await executeUserCode(browser, page, url, createRunner, processMock);
      
      await browser.close();
      browser = null;
      
      return res.json({
        output: JSON.stringify(result, null, 2),
        logs: logs.join('\n')
      });
      
    } catch (evalError) {
      console.error('Error al evaluar el código:', evalError);
      
      // Ejecutar código alternativo simple
      await page.goto('https://www.example.com');
      const title = await page.title();
      
      await browser.close();
      browser = null;
      
      return res.json({
        output: JSON.stringify({
          success: false,
          error: evalError.toString(),
          fallbackTitle: title,
          message: "Error on the code,alternative browsing"
        }, null, 2),
        logs: logs.join('\n')
      });
    }
    
  } catch (error) {
    console.error('Error executing Puppeteer code:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    return res.status(500).json({
      error: `Error executing code: ${error.message}`
    });
  }
});

// Iniciar el servidor
// System Logs endpoint
app.get('/api/logs/system/recent', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    // Return mock logs for now - in production, this would read actual system logs
    res.json([
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server started successfully',
        source: 'system'
      }
    ]);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Environment endpoints
app.get('/api/environments', async (req, res) => {
  try {
    const environments = appDb.getEnvironments ? appDb.getEnvironments() : [];
    res.json(environments || []);
  } catch (error) {
    console.error('Error fetching environments:', error);
    res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

app.post('/api/environments', async (req, res) => {
  try {
    const environment = appDb.createEnvironment ? appDb.createEnvironment(req.body) : null;
    if (!environment) {
      return res.status(500).json({ error: 'Failed to create environment' });
    }
    await logSystemAction(null, 'environment_created', {
      environment_id: environment.id,
      environment_name: environment.name
    });
    res.json(environment);
  } catch (error) {
    console.error('Error creating environment:', error);
    res.status(500).json({ error: 'Failed to create environment' });
  }
});

app.put('/api/environments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const environment = appDb.updateEnvironment ? appDb.updateEnvironment(id, req.body) : null;
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    await logSystemAction(null, 'environment_updated', {
      environment_id: id,
      environment_name: environment.name
    });
    res.json(environment);
  } catch (error) {
    console.error('Error updating environment:', error);
    res.status(500).json({ error: 'Failed to update environment' });
  }
});

app.delete('/api/environments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = appDb.deleteEnvironment ? appDb.deleteEnvironment(id) : false;
    if (!deleted) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    await logSystemAction(null, 'environment_deleted', {
      environment_id: id
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting environment:', error);
    res.status(500).json({ error: 'Failed to delete environment' });
  }
});

// Test session endpoints
app.get('/api/tests/sessions', async (req, res) => {
  try {
    const sessions = appDb.getTestSessions ? appDb.getTestSessions() : [];
    res.json(sessions || []);
  } catch (error) {
    console.error('Error fetching test sessions:', error);
    res.status(500).json({ error: 'Failed to fetch test sessions' });
  }
});

app.post('/api/tests/start', async (req, res) => {
  try {
    const sessionData = req.body;
    const session = appDb.createTestSession(sessionData);

    // Log test session start
    await logSystemAction(null, 'test_session_started', {
      session_id: session.id,
      integration_id: sessionData.integration_id,
      yelp_user_id: sessionData.yelp_user_id,
      environment: sessionData.environment
    });

    res.json(session);
  } catch (error) {
    console.error('Error starting test session:', error);

    // Log the error
    await logSystemAction(null, 'test_session_start_failed', {
      error: error.message
    });

    res.status(500).json({ error: 'Failed to start test session' });
  }
});

app.get('/api/tests/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = appDb.getTestSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Test session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching test session:', error);
    res.status(500).json({ error: 'Failed to fetch test session' });
  }
});

app.post('/api/tests/stop/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = appDb.updateTestSession(sessionId, {
      status: 'stopped',
      completed_at: new Date().toISOString()
    });

    // Log test session stop
    await logSystemAction(null, 'test_session_stopped', {
      session_id: sessionId,
      status: session.status
    });

    res.json(session);
  } catch (error) {
    console.error('Error stopping test session:', error);

    // Log the error
    await logSystemAction(null, 'test_session_stop_failed', {
      session_id: req.params.sessionId,
      error: error.message
    });

    res.status(500).json({ error: 'Failed to stop test session' });
  }
});

// User endpoints
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = appDb.getYelpUser(userId);
    res.json(user || null);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/users/check/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = appDb.getYelpUserByUsername(username);
    res.json({ exists: !!user, user: user || null });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: 'Failed to check user' });
  }
});

app.post('/api/users/create', async (req, res) => {
  try {
    const userData = req.body;
    const user = appDb.createYelpUser(userData);

    await logSystemAction(null, 'test_user_created', {
      user_id: user.id,
      username: user.username,
      email: user.email
    });

    res.json(user);
  } catch (error) {
    console.error('Error creating user:', error);

    // Log the error
    await logSystemAction(null, 'test_user_creation_failed', {
      username: req.body.username,
      error: error.message
    });

    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Migrate data from defaultRecorder.db to active integration
app.post('/api/integrations/:id/migrate', async (req, res) => {
  try {
    const { id } = req.params;
    const integration = appDb.getIntegration ? appDb.getIntegration(id) : null;

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.type !== 'database') {
      return res.status(400).json({ error: 'Only database integrations can be migrated to' });
    }

    const { DataMigrator } = await import('./database/DataMigrator.js');
    const migrator = new DataMigrator(appDb);

    const config = integration.config;
    const dbProtocol = config.connectionString?.split(':')[0] || config.type || 'sqlite';

    let result;

    if (dbProtocol.includes('postgres') || dbProtocol === 'postgresql') {
      const { Client } = pg;
      const client = new Client({
        host: config.host,
        port: parseInt(config.port) || 5432,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false, requestCert: true } : false
      });

      await client.connect();
      result = await migrator.migrateToPostgres(client);
      await client.end();

    } else if (dbProtocol.includes('mysql')) {
      const connection = await mysql.createConnection({
        host: config.host,
        port: parseInt(config.port) || 3306,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false
      });

      result = await migrator.migrateToMySQL(connection);
      await connection.end();

    } else {
      return res.status(400).json({ error: 'Unsupported database type for migration' });
    }

    // Log the migration
    await logSystemAction(null, 'data_migrated', {
      integration_id: id,
      integration_name: integration.name,
      records_migrated: result.migrated
    });

    res.json(result);
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Post system log
app.post('/api/system-logs', async (req, res) => {
  try {
    const { action, details } = req.body;
    await logSystemAction(null, action, details);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging system action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get system logs from local database ONLY
// System logs are ALWAYS stored in the local DefaultRecorderDB, never in integration databases
app.get('/api/system-logs', async (req, res) => {
  try {
    // Always use local SQLite database for system logs
    if (!appDb || !appDb.getSystemLogs) {
      console.log('WARNING: No appDb or getSystemLogs method available');
      return res.json([]);
    }

    const logs = appDb.getSystemLogs(100);
    console.log(`Returning ${logs.length} system logs from local database`);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// User Sessions Endpoints
app.post('/api/user-sessions', async (req, res) => {
  try {
    const sessionData = req.body;
    const session = appDb.createUserSession(sessionData);
    console.log(`Created user session: ${session.id} for user ${session.username}`);
    res.json(session);
  } catch (error) {
    console.error('Error creating user session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-sessions', async (req, res) => {
  try {
    const sessions = appDb.getAllUserSessions();
    console.log(`Returning ${sessions.length} user sessions`);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/user-sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const session = appDb.updateUserSession(id, updates);
    console.log(`Updated user session: ${id}`);
    res.json(session);
  } catch (error) {
    console.error('Error updating user session:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`Minimal server running on http://localhost:${PORT}`);
  console.log(`Puppeteer endpoint available at: http://localhost:${PORT}/api/tests/execute-puppeteer`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying to restart...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error('Server error:', error);
  }
});
