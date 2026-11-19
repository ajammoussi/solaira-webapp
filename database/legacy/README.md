# Legacy SQLite archive

`energy_db_dump.sql` is a verbatim `sqlite3` dump of `database/energy.db` taken before that file was removed.

## Provenance

- Source: `database/energy.db` (SQLite, 10 tables: weather, consumption, generation, predictions, decisions, appliances, vacation dates, weekly actions, anomalies).
- It was produced by the `talel-works` backend, deleted in commit `b923bb7c` and recoverable via tag `archive/talel-works-pre-refactor`.
- No code in `pages/`, `lib/`, or `backend/` ever opened it. The app's database is Supabase; the schema lives in `../schema.sql`.
- The rows were never migrated to Postgres and are **not** the application's data model — keep them for reference only.

## Replay

```bash
sqlite3 replay.db < energy_db_dump.sql
```

Or, without the `sqlite3` CLI:

```bash
python -c "import sqlite3; c=sqlite3.connect('replay.db'); c.executescript(open('energy_db_dump.sql', encoding='utf-8').read()); c.commit()"
```
