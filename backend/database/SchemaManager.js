const REQUIRED_TABLES = {
  integrations: {
    columns: {
      id: { type: 'TEXT', primaryKey: true },
      name: { type: 'TEXT', notNull: true },
      type: { type: 'TEXT', notNull: true },
      status: { type: 'TEXT', default: "'disconnected'" },
      config: { type: 'TEXT', default: '{}' },
      last_sync: { type: 'TEXT' },
      created_at: { type: 'TEXT', default: 'CURRENT_TIMESTAMP' },
      updated_at: { type: 'TEXT', default: 'CURRENT_TIMESTAMP' }
    }
  },
  users: {
    columns: {
      id: { type: 'TEXT', primaryKey: true },
      username: { type: 'TEXT', unique: true, notNull: true },
      password: { type: 'TEXT', notNull: true },
      email: { type: 'TEXT' },
      created_by: { type: 'TEXT' },
      creation_time: { type: 'TEXT', default: 'CURRENT_TIMESTAMP' },
      type_of_user: { type: 'TEXT', notNull: true, default: "'TestUser'" }
    }
  },
  test_sessions: {
    columns: {
      id: { type: 'TEXT', primaryKey: true },
      session_id: { type: 'TEXT', unique: true, notNull: true },
      status: { type: 'TEXT', notNull: true, default: "'pending'" },
      test_type: { type: 'TEXT' },
      config: { type: 'TEXT', default: '{}' },
      results: { type: 'TEXT', default: '{}' },
      started_at: { type: 'TEXT' },
      ended_at: { type: 'TEXT' },
      created_at: { type: 'TEXT', default: 'CURRENT_TIMESTAMP' },
      updated_at: { type: 'TEXT', default: 'CURRENT_TIMESTAMP' }
    }
  }
};

class SchemaManager {
  constructor(dbConnection, dbType = 'sqlite') {
    this.db = dbConnection;
    this.dbType = dbType;
  }

