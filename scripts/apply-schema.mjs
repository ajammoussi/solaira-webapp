#!/usr/bin/env node
/**
 * Apply database/schema.sql to the Supabase project, no browser SQL editor.
 *
 * Setup (once):
 *   Supabase dashboard -> Project Settings -> Database -> Connection string -> URI
 *   Put it in .env.local (or .env) as:
 *     SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
 *
 * Run:
 *   npm run db:apply
 *
 * Safe to re-run: the schema creates/alters idempotently, and existing auth
 * users without a profile row get one created.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Read KEY=VALUE from .env.local then .env; .env.local wins, real env wins over both. */
function loadEnv() {
  const fromFiles = {};
  for (const name of ['.env.local', '.env']) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match || match[1] in fromFiles) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      fromFiles[match[1]] = value;
    }
  }
  return { ...fromFiles, ...process.env };
}

const BACKFILL_PROFILES = `
insert into public.profiles (id, display_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', email), email
from auth.users
on conflict (id) do nothing;
`;

const env = loadEnv();
const connectionString = env.SUPABASE_DB_URL || env.DATABASE_URL;

if (!connectionString) {
  console.error(
    [
      'SUPABASE_DB_URL is not set.',
      '',
      'Get it from Supabase: Project Settings -> Database -> Connection string -> URI,',
      'then add one line to .env.local:',
      '',
      '  SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres',
      '',
      'Alternative: paste database/schema.sql into the Supabase SQL editor.',
    ].join('\n')
  );
  process.exit(1);
}

const schemaPath = join(root, 'database', 'schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf8');
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

const client = new pg.Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  application_name: 'solaira-db-apply',
});

try {
  await client.connect();
} catch (error) {
  console.error(`Could not connect to Postgres: ${error.message}`);

  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    parsed = null;
  }
  const direct = parsed && /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(parsed.hostname);
  const password = parsed ? decodeURIComponent(parsed.password || '') : '';
  const bracketed = /^\[.*\]$/.test(password);

  if (direct) {
    console.error(
      [
        '',
        `"${parsed.hostname}" is the deprecated IPv6-only direct host. Use the Session pooler:`,
        `  SUPABASE_DB_URL=postgresql://postgres.${direct[1]}:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`,
        'Copy the exact "Session pooler" URI from Dashboard -> Connect.',
      ].join('\n')
    );
  }
  if (bracketed) {
    console.error(
      '',
      'The password in SUPABASE_DB_URL is wrapped in [ ] — those brackets are part of the',
      'dashboard placeholder, not the password. Remove them:',
      `  ${password.slice(1, -1)}`
    );
  }
  if (/password authentication failed/i.test(error.message)) {
    console.error(
      '',
      'The host was reached, so the region and user are right; the password is not.',
      'Reset it in Dashboard -> Settings -> Database -> Reset database password,',
      'then paste the new Session pooler URI.'
    );
  }
  process.exit(1);
}

try {
  await client.query('begin');
  await client.query(schemaSql);
  await client.query(BACKFILL_PROFILES);
  const { rows } = await client.query('select count(*)::int as count from public.profiles');
  await client.query('commit');
  console.log(`Schema applied (${schemaPath}).`);
  console.log(`public.profiles rows: ${rows[0].count}`);
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error(`Schema application failed: ${error.message}`);
  if (error.position) {
    const upto = schemaSql.slice(0, Number(error.position));
    const line = upto.split('\n').length;
    console.error(`database/schema.sql:${line}`);
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
