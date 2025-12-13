/*
  Simple Node script to import a SQL file into MySQL using mysql2 (CommonJS)
  Reads DB config from .env and executes the SQL file with multiple statements support.
*/
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const sqlFile = path.join(process.cwd(), 'database', 'auth_schema.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('SQL file not found at', sqlFile);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFile, { encoding: 'utf8' });

  const host = process.env.DB_HOST || '127.0.0.1';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'solaira_db';

  console.log('Connecting to', host, 'as', user);

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      multipleStatements: true,
    });

    // Create DB if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.query(`USE \`${database}\`;`);
    console.log('Importing SQL file...');
    await connection.query(sqlContent);
    console.log('Import completed successfully.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error importing SQL:', error.message || error);
    process.exit(1);
  }
}

main();
/*
  Simple Node script to import a SQL file into MySQL using mysql2
  Reads DB config from .env and executes the SQL file with multiple statements support.
*/
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function main() {
  const sqlFile = path.join(process.cwd(), 'database', 'auth_schema.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('SQL file not found at', sqlFile);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFile, { encoding: 'utf8' });

  const host = process.env.DB_HOST || '127.0.0.1';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'solaira_db';

  console.log('Connecting to', host, 'as', user);

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      multipleStatements: true,
    });

    // Create DB if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.query(`USE \`${database}\`;`);
    console.log('Importing SQL file...');
    await connection.query(sqlContent);
    console.log('Import completed successfully.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error importing SQL:', error.message || error);
    process.exit(1);
  }
}

main();
