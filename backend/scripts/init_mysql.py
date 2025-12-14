#!/usr/bin/env python
"""Initialize MySQL database with schema and seed data."""

import mysql.connector
from mysql.connector import Error
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
try:
    load_dotenv()
except Exception:
    pass

# Config
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_USER = os.getenv('MYSQL_USER', 'root')  # Use root to create database
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'solaira_energy')

# Paths
SCHEMA_FILE = Path(__file__).parent.parent / 'database' / 'schema.sql'
SEED_FILE = Path(__file__).parent.parent / 'database' / 'seed.sql'

def execute_sql_file(filename, database=None):
    """Execute SQL file."""
    try:
        config = {
            'host': MYSQL_HOST,
            'user': MYSQL_USER,
            'password': MYSQL_PASSWORD,
        }
        if database:
            config['database'] = database
        
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        with open(filename, 'r') as f:
            sql_content = f.read()
            # Split by semicolon and execute each statement
            for statement in sql_content.split(';'):
                stmt = statement.strip()
                if stmt:
                    cursor.execute(stmt)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✓ Executed {filename}")
    except Error as e:
        print(f"✗ Error executing {filename}: {e}")
        raise

def main():
    """Initialize database."""
    print("[Init] Starting MySQL database initialization...\n")
    
    # Step 1: Create database
    print("[Step 1] Creating database...")
    try:
        config = {
            'host': MYSQL_HOST,
            'user': MYSQL_USER,
            'password': MYSQL_PASSWORD,
        }
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DATABASE}")
        cursor.execute(f"USE {MYSQL_DATABASE}")
        conn.commit()
        cursor.close()
        conn.close()
        print(f"✓ Database '{MYSQL_DATABASE}' created or already exists\n")
    except Error as e:
        print(f"✗ Error creating database: {e}")
        print("  Ensure MySQL is running and you have root access.")
        return False
    
    # Step 2: Apply schema
    print("[Step 2] Applying schema...")
    if not SCHEMA_FILE.exists():
        print(f"✗ Schema file not found: {SCHEMA_FILE}")
        return False
    
    execute_sql_file(SCHEMA_FILE, MYSQL_DATABASE)
    print()
    
    # Step 3: Seed data
    print("[Step 3] Seeding sample data...")
    if not SEED_FILE.exists():
        print(f"⚠ Seed file not found: {SEED_FILE} (skipping)")
        return True
    
    execute_sql_file(SEED_FILE, MYSQL_DATABASE)
    print()
    
    # Step 4: Verify tables
    print("[Step 4] Verifying tables...")
    try:
        config = {
            'host': MYSQL_HOST,
            'user': MYSQL_USER,
            'password': MYSQL_PASSWORD,
            'database': MYSQL_DATABASE,
        }
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        
        if tables:
            print(f"✓ Found {len(tables)} tables:")
            for table in sorted(tables):
                print(f"  - {table}")
        else:
            print("⚠ No tables found")
    except Error as e:
        print(f"✗ Error verifying tables: {e}")
        return False
    
    print("\n✓ Database initialization complete!")
    print(f"\nConnection info:")
    print(f"  Host: {MYSQL_HOST}")
    print(f"  Database: {MYSQL_DATABASE}")
    print(f"  User: solaira (set in .env)")
    return True

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