  async getTableSchema(tableName) {
    if (this.dbType === 'sqlite') {
      return this.getSQLiteTableSchema(tableName);
    } else if (this.dbType === 'postgresql') {
      return this.getPostgreSQLTableSchema(tableName);
    } else if (this.dbType === 'mysql') {
      return this.getMySQLTableSchema(tableName);
    }
    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  getSQLiteTableSchema(tableName) {
    try {
      const result = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
      if (!result || result.length === 0) return null;

      const schema = {};
      for (const col of result) {
        schema[col.name] = {
          type: col.type,
          notNull: col.notnull === 1,
          default: col.dflt_value,
          primaryKey: col.pk === 1
        };
      }
      return schema;
    } catch (error) {
      return null;
    }
  }

  async getPostgreSQLTableSchema(tableName) {
    try {
      const result = await this.db.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (!result.rows || result.rows.length === 0) return null;

      const schema = {};
      for (const col of result.rows) {
        schema[col.column_name] = {
          type: col.data_type.toUpperCase(),
          notNull: col.is_nullable === 'NO',
          default: col.column_default,
          primaryKey: false
        };
      }
      return schema;
    } catch (error) {
      return null;
    }
  }

  async getMySQLTableSchema(tableName) {
    try {
      const [result] = await this.db.query(`
        DESCRIBE ${tableName}
      `);

      if (!result || result.length === 0) return null;

      const schema = {};
      for (const col of result) {
        schema[col.Field] = {
          type: col.Type.toUpperCase(),
          notNull: col.Null === 'NO',
          default: col.Default,
          primaryKey: col.Key === 'PRI'
        };
      }
      return schema;
    } catch (error) {
      return null;
    }
  }

  compareSchemas(existing, required) {
    const missingColumns = [];
    const differentColumns = [];

    for (const [colName, colDef] of Object.entries(required)) {
      if (!existing[colName]) {
        missingColumns.push(colName);
      } else {
        const existingType = existing[colName].type.toUpperCase();
        const requiredType = colDef.type.toUpperCase();

        if (!existingType.includes(requiredType.split('(')[0])) {
          differentColumns.push({
            column: colName,
            existing: existingType,
            required: requiredType
          });
        }
      }
    }

    return {
      matches: missingColumns.length === 0 && differentColumns.length === 0,
      missingColumns,
      differentColumns
    };
  }

  async backupTable(tableName) {
    const backupName = `${tableName}_backup_${Date.now()}`;

    try {
      if (this.dbType === 'sqlite') {
        this.db.prepare(`CREATE TABLE ${backupName} AS SELECT * FROM ${tableName}`).run();
      } else if (this.dbType === 'postgresql') {
        await this.db.query(`CREATE TABLE ${backupName} AS SELECT * FROM ${tableName}`);
      } else if (this.dbType === 'mysql') {
        await this.db.query(`CREATE TABLE ${backupName} AS SELECT * FROM ${tableName}`);
      }

      return { success: true, backupName };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateCreateTableSQL(tableName, schema) {
    const columns = [];
    const constraints = [];

    for (const [colName, colDef] of Object.entries(schema)) {
      let colSQL = `${colName} ${colDef.type}`;

      if (colDef.primaryKey) {
        if (this.dbType === 'sqlite') {
          colSQL += ' PRIMARY KEY';
        } else {
          constraints.push(`PRIMARY KEY (${colName})`);
        }
      }

      if (colDef.unique && !colDef.primaryKey) {
        colSQL += ' UNIQUE';
      }

      if (colDef.notNull && !colDef.primaryKey) {
        colSQL += ' NOT NULL';
      }

      if (colDef.default !== undefined) {
        if (this.dbType === 'sqlite') {
          colSQL += ` DEFAULT ${colDef.default}`;
        } else {
          colSQL += ` DEFAULT ${colDef.default}`;
        }
      }

      columns.push(colSQL);
    }

    const allParts = [...columns, ...constraints];
    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${allParts.join(',\n  ')}\n)`;
  }

  async createTable(tableName, schema) {
    const sql = this.generateCreateTableSQL(tableName, schema);

    try {
      if (this.dbType === 'sqlite') {
        this.db.prepare(sql).run();
      } else if (this.dbType === 'postgresql') {
        await this.db.query(sql);
      } else if (this.dbType === 'mysql') {
        await this.db.query(sql);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async dropTable(tableName) {
    try {
      if (this.dbType === 'sqlite') {
        this.db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
      } else if (this.dbType === 'postgresql') {
        await this.db.query(`DROP TABLE IF EXISTS ${tableName}`);
      } else if (this.dbType === 'mysql') {
        await this.db.query(`DROP TABLE IF EXISTS ${tableName}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async migrateData(fromTable, toTable) {
    try {
      if (this.dbType === 'sqlite') {
        this.db.prepare(`INSERT INTO ${toTable} SELECT * FROM ${fromTable}`).run();
      } else if (this.dbType === 'postgresql') {
        await this.db.query(`INSERT INTO ${toTable} SELECT * FROM ${fromTable}`);
      } else if (this.dbType === 'mysql') {
        await this.db.query(`INSERT INTO ${toTable} SELECT * FROM ${fromTable}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async setupRequiredTables() {
    const results = [];

    for (const [tableName, tableSchema] of Object.entries(REQUIRED_TABLES)) {
      const existingSchema = await this.getTableSchema(tableName);

      if (!existingSchema) {
        const createResult = await this.createTable(tableName, tableSchema.columns);
        results.push({
          table: tableName,
          action: 'created',
          success: createResult.success,
          error: createResult.error
        });
      } else {
        const comparison = this.compareSchemas(existingSchema, tableSchema.columns);

        if (!comparison.matches) {
          const backupResult = await this.backupTable(tableName);

          if (backupResult.success) {
            const dropResult = await this.dropTable(tableName);

            if (dropResult.success) {
              const createResult = await this.createTable(tableName, tableSchema.columns);

              if (createResult.success) {
                await this.migrateData(backupResult.backupName, tableName);
              }

              results.push({
                table: tableName,
                action: 'migrated',
                success: createResult.success,
                backupTable: backupResult.backupName,
                issues: comparison,
                error: createResult.error
              });
            }
          } else {
            results.push({
              table: tableName,
              action: 'backup_failed',
              success: false,
              error: backupResult.error
            });
          }
        } else {
          results.push({
            table: tableName,
            action: 'exists',
            success: true
          });
        }
      }
    }

    return results;
  }
}

export default SchemaManager;
