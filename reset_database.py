#!/usr/bin/env python3
"""
Database Reset Script
=====================
This script deletes the existing defaultRecorder.db and creates a fresh one
with the unified users table and default users.

Usage: python reset_database.py
"""

import sqlite3
import os
import uuid
from datetime import datetime

# Database file path
DB_PATH = 'defaultRecorder.db'

def delete_existing_database():
    """Delete the existing database file if it exists"""
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print(f"✓ Deleted existing database: {DB_PATH}")
        except Exception as e:
            print(f"✗ Error deleting database: {e}")
            raise
    else:
        print(f"ℹ No existing database found at: {DB_PATH}")

def create_fresh_database():
    """Create a fresh database with all tables and default users"""

    # Get current timestamp
    current_time = datetime.now().isoformat()

    print(f"\nCreating fresh database at: {DB_PATH}")

    # Connect to database (creates it if it doesn't exist)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Create tables
        print("Creating tables...")

        cursor.execute("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT,
                created_by TEXT,
                creation_time TEXT DEFAULT CURRENT_TIMESTAMP,
                type_of_user TEXT NOT NULL DEFAULT 'TestUser'
            )
        """)
        print("  ✓ users table created")

        cursor.execute("""
            CREATE TABLE integrations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT DEFAULT 'disconnected',
                config TEXT DEFAULT '{}',
                last_sync TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✓ integrations table created")

        cursor.execute("""
            CREATE TABLE test_sessions (
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
            )
        """)
        print("  ✓ test_sessions table created")

        cursor.execute("""
            CREATE TABLE system_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                action TEXT NOT NULL,
                details TEXT DEFAULT '{}',
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✓ system_logs table created")

        cursor.execute("""
            CREATE TABLE environments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                integrations TEXT DEFAULT '{}',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✓ environments table created")

        cursor.execute("""
            CREATE TABLE user_sessions (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                loginTime TEXT NOT NULL,
                logoutTime TEXT,
                ipAddress TEXT,
                status TEXT DEFAULT 'active',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✓ user_sessions table created")

        # Insert default users
        print("\nInserting default users...")

        # SystemUser: aroa
        aroa_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO users (id, username, password, email, created_by, creation_time, type_of_user)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            aroa_id,
            'aroa',
            '123456789',
            'aroa@example.com',
            'system',
            current_time,
            'SystemUser'
        ))
        print(f"  ✓ SystemUser 'aroa' created")
        print(f"    - Username: aroa")
        print(f"    - Password: 123456789")
        print(f"    - Type: SystemUser (can create users)")

        # TestUser: testuser
        testuser_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO users (id, username, password, email, created_by, creation_time, type_of_user)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            testuser_id,
            'testuser',
            'testpass',
            'test@example.com',
            'system',
            current_time,
            'TestUser'
        ))
        print(f"  ✓ TestUser 'testuser' created")
        print(f"    - Username: testuser")
        print(f"    - Password: testpass")
        print(f"    - Type: TestUser (cannot login)")

        # TestUser: john_doe
        john_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO users (id, username, password, email, created_by, creation_time, type_of_user)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            john_id,
            'john_doe',
            'password123',
            'john@example.com',
            'system',
            current_time,
            'TestUser'
        ))
        print(f"  ✓ TestUser 'john_doe' created")

        # Log the database reset action
        log_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO system_logs (id, user_id, action, details, timestamp, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            log_id,
            aroa_id,
            'database_reset',
            '{"description": "Database reset via Python script", "tables_created": 6, "users_created": 3}',
            current_time,
            current_time
        ))
        print(f"  ✓ Database reset logged")

        # Commit changes
        conn.commit()
        print("\n✓ Database reset completed successfully!")

        # Show summary
        print("\n" + "="*60)
        print("DATABASE RESET SUMMARY")
        print("="*60)
        print(f"Database Path: {os.path.abspath(DB_PATH)}")
        print(f"Reset Time: {current_time}")
        print(f"Tables Created: 6")
        print(f"Users Created: 3")
        print("")
        print("USER TYPES:")
        print("  • SystemUser   - Can login & create users")
        print("  • RegularUser  - Can login (Users tab hidden)")
        print("  • TestUser     - Cannot login (for testing only)")
        print("")
        print("LOGIN CREDENTIALS:")
        print("  • aroa / 123456789 (SystemUser)")
        print("="*60)

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error creating database: {e}")
        raise
    finally:
        conn.close()

def verify_database():
    """Verify the database was created correctly"""
    print("\nVerifying database...")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"  ✓ Found {len(tables)} tables: {[t[0] for t in tables]}")

        # Check users
        cursor.execute("SELECT username, email, type_of_user FROM users ORDER BY type_of_user, username")
        users = cursor.fetchall()
        if users:
            print(f"  ✓ Users verified ({len(users)} users):")
            for user in users:
                print(f"    - {user[0]} ({user[2]}) - {user[1]}")
        else:
            print("  ✗ No users found!")

        conn.close()
        return True
    except Exception as e:
        print(f"  ✗ Verification failed: {e}")
        return False

def main():
    """Main execution function"""
    print("="*60)
    print("DATABASE RESET SCRIPT")
    print("="*60)
    print("This will delete all existing data and create a fresh database")
    print("with the unified users table.")
    print("="*60)

    # Confirm action
    response = input("\nAre you sure you want to proceed? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Operation cancelled.")
        return

    print("\nProceeding with database reset...\n")

    try:
        # Step 1: Delete existing database
        delete_existing_database()

        # Step 2: Create fresh database
        create_fresh_database()

        # Step 3: Verify
        if verify_database():
            print("\n✓✓✓ DATABASE RESET SUCCESSFUL ✓✓✓\n")
        else:
            print("\n⚠ Database created but verification failed ⚠\n")

    except Exception as e:
        print(f"\n✗✗✗ DATABASE RESET FAILED ✗✗✗")
        print(f"Error: {e}\n")
        raise

if __name__ == "__main__":
    main()
