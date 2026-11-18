# Contributing

## Local setup

Follow the quick start in [README.md](README.md). You need Node 18+ and
Python 3.10+. Copy `.env.example` to `.env.local` and fill in Supabase.

## Before you push

```bash
npm run lint:ci        # 0 errors required
npm run format:check   # prettier, new + refactored files
npm run test:ci        # frontend
npm run build          # production build must succeed

python -m pytest backend -q   # backend, if you touched backend/
ruff check backend            # backend lint
```

Everything above is exactly what CI runs, so a green local run means a green PR.

## Commit messages

`type(scope): summary`, imperative mood, lower case summary.

```
feat(predictions): add battery SOC overlay
fix(api): stop wrapping 400 as 500 in pv-systems endpoints
refactor(lib): move service clients to lib/api
docs(backend): document the unused training modules
chore(deps): bump next to 12.3
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

## Pull requests

- Keep the scope in the title. One concern per PR.
- Fill in the PR template checklist.
- `CI` (frontend + backend) must be green. Docs-only PRs skip the code jobs.
- Squash merge, linear history.

## Deleting code

This repository carries a lot of dead weight. Before deleting a file:

```bash
# find importers first
grep -rn "lib/services/energy" --include=*.js --include=*.jsx .
```

If nothing imports it, delete it in its own commit so it is easy to review or
revert. Do not "fix up" imports in the same commit as the deletion.

## Environment variables

Never commit real values. If the code reads a new variable, add it to
`.env.example` **and** document it in [docs/environment.md](docs/environment.md).
`backend/tests/test_env.py` enforces the backend half of this.

## Where things live

| I want to… | Go to |
| --- | --- |
| Change a page | `pages/` |
| Add a shared UI piece | `components/` |
| Change a data fetch | `lib/api/` or `lib/hooks/` |
| Change a default or service URL | `lib/config/` |
| Add an API endpoint | `backend/main.py` (+ `backend/tests/`) |
| Change the schema | `database/schema.sql` |
