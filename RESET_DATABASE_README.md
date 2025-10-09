# Database Reset Script

This Python script provides a clean way to reset the `defaultRecorder.db` database to its initial state.

## What It Does

The script performs the following actions:

1. **Deletes** the existing `defaultRecorder.db` file (if it exists)
2. **Creates** a fresh database with all required tables:
   - `system_users`
   - `integrations`
   - `test_sessions`
   - `yelp_users`
   - `system_logs`
3. **Inserts** only one system admin user with these credentials:
   - **Username:** aroa
   - **Password:** 123456789
   - **Type:** systemadmin
   - **Email:** aroa@soaprojects.com
   - **Created Date:** Current timestamp (same as deletion time)
4. **Logs** the reset action in the `system_logs` table
5. **Verifies** the database was created correctly

## Requirements

- Python 3.x (built-in `sqlite3` module)
- No additional packages required

## Usage

### Option 1: Run with Python

```bash
python reset_database.py
```

### Option 2: Run as executable (Unix/Linux/Mac)

```bash
./reset_database.py
```

### Option 3: Run from any directory

```bash
python /path/to/project/reset_database.py
```

## Interactive Confirmation

The script will ask for confirmation before proceeding:

```
Are you sure you want to proceed? (yes/no):
```

Type `yes` or `y` to proceed, or `no` to cancel.

## Output Example

```
============================================================
DATABASE RESET SCRIPT
============================================================
This will delete all existing data and create a fresh database
with only the aroa system admin user.
============================================================

Are you sure you want to proceed? (yes/no): yes

Proceeding with database reset...

✓ Deleted existing database: defaultRecorder.db

Creating fresh database at: defaultRecorder.db
Creating tables...
  ✓ system_users table created
  ✓ integrations table created
  ✓ test_sessions table created
  ✓ yelp_users table created
  ✓ system_logs table created

Inserting system admin user...
  ✓ User 'aroa' created
    - ID: 550e8400-e29b-41d4-a716-446655440000
    - Username: aroa
    - Password: 123456789
    - Type: systemadmin
    - Email: aroa@soaprojects.com
    - Created: 2025-10-09T12:34:56.789012
  ✓ Database reset logged

✓ Database reset completed successfully!

============================================================
DATABASE RESET SUMMARY
============================================================
Database Path: /absolute/path/to/defaultRecorder.db
Reset Time: 2025-10-09T12:34:56.789012
Tables Created: 5
Initial User: aroa (systemadmin)
============================================================

Verifying database...
  ✓ Found 5 tables: ['system_users', 'integrations', 'test_sessions', 'yelp_users', 'system_logs']
  ✓ User verified: aroa (systemadmin) - aroa@soaprojects.com

✓✓✓ DATABASE RESET SUCCESSFUL ✓✓✓
```

## What Gets Deleted

⚠️ **WARNING:** This script will permanently delete ALL data from the database, including:

- All system users (except aroa)
- All integrations
- All test sessions
- All Yelp users
- All system logs

**This action cannot be undone!**

## After Reset

After running the script, you can log into the application with:

- **Username:** `aroa`
- **Password:** `123456789`

The user has `systemadmin` privileges and can access all features.

## Troubleshooting

### Permission Denied

If you get a "Permission denied" error:

```bash
chmod +x reset_database.py
./reset_database.py
```

### Database Locked

If you get a "database is locked" error:
1. Stop the backend server
2. Close any database connections
3. Run the script again

### File Not Found

Make sure you're running the script from the project root directory where `defaultRecorder.db` should be located, or the script will create it in the current directory.

## Notes

- The script creates the database in the current working directory
- All timestamps use ISO 8601 format
- The script is safe to run multiple times
- No backup is created automatically - backup manually if needed
